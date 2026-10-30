import "server-only";
import { Prisma } from "@prisma/client";
import type { CheckType, PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";

const TX_OPTS = { timeout: 20000, maxWait: 10000 };
import { getConfig, type GameConfig } from "@/lib/game-config";
import { applyErosionGain, erosionStage, hpPenalty, levelUpRequirement, proficiencyCheckTypeFor, proficiencyFromExp, CHECK_TYPE_LABEL } from "@/lib/rules";
import type { Condition, OutcomeEffect, ItemEffect } from "@/lib/content-types";
import { rollDice, weightedPick, chance } from "./dice";
import { evalConditions, type ConditionCtx } from "./conditions";
import type { CharState, CheckResult, Delta, EngineCtx, LastResult, Modifier, RunSummary } from "./types";

export class EngineError extends Error {}

type Tx = Prisma.TransactionClient | PrismaClient;
type LootEntry = { itemId: string; qty: number };
type RunModifier = { type: "run_check_bonus" | "run_extra_dice"; checkType: string; value: number; label: string };

const charInclude = { effects: true, tags: true, inventory: { include: { item: true } }, equipment: { include: { item: true } } } satisfies Prisma.CharacterInclude;
const runInclude = {
  realm: true,
  character: { include: charInclude },
  party: { include: { members: { include: { character: { include: charInclude } } } } },
} satisfies Prisma.RunInclude;
type RunRow = Prisma.RunGetPayload<{ include: typeof runInclude }>;

const nodeInclude = {
  scenes: { include: { choices: { include: { successOutcome: true, failOutcome: true }, orderBy: { sortOrder: "asc" as const } } }, orderBy: { sortOrder: "asc" as const } },
  edgesOut: { include: { to: true } },
  edgesIn: { include: { from: true } },
} satisfies Prisma.NodeInclude;
type NodeRow = Prisma.NodeGetPayload<{ include: typeof nodeInclude }>;

/** 런 한 번의 처리 환경. 메모리에서 바꾼 뒤 persist()로 한꺼번에 저장한다. */
type Env = {
  tx: Tx;
  cfg: GameConfig;
  run: RunRow;
  actor: RunRow["character"];      // 지금 행동하는 캐릭터 (파티 런이면 행동한 멤버, 아니면 런 주인)
  state: CharState;
  ctx: EngineCtx;
  equipMods: RunModifier[];
  // 파티 런: 함께 있는 멤버들(JOINED)과 이번 처리에서 생긴 침식률 변화(진입 침식률은 전원에게)
  party: { memberIds: string[]; erosionDelta: Map<string, number> } | null;
  // 가변 JSON 필드 (parsed)
  revealed: string[]; visited: string[]; flags: string[]; used: string[]; loot: LootEntry[]; modifiers: RunModifier[]; clues: { text: string; flag: string }[];
  logs: { type: string; nodeId?: string | null; choiceText?: string | null; text?: string; checkDetail?: unknown; deltas?: unknown }[];
  pendingInventory: Map<string, number>; // 실제 캐릭터 보관함 변화 (item_lose 등)
};

// ───────────────────────── 로드 / 저장 ─────────────────────────

function stateFromCharacter(c: RunRow["character"]): CharState {
  return { hp: c.hp, maxHp: c.maxHp, mp: c.mp, maxMp: c.maxMp, erosion: c.erosion, points: c.points, exp: c.exp, level: c.level, statPoints: c.statPoints, proficiency: c.proficiency, proficiencyExp: c.proficiencyExp, escapeCount: c.escapeCount, autoSuccessUsedToday: c.autoSuccessUsedToday, teleportUsedToday: c.teleportUsedToday };
}

async function loadEnv(tx: Tx, runId: string, cfg?: GameConfig, actorId?: string): Promise<Env> {
  const run = await tx.run.findUnique({ where: { id: runId }, include: runInclude });
  if (!run) throw new EngineError("런을 찾을 수 없습니다.");
  const config = cfg ?? (await getConfig());
  const joined = run.party ? run.party.members.filter((m) => m.status === "JOINED") : [];
  let c = run.character;
  if (run.party) {
    const m = joined.find((x) => x.characterId === (actorId ?? run.characterId)) ?? joined[0];
    if (!m) throw new EngineError("파티에 남은 탐사자가 없습니다.");
    if (actorId && !joined.some((x) => x.characterId === actorId)) throw new EngineError("이 파티의 탐사자가 아닙니다.");
    c = m.character;
  }
  const state: CharState = run.isTest && run.testState ? (run.testState as CharState) : stateFromCharacter(c);
  const ctx: EngineCtx = {
    category: c.category,
    ownCheckType: proficiencyCheckTypeFor(c.category, c.proficiencyCheckType),
    abilityActive: c.abilityStatus === "ACTIVE",
    effects: c.effects.map((e) => ({ type: e.type, checkType: e.checkType, value: e.value, perDay: e.perDay })),
    tagIds: new Set(c.tags.map((t) => t.tagId)),
    stage: erosionStage(state.erosion, config),
  };
  const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
  // 착용 장비의 상시 보정 (런 보정과 같은 형식, 저장하지 않음)
  const equipMods: RunModifier[] = [];
  for (const eq of c.equipment) for (const e of eq.item.effects as ItemEffect[]) {
    if (e.type === "run_check_bonus") equipMods.push({ type: "run_check_bonus", checkType: e.checkType, value: e.value, label: eq.item.name });
    if (e.type === "run_extra_dice") equipMods.push({ type: "run_extra_dice", checkType: e.checkType, value: e.value, label: eq.item.name });
  }
  return {
    tx, cfg: config, run, actor: c, state, ctx, equipMods,
    party: run.party ? { memberIds: joined.map((m) => m.characterId), erosionDelta: new Map() } : null,
    revealed: arr(run.revealedNodeIds), visited: arr(run.visitedNodeIds), flags: arr(run.flags), used: arr(run.usedChoiceIds), loot: arr(run.loot), modifiers: arr(run.modifiers), clues: arr(run.clues),
    logs: [], pendingInventory: new Map(),
  };
}

async function persist(env: Env, extra: Prisma.RunUpdateInput = {}) {
  const { tx, run, state } = env;
  const base = await tx.runLog.count({ where: { runId: run.id } });
  if (env.logs.length) {
    await tx.runLog.createMany({ data: env.logs.map((l, i) => ({ runId: run.id, seq: base + i + 1, type: l.type, nodeId: l.nodeId ?? null, choiceText: l.choiceText ?? null, text: l.text ?? "", checkDetail: (l.checkDetail ?? undefined) as Prisma.InputJsonValue | undefined, deltas: (l.deltas ?? undefined) as Prisma.InputJsonValue | undefined })) });
  }
  await tx.run.update({
    where: { id: run.id },
    data: {
      currentNodeId: run.currentNodeId, currentSceneId: run.currentSceneId, previousNodeId: run.previousNodeId,
      revealedNodeIds: env.revealed, visitedNodeIds: env.visited, flags: env.flags, usedChoiceIds: env.used, loot: env.loot as Prisma.InputJsonValue, modifiers: env.modifiers as Prisma.InputJsonValue, clues: env.clues as Prisma.InputJsonValue,
      exp: run.exp, reward: run.reward,
      ...(run.isTest ? { testState: state as unknown as Prisma.InputJsonValue } : {}),
      ...extra,
    },
  });
  if (!run.isTest) {
    const actorId = env.actor.id;
    await tx.character.update({ where: { id: actorId }, data: { ...state } });
    for (const [itemId, delta] of env.pendingInventory) {
      if (delta === 0) continue;
      const inv = await tx.inventoryItem.findUnique({ where: { characterId_itemId: { characterId: actorId, itemId } } });
      const next = (inv?.qty ?? 0) + delta;
      if (next <= 0) { if (inv) await tx.inventoryItem.delete({ where: { id: inv.id } }); }
      else if (inv) await tx.inventoryItem.update({ where: { id: inv.id }, data: { qty: next } });
      else await tx.inventoryItem.create({ data: { characterId: actorId, itemId, qty: next } });
    }
    if (env.party) for (const [cid, d] of env.party.erosionDelta) { if (cid !== actorId && d > 0) await tx.character.update({ where: { id: cid }, data: { erosion: { increment: d } } }); }
    env.party?.erosionDelta.clear();
  }
  env.logs = [];
  env.pendingInventory.clear();
}

async function loadNode(tx: Tx, nodeId: string): Promise<NodeRow> {
  const node = await tx.node.findUnique({ where: { id: nodeId }, include: nodeInclude });
  if (!node) throw new EngineError("노드를 찾을 수 없습니다.");
  return node;
}

// ───────────────────────── 보조 ─────────────────────────

function invQty(env: Env, itemId: string): number {
  const inv = env.run.isTest ? 0 : (env.actor.inventory.find((i) => i.itemId === itemId)?.qty ?? 0) + (env.pendingInventory.get(itemId) ?? 0);
  const loot = env.loot.find((l) => l.itemId === itemId)?.qty ?? 0;
  return inv + loot;
}

function conditionCtx(env: Env): ConditionCtx {
  return { ...env.ctx, stage: erosionStage(env.state.erosion, env.cfg), flags: new Set(env.flags), hasItem: (id) => invQty(env, id) > 0 };
}

function matchesCheck(effectCheckType: string | null | undefined, checkType: CheckType, own: CheckType | null): boolean {
  if (!effectCheckType || effectCheckType === "ALL") return true;
  if (effectCheckType === "OWN") return own === checkType;
  return effectCheckType === checkType;
}

function gainErosion(env: Env, base: number): number {
  const g = applyErosionGain(base, env.state.mp, env.state.maxMp, env.cfg);
  env.state.erosion += g;
  return g;
}

function addLoot(env: Env, itemId: string, qty: number) {
  const e = env.loot.find((l) => l.itemId === itemId);
  if (e) e.qty += qty; else env.loot.push({ itemId, qty });
}

/** 아이템을 잃는다. 이번 런 획득분부터, 그다음 보관함에서. 실제로 뺀 수량 반환 */
function removeItem(env: Env, itemId: string, qty: number): number {
  let left = qty;
  const e = env.loot.find((l) => l.itemId === itemId);
  if (e) { const take = Math.min(e.qty, left); e.qty -= take; left -= take; if (e.qty === 0) env.loot = env.loot.filter((l) => l !== e); }
  if (left > 0 && !env.run.isTest) {
    const have = (env.actor.inventory.find((i) => i.itemId === itemId)?.qty ?? 0) + (env.pendingInventory.get(itemId) ?? 0);
    const take = Math.min(have, left);
    if (take > 0) { env.pendingInventory.set(itemId, (env.pendingInventory.get(itemId) ?? 0) - take); left -= take; }
  }
  return qty - left;
}

function autoSuccessRemaining(env: Env, checkType: CheckType): number {
  if (!env.ctx.abilityActive) return 0;
  const total = env.ctx.effects.filter((e) => e.type === "AUTO_SUCCESS" && matchesCheck(e.checkType, checkType, env.ctx.ownCheckType)).reduce((s, e) => s + e.perDay, 0);
  return Math.max(0, total - env.state.autoSuccessUsedToday);
}

function teleportRemaining(env: Env): number {
  if (!env.ctx.abilityActive) return 0;
  const total = env.ctx.effects.filter((e) => e.type === "TELEPORT").reduce((s, e) => s + e.perDay, 0);
  return Math.max(0, total - env.state.teleportUsedToday);
}

// ───────────────────────── 판정 ─────────────────────────

function resolveCheck(env: Env, checkType: CheckType, target: number, useAuto: boolean): CheckResult {
  const { cfg, state, ctx } = env;
  if (useAuto && autoSuccessRemaining(env, checkType) > 0) {
    state.autoSuccessUsedToday += 1;
    return { checkType, target, dice: [], kept: [], modifiers: [], total: 0, success: true, auto: true };
  }
  const modifiers: Modifier[] = [];
  const own = ctx.ownCheckType;
  if (own === checkType) modifiers.push({ label: `숙련도 ${state.proficiency}`, value: state.proficiency - cfg["check.proficiencyBonusOffset"] });
  if (ctx.abilityActive) {
    for (const e of ctx.effects) {
      if (e.type === "CHECK_BONUS" && matchesCheck(e.checkType, checkType, own) && e.value !== 0) modifiers.push({ label: "능력 효과", value: e.value });
    }
  }
  for (const m of [...env.modifiers, ...env.equipMods]) {
    if (m.type === "run_check_bonus" && matchesCheck(m.checkType, checkType, own) && m.value !== 0) modifiers.push({ label: m.label, value: m.value });
  }
  if (own === checkType && erosionStage(state.erosion, cfg) === "ACTIVE") modifiers.push({ label: "침식률 활성", value: cfg["erosion.activeBonus"] });
  const pen = hpPenalty(state.hp, state.maxHp, cfg);
  if (pen !== 0) modifiers.push({ label: "체력 저하", value: pen });

  let extra = 0;
  if (ctx.abilityActive) for (const e of ctx.effects) if (e.type === "EXTRA_DICE" && matchesCheck(e.checkType, checkType, own)) extra += e.value;
  for (const m of [...env.modifiers, ...env.equipMods]) if (m.type === "run_extra_dice" && matchesCheck(m.checkType, checkType, own)) extra += m.value;

  const count = cfg["check.diceCount"];
  const dice = rollDice(count + Math.max(0, extra), cfg["check.diceSides"]);
  const kept = [...dice].sort((a, b) => b - a).slice(0, count);
  const total = kept.reduce((s, d) => s + d, 0) + modifiers.reduce((s, m) => s + m.value, 0);
  let success = total >= target;
  let forced: CheckResult["forced"];
  if (env.run.isTest && env.run.forceResult === "SUCCESS") { success = true; forced = "SUCCESS"; }
  if (env.run.isTest && env.run.forceResult === "FAIL") { success = false; forced = "FAIL"; }
  if (success && !forced && own === checkType) {
    state.proficiencyExp += 1;
    state.proficiency = Math.max(state.proficiency, proficiencyFromExp(state.proficiencyExp, cfg));
  }
  return { checkType, target, dice, kept, modifiers, total, success, auto: false, forced };
}

// ───────────────────────── 효과 ─────────────────────────

type Nav = { moveTo?: string; moveBack?: boolean; gotoScene?: string; escape?: boolean };

async function applyEffects(env: Env, effects: OutcomeEffect[], deltas: Delta[]): Promise<Nav> {
  const nav: Nav = {};
  const { state } = env;
  for (const e of effects) {
    switch (e.type) {
      case "hp": state.hp = Math.max(0, Math.min(state.maxHp, state.hp + e.value)); deltas.push({ label: "체력", value: e.value }); break;
      case "mp": state.mp = Math.max(0, Math.min(state.maxMp, state.mp + e.value)); deltas.push({ label: "정신력", value: e.value }); break;
      case "erosion": {
        if (e.value >= 0) { const g = gainErosion(env, e.value); deltas.push({ label: "침식률", value: g }); }
        else { state.erosion = Math.max(0, state.erosion + e.value); deltas.push({ label: "침식률", value: e.value }); }
        break;
      }
      case "points": state.points += e.value; deltas.push({ label: "P", value: e.value }); break;
      case "item_gain": {
        const item = await env.tx.item.findUnique({ where: { id: e.itemId } });
        if (item) { addLoot(env, item.id, e.qty); deltas.push({ label: "획득", text: `${item.name} ×${e.qty}` }); }
        break;
      }
      case "item_drop": {
        const table = await env.tx.dropTable.findUnique({ where: { id: e.tableId }, include: { entries: { include: { item: true } } } });
        if (!table) break;
        for (let i = 0; i < e.rolls; i++) {
          const idx = weightedPick(table.entries.map((en) => en.weight));
          if (idx < 0) break;
          const en = table.entries[idx];
          if (!en.item) { deltas.push({ label: "획득", text: "아무것도 없음" }); continue; }
          const qty = en.minQty + (en.maxQty > en.minQty ? rollDice(1, en.maxQty - en.minQty + 1)[0] - 1 : 0);
          addLoot(env, en.item.id, qty);
          deltas.push({ label: "획득", text: `${en.item.name} ×${qty}` });
        }
        break;
      }
      case "item_lose": {
        const item = await env.tx.item.findUnique({ where: { id: e.itemId } });
        if (item) { const n = removeItem(env, item.id, e.qty); if (n > 0) deltas.push({ label: "소모", text: `${item.name} ×${n}` }); }
        break;
      }
      case "clue": if (!env.clues.some((c) => c.flag === e.flag && c.text === e.text)) env.clues.push({ text: e.text, flag: e.flag }); if (e.flag && !env.flags.includes(e.flag)) env.flags.push(e.flag); deltas.push({ label: "정보", text: e.text }); break;
      case "set_flag": if (!env.flags.includes(e.flag)) env.flags.push(e.flag); break;
      case "goto_scene": nav.gotoScene = e.sceneId; break;
      case "move": nav.moveTo = e.nodeId; break;
      case "move_back": nav.moveBack = true; break;
      case "reveal": {
        const node = await env.tx.node.findUnique({ where: { id: e.nodeId } });
        if (node && !node.revealedAt && !env.revealed.includes(node.id)) { env.revealed.push(node.id); deltas.push({ label: "공개", text: node.name }); }
        break;
      }
      case "escape": nav.escape = true; break;
      case "seal": if (!env.flags.includes("__sealed")) env.flags.push("__sealed"); deltas.push({ label: "봉합", text: "이계의 주인을 쓰러뜨렸다" }); break;
    }
  }
  return nav;
}

// ───────────────────────── 노드 진입 ─────────────────────────

async function enterNode(env: Env, nodeId: string, fromNodeId: string | null, deltas: Delta[]): Promise<NodeRow> {
  const node = await loadNode(env.tx, nodeId);
  const { cfg, run } = env;
  // 1. 진입 침식률
  const base = node.entryErosion ?? (cfg["erosion.entryUsesDepth"] ? node.depth : cfg["erosion.entryFixed"]);
  const g = gainErosion(env, base);
  if (g > 0) deltas.push({ label: "침식률", value: g });
  if (env.party && g > 0) {
    // 함께 이동하는 멤버 전원에게 진입 침식률 (각자의 정신력 배율은 서버가 알고 있는 현재 값으로)
    const others = await env.tx.character.findMany({ where: { id: { in: env.party.memberIds.filter((id) => id !== env.actor.id) } }, select: { id: true, mp: true, maxMp: true } });
    for (const o of others) env.party.erosionDelta.set(o.id, (env.party.erosionDelta.get(o.id) ?? 0) + applyErosionGain(base, o.mp, o.maxMp, cfg));
  }
  // 2. 공개·방문 기록과 보수 (런 안에서 처음 들어갈 때만)
  const first = !env.visited.includes(node.id);
  if (first) {
    env.visited.push(node.id);
    const isNew = !node.revealedAt && !env.revealed.includes(node.id);
    if (isNew) {
      env.revealed.push(node.id);
      run.exp += cfg["exp.newNode"]; run.reward += node.rewardNew ?? cfg["reward.newNode"];
      deltas.push({ label: "새 구역", text: node.name });
    } else {
      run.exp += cfg["exp.knownNode"]; run.reward += node.rewardKnown ?? cfg["reward.knownNode"];
    }
  }
  run.previousNodeId = fromNodeId;
  run.currentNodeId = node.id;
  // 3. 이벤트 굴림
  const events = node.scenes.filter((s) => s.kind === "EVENT");
  let scene = node.scenes.find((s) => s.kind === "BASE") ?? null;
  const mandatory = events.find((s) => s.mandatory);
  if (mandatory) scene = mandatory;
  else for (const ev of events) { if (chance(ev.chance)) { scene = ev; break; } }
  run.currentSceneId = scene?.id ?? null;
  env.logs.push({ type: "enter", nodeId: node.id, text: node.description + (scene && scene.kind === "EVENT" ? `\n\n[이벤트] ${scene.text}` : ""), deltas: deltas.filter((d) => d.label === "침식률" || d.label === "새 구역") });
  return node;
}

function checkFallen(env: Env): boolean {
  return env.state.hp <= 0 || env.state.mp <= 0;
}

// ───────────────────────── 런 종료 ─────────────────────────

async function endRun(env: Env, status: "ESCAPED" | "FALLEN" | "ABORTED"): Promise<RunSummary> {
  const { tx, cfg, run, state } = env;
  const nodes = await tx.node.findMany({ where: { realmId: run.realmId } });
  const nameOf = (id: string) => nodes.find((n) => n.id === id)?.name ?? "?";
  const items = await tx.item.findMany({ where: { id: { in: env.loot.map((l) => l.itemId) } } });
  const itemName = (id: string) => items.find((i) => i.id === id)?.name ?? "?";
  const proficiencyBefore = run.isTest ? state.proficiency : env.actor.proficiency;
  const summary: RunSummary = { status, realmName: run.realm.name, newNodes: [], visited: env.visited.map(nameOf), reward: 0, exp: 0, levelUps: 0, gained: [], lost: [], discarded: [], clues: env.clues, proficiencyBefore, proficiencyAfter: state.proficiency, isTest: run.isTest };

  if (status === "ESCAPED") {
    summary.newNodes = env.revealed.map(nameOf);
    summary.reward = run.reward + cfg["reward.escapeBonus"];
    summary.exp = run.exp + cfg["exp.escape"];
    summary.gained = env.loot.map((l) => ({ name: itemName(l.itemId), qty: l.qty }));
    if (!run.isTest) {
      // 서버 공개
      for (const id of env.revealed) await tx.node.updateMany({ where: { id, revealedAt: null }, data: { revealedAt: new Date(), revealedById: run.characterId } });
      summary.partyMembers = env.party ? env.party.memberIds.length : undefined;
      // 인스턴트 이계 봉합
      if (env.flags.includes("__sealed") && run.realm.kind === "INSTANT" && !run.realm.isTemplate && !run.realm.sealedAt) {
        await tx.realm.update({ where: { id: run.realmId }, data: { sealedAt: new Date(), sealedById: run.characterId } });
        summary.sealed = true; summary.sealReward = cfg["instant.sealReward"]; summary.reward += cfg["instant.sealReward"];
      }
      if (env.party) {
        // 파티: 보수·탈출 횟수·침식률 감소는 전원, 획득물은 멤버에게 순서대로 분배
        const members = env.party.memberIds;
        await tx.character.updateMany({ where: { id: { in: members } }, data: { points: { increment: summary.reward }, escapeCount: { increment: 1 } } });
        for (const cid of members) { const ch = await tx.character.findUnique({ where: { id: cid }, select: { erosion: true } }); if (ch) await tx.character.update({ where: { id: cid }, data: { erosion: Math.max(0, ch.erosion - cfg["coop.erosionReduce"]) } }); }
        summary.coopErosionReduce = cfg["coop.erosionReduce"];
        const units: string[] = []; for (const l of env.loot) for (let i = 0; i < l.qty; i++) units.push(l.itemId);
        for (let i = 0; i < units.length; i++) {
          const cid = members[i % members.length];
          try { await giveTo(tx, cid, units[i], 1, cfg["char.inventorySlots"]); } catch { summary.discarded.push({ name: itemName(units[i]), qty: 1 }); }
        }
        // 행동자의 메모리 상태를 서버 값과 맞춘다 (persist가 덮어쓰지 않도록)
        const me = await tx.character.findUnique({ where: { id: env.actor.id } });
        if (me) { state.points = me.points; state.escapeCount = me.escapeCount; state.erosion = me.erosion; }
      } else {
        state.points += summary.reward;
        state.escapeCount += 1;
        const inv = await tx.inventoryItem.findMany({ where: { characterId: run.characterId } });
        let slots = inv.length;
        for (const l of env.loot) {
          const existing = inv.find((i) => i.itemId === l.itemId);
          if (existing) await tx.inventoryItem.update({ where: { id: existing.id }, data: { qty: existing.qty + l.qty } });
          else if (slots < cfg["char.inventorySlots"]) { await tx.inventoryItem.create({ data: { characterId: run.characterId, itemId: l.itemId, qty: l.qty } }); slots++; }
          else summary.discarded.push({ name: itemName(l.itemId), qty: l.qty });
        }
      }
    }
  } else if (status === "FALLEN") {
    // 획득 아이템 절반 무작위 상실 (개수 기준, 내림)
    const units: string[] = [];
    for (const l of env.loot) for (let i = 0; i < l.qty; i++) units.push(l.itemId);
    const loseCount = Math.floor(units.length * cfg["fallen.lootLossRatio"]);
    const lostMap = new Map<string, number>();
    for (let i = 0; i < loseCount; i++) { const idx = rollDice(1, units.length)[0] - 1; const [id] = units.splice(idx, 1); lostMap.set(id, (lostMap.get(id) ?? 0) + 1); }
    for (const [id, q] of lostMap) { summary.lost.push({ name: itemName(id), qty: q }); removeItem(env, id, q); }
    summary.gained = env.loot.map((l) => ({ name: itemName(l.itemId), qty: l.qty }));
    summary.exp = Math.floor(run.exp * cfg["exp.fallenRatio"]);
    state.hp = Math.min(state.maxHp, cfg["fallen.returnHp"]);
    state.mp = Math.min(state.maxMp, cfg["fallen.returnMp"]);
    if (!run.isTest) {
      for (const l of env.loot) { try { await giveTo(tx, env.actor.id, l.itemId, l.qty, cfg["char.inventorySlots"]); } catch { summary.discarded.push({ name: itemName(l.itemId), qty: l.qty }); } }
    }
  }
  // 경험치와 레벨업 (강제 종료는 없음)
  if (status !== "ABORTED") {
    if (env.party && !run.isTest) {
      for (const cid of env.party.memberIds) {
        const ch = await tx.character.findUnique({ where: { id: cid } });
        if (!ch) continue;
        const r = applyExp({ exp: ch.exp, level: ch.level, statPoints: ch.statPoints }, summary.exp, cfg);
        await tx.character.update({ where: { id: cid }, data: { exp: r.exp, level: r.level, statPoints: r.statPoints } });
        if (cid === env.actor.id) { state.exp = r.exp; state.level = r.level; state.statPoints = r.statPoints; summary.levelUps = r.levelUps; }
      }
    } else {
      const r = applyExp(state, summary.exp, cfg);
      state.exp = r.exp; state.level = r.level; state.statPoints = r.statPoints; summary.levelUps = r.levelUps;
    }
  }
  env.logs.push({ type: "end", nodeId: run.currentNodeId, text: status === "ESCAPED" ? "탈출에 성공했다." : status === "FALLEN" ? "쓰러졌다." : "강제 종료되었다.", deltas: [{ label: "보수", value: summary.reward }, { label: "경험치", value: summary.exp }] });
  await persist(env, { status, endedAt: new Date(), summary: summary as unknown as Prisma.InputJsonValue, lastResult: Prisma.DbNull, lostLoot: summary.lost as unknown as Prisma.InputJsonValue });
  if (run.partyId) await tx.party.update({ where: { id: run.partyId }, data: { status: "ENDED" } });
  return summary;
}

function applyExp(c: { exp: number; level: number; statPoints: number }, gain: number, cfg: GameConfig) {
  let { exp, level, statPoints } = c; let levelUps = 0;
  exp += gain;
  let need = levelUpRequirement(level, cfg);
  while (exp >= need) { exp -= need; level += 1; statPoints += cfg["char.statPointPerLevel"]; levelUps += 1; need = levelUpRequirement(level, cfg); }
  return { exp, level, statPoints, levelUps };
}

async function giveTo(tx: Tx, characterId: string, itemId: string, qty: number, slots: number) {
  const inv = await tx.inventoryItem.findUnique({ where: { characterId_itemId: { characterId, itemId } } });
  if (inv) return tx.inventoryItem.update({ where: { id: inv.id }, data: { qty: inv.qty + qty } });
  const count = await tx.inventoryItem.count({ where: { characterId } });
  if (count >= slots) throw new EngineError("보관함 가득 참");
  return tx.inventoryItem.create({ data: { characterId, itemId, qty } });
}

// ───────────────────────── 공개 API ─────────────────────────

export async function startRun(characterId: string, realmId: string, opts: { isTest?: boolean; forceResult?: "SUCCESS" | "FAIL" | null; partyId?: string } = {}): Promise<string> {
  const cfg = await getConfig();
  return db.$transaction(async (tx) => {
    const character = await tx.character.findUnique({ where: { id: characterId } });
    const realm = await tx.realm.findUnique({ where: { id: realmId } });
    if (!character || !realm) throw new EngineError("대상을 찾을 수 없습니다.");
    if (!realm.startNodeId) throw new EngineError("이 이계에는 시작 노드가 없습니다.");
    const isTest = !!opts.isTest;
    if (isTest) {
      await tx.run.updateMany({ where: { characterId, isTest: true, status: "ACTIVE" }, data: { status: "ABORTED", endedAt: new Date() } });
    } else {
      if (!realm.isPublished) throw new EngineError("아직 공개되지 않은 이계입니다.");
      if (realm.isTemplate) throw new EngineError("템플릿 이계에는 직접 들어갈 수 없습니다.");
      if (realm.sealedAt) throw new EngineError("이미 봉합된 이계입니다.");
      if (realm.kind === "SPECIAL" && realm.applicantId && realm.applicantId !== characterId) throw new EngineError("이 이계는 신청자만 들어갈 수 있습니다.");
      if (await tx.run.findFirst({ where: { characterId, status: "ACTIVE", isTest: false } })) throw new EngineError("진행 중인 탐사가 있습니다. 먼저 끝내세요.");
      if (character.ap <= 0) throw new EngineError("행동력이 없습니다. 04:00에 초기화됩니다.");
      if (erosionStage(character.erosion, cfg) === "DANGER") throw new EngineError("침식률이 위험 단계입니다. 이계 입장이 차단되었습니다.");
      if (character.abilityStatus !== "ACTIVE" && !cfg["ability.allowExploreWhilePending"]) throw new EngineError("능력 심사가 끝나야 탐사할 수 있습니다.");
      await tx.character.update({ where: { id: characterId }, data: { ap: { decrement: 1 } } });
      if (opts.partyId) {
        const party = await tx.party.findUnique({ where: { id: opts.partyId }, include: { members: { where: { status: "JOINED" }, include: { character: true } } } });
        if (!party || party.leaderId !== characterId || party.status !== "FORMING" || party.realmId !== realmId) throw new EngineError("출발할 수 없는 파티입니다.");
        for (const m of party.members) {
          if (m.characterId === characterId) continue;
          const c = m.character;
          if (await tx.run.findFirst({ where: { characterId: c.id, status: "ACTIVE", isTest: false } })) throw new EngineError(`${c.name}이(가) 다른 탐사 중입니다.`);
          if (c.ap <= 0) throw new EngineError(`${c.name}의 행동력이 없습니다.`);
          if (erosionStage(c.erosion, cfg) === "DANGER") throw new EngineError(`${c.name}의 침식률이 위험 단계입니다.`);
          await tx.character.update({ where: { id: c.id }, data: { ap: { decrement: 1 } } });
        }
        await tx.party.update({ where: { id: party.id }, data: { status: "ACTIVE" } });
      }
    }
    const inv = await tx.inventoryItem.findMany({ where: { characterId }, include: { item: true } });
    const hadCamera = inv.some((i) => (i.item.effects as ItemEffect[]).some((e) => e.type === "camera"));
    const created = await tx.run.create({ data: { characterId, realmId, isTest, hadCamera, partyId: opts.partyId ?? null, forceResult: opts.forceResult ?? null, testState: isTest ? (stateFromCharacter(character as RunRow["character"]) as unknown as Prisma.InputJsonValue) : undefined } });
    const env = await loadEnv(tx, created.id, cfg);
    const deltas: Delta[] = [];
    await enterNode(env, realm.startNodeId, null, deltas);
    await persist(env, { lastResult: Prisma.DbNull });
    return created.id;
  }, TX_OPTS);
}

export type ActionResult = { ended?: boolean };

/** 현재 장면의 선택지를 고른다 */
export async function chooseAction(runId: string, choiceId: string, useAuto: boolean, actorId?: string): Promise<ActionResult> {
  const cfg = await getConfig();
  return db.$transaction(async (tx) => {
    const env = await loadEnv(tx, runId, cfg, actorId);
    const { run } = env;
    if (run.status !== "ACTIVE" || !run.currentNodeId) throw new EngineError("진행 중인 런이 아닙니다.");
    const node = await loadNode(tx, run.currentNodeId);
    const scene = node.scenes.find((s) => s.id === run.currentSceneId) ?? node.scenes.find((s) => s.kind === "BASE");
    const choice = scene?.choices.find((c) => c.id === choiceId);
    if (!scene || !choice) throw new EngineError("지금 고를 수 없는 선택지입니다.");
    if (choice.oncePerRun && env.used.includes(choice.id)) throw new EngineError("이번 런에서 이미 고른 선택지입니다.");
    if (!evalConditions(choice.conditions as Condition[], conditionCtx(env))) throw new EngineError("조건을 충족하지 못했습니다.");

    const deltas: Delta[] = [];
    let check: CheckResult | null = null;
    let outcome = choice.successOutcome;
    if (choice.checkType) {
      check = resolveCheck(env, choice.checkType, choice.checkTarget ?? 7, useAuto);
      if (!check.success) outcome = choice.failOutcome;
    }
    if (choice.oncePerRun) env.used.push(choice.id);
    const nav = outcome ? await applyEffects(env, outcome.effects as OutcomeEffect[], deltas) : {};
    const text = outcome?.text ?? "";
    env.logs.push({ type: "choice", nodeId: node.id, choiceText: choice.text, text, checkDetail: check, deltas });

    const result: LastResult = { kind: "choice", title: choice.text, check, text, deltas };
    return finishAction(env, node, scene.kind === "EVENT", nav, result);
  }, TX_OPTS);
}

/** 효과 적용 뒤 공통 마무리: 쓰러짐, 이동, 장면 전환, 탈출 */
async function finishAction(env: Env, node: NodeRow, inEvent: boolean, nav: Nav, result: LastResult): Promise<ActionResult> {
  const { run } = env;
  if (checkFallen(env)) {
    if (env.party && env.party.memberIds.length > 1) {
      // 파티원 한 명이 쓰러짐: 본인만 이탈(체력·정신력 귀환값, 경험치 절반), 런은 계속
      const { cfg, state, tx } = env;
      state.hp = Math.min(state.maxHp, cfg["fallen.returnHp"]); state.mp = Math.min(state.maxMp, cfg["fallen.returnMp"]);
      const r = applyExp(state, Math.floor(run.exp * cfg["exp.fallenRatio"]), cfg); state.exp = r.exp; state.level = r.level; state.statPoints = r.statPoints;
      await tx.partyMember.update({ where: { partyId_characterId: { partyId: run.partyId!, characterId: env.actor.id } }, data: { status: "FALLEN" } });
      env.logs.push({ type: "system", nodeId: run.currentNodeId, text: `${env.actor.name}이(가) 쓰러져 이계 밖으로 튕겨 나갔다.`, deltas: [] });
      if (inEvent) run.currentSceneId = node.scenes.find((s) => s.kind === "BASE")?.id ?? run.currentSceneId;
      await persist(env, { lastResult: { kind: "info", title: "쓰러짐", check: null, text: "의식을 잃었다. 정신을 차리니 이계 밖이었다. 파티는 탐사를 계속한다.", deltas: [] } as unknown as Prisma.InputJsonValue });
      return { ended: true };
    }
    await endRun(env, "FALLEN");
    return { ended: true };
  }
  if (nav.escape) {
    await endRun(env, "ESCAPED");
    return { ended: true };
  }
  const moveDeltas: Delta[] = [];
  if (nav.moveTo || (nav.moveBack && run.previousNodeId)) {
    const target = nav.moveTo ?? run.previousNodeId!;
    await enterNode(env, target, node.id, moveDeltas);
    result.deltas.push(...moveDeltas);
    if (checkFallen(env)) { await endRun(env, "FALLEN"); return { ended: true }; }
  } else if (nav.gotoScene && node.scenes.some((s) => s.id === nav.gotoScene)) {
    run.currentSceneId = nav.gotoScene;
  } else if (inEvent) {
    run.currentSceneId = node.scenes.find((s) => s.kind === "BASE")?.id ?? null;
  }
  await persist(env, { lastResult: result as unknown as Prisma.InputJsonValue });
  return {};
}

/** 연결을 따라 이동한다 */
export async function moveAction(runId: string, edgeId: string, actorId?: string): Promise<ActionResult> {
  const cfg = await getConfig();
  return db.$transaction(async (tx) => {
    const env = await loadEnv(tx, runId, cfg, actorId);
    const { run } = env;
    if (run.status !== "ACTIVE" || !run.currentNodeId) throw new EngineError("진행 중인 런이 아닙니다.");
    const node = await loadNode(tx, run.currentNodeId);
    const scene = node.scenes.find((s) => s.id === run.currentSceneId);
    if (scene?.kind === "EVENT" && scene.choices.length > 0) throw new EngineError("이벤트를 먼저 처리해야 합니다.");
    const edge = [...node.edgesOut, ...node.edgesIn.filter((e) => e.bidirectional)].find((e) => e.id === edgeId);
    if (!edge) throw new EngineError("이곳에서 갈 수 없는 길입니다.");
    const targetId = edge.fromId === node.id ? edge.toId : edge.fromId;
    if (!evalConditions(edge.conditions as Condition[], conditionCtx(env))) throw new EngineError(edge.failText || "지나갈 수 없다.");
    const target = await tx.node.findUnique({ where: { id: targetId } });
    const known = !!target?.revealedAt || env.revealed.includes(targetId) || env.visited.includes(targetId);
    const deltas: Delta[] = [];
    let check: CheckResult | null = null;
    if (edge.checkType) {
      check = resolveCheck(env, edge.checkType, edge.checkTarget ?? 7, false);
      if (!check.success) {
        const nav = await applyEffects(env, edge.failEffects as OutcomeEffect[], deltas);
        env.logs.push({ type: "move", nodeId: node.id, choiceText: `→ ${known ? target?.name : "???"}`, text: edge.failText, checkDetail: check, deltas });
        return finishAction(env, node, false, nav, { kind: "move", title: `→ ${known ? target?.name : "???"}`, check, text: edge.failText || "지나가지 못했다.", deltas });
      }
    }
    env.logs.push({ type: "move", nodeId: node.id, choiceText: `→ ${known ? target?.name : "???"}`, text: "", checkDetail: check, deltas });
    const result: LastResult = { kind: "move", title: `→ ${known ? target?.name : "???"}`, check, text: "", deltas };
    const r = await finishAction(env, node, false, { moveTo: targetId }, result);
    return r;
  }, TX_OPTS);
}

/** 출구 노드에서 탈출 */
export async function escapeAction(runId: string, actorId?: string): Promise<ActionResult> {
  const cfg = await getConfig();
  return db.$transaction(async (tx) => {
    const env = await loadEnv(tx, runId, cfg, actorId);
    const { run } = env;
    if (run.status !== "ACTIVE" || !run.currentNodeId) throw new EngineError("진행 중인 런이 아닙니다.");
    const node = await loadNode(tx, run.currentNodeId);
    if (!node.isExit) throw new EngineError("여기서는 탈출할 수 없습니다.");
    const scene = node.scenes.find((s) => s.id === run.currentSceneId);
    if (scene?.kind === "EVENT" && scene.choices.length > 0) throw new EngineError("이벤트를 먼저 처리해야 합니다.");
    await endRun(env, "ESCAPED");
    return { ended: true };
  }, TX_OPTS);
}

/** 선택지 없는 이벤트 장면을 넘긴다 */
export async function continueAction(runId: string, actorId?: string): Promise<ActionResult> {
  const cfg = await getConfig();
  return db.$transaction(async (tx) => {
    const env = await loadEnv(tx, runId, cfg, actorId);
    const { run } = env;
    if (run.status !== "ACTIVE" || !run.currentNodeId) throw new EngineError("진행 중인 런이 아닙니다.");
    const node = await loadNode(tx, run.currentNodeId);
    run.currentSceneId = node.scenes.find((s) => s.kind === "BASE")?.id ?? null;
    await persist(env, { lastResult: Prisma.DbNull });
    return {};
  }, TX_OPTS);
}

/** 판정 결과 화면의 "계속" */
export async function ackResultAction(runId: string) {
  await db.run.update({ where: { id: runId }, data: { lastResult: Prisma.DbNull } });
}

/** 공간 이동 능력 */
export async function teleportAction(runId: string, nodeId: string, actorId?: string): Promise<ActionResult> {
  const cfg = await getConfig();
  return db.$transaction(async (tx) => {
    const env = await loadEnv(tx, runId, cfg, actorId);
    const { run } = env;
    if (run.status !== "ACTIVE" || !run.currentNodeId) throw new EngineError("진행 중인 런이 아닙니다.");
    if (teleportRemaining(env) <= 0) throw new EngineError("오늘 공간 이동 횟수를 다 썼습니다.");
    const node = await loadNode(tx, run.currentNodeId);
    const scene = node.scenes.find((s) => s.id === run.currentSceneId);
    if (scene?.kind === "EVENT" && scene.choices.length > 0) throw new EngineError("이벤트를 먼저 처리해야 합니다.");
    const target = await tx.node.findUnique({ where: { id: nodeId } });
    if (!target || target.realmId !== run.realmId) throw new EngineError("대상 노드가 없습니다.");
    if (!target.revealedAt && !env.revealed.includes(nodeId) && !env.visited.includes(nodeId)) throw new EngineError("공개된 노드로만 이동할 수 있습니다.");
    env.state.teleportUsedToday += 1;
    const deltas: Delta[] = [];
    env.logs.push({ type: "teleport", nodeId: node.id, choiceText: `공간 이동 → ${target.name}`, text: "", deltas });
    return finishAction(env, node, false, { moveTo: nodeId }, { kind: "teleport", title: `공간 이동 → ${target.name}`, check: null, text: "공간이 접히며 눈앞의 풍경이 바뀌었다.", deltas });
  }, TX_OPTS);
}

/** 런 중 소모품 사용 */
export async function consumeItemInRun(runId: string, itemId: string, actorId?: string): Promise<ActionResult> {
  const cfg = await getConfig();
  return db.$transaction(async (tx) => {
    const env = await loadEnv(tx, runId, cfg, actorId);
    const { run } = env;
    if (run.status !== "ACTIVE" || !run.currentNodeId) throw new EngineError("진행 중인 런이 아닙니다.");
    const item = await tx.item.findUnique({ where: { id: itemId } });
    if (!item) throw new EngineError("아이템이 없습니다.");
    if (item.usableIn === "OUTSIDE") throw new EngineError("런 중에는 쓸 수 없는 아이템입니다.");
    if (invQty(env, itemId) <= 0) throw new EngineError("가지고 있지 않은 아이템입니다.");
    const effects = item.effects as ItemEffect[];
    if (item.category === "EQUIPMENT" || item.category === "FACTOR") throw new EngineError("장비와 인자는 사용할 수 없습니다. 유저 화면에서 착용하거나 조합하세요.");
    if (effects.length === 0 || effects.every((e) => e.type === "narrative" || e.type === "camera" || e.type === "extractor")) throw new EngineError("사용 효과가 없는 아이템입니다.");
    removeItem(env, itemId, 1);
    const deltas: Delta[] = [];
    const nav: Nav = {};
    for (const e of effects) {
      switch (e.type) {
        case "hp": env.state.hp = Math.max(0, Math.min(env.state.maxHp, env.state.hp + e.value)); deltas.push({ label: "체력", value: e.value }); break;
        case "mp": env.state.mp = Math.max(0, Math.min(env.state.maxMp, env.state.mp + e.value)); deltas.push({ label: "정신력", value: e.value }); break;
        case "erosion": if (e.value >= 0) { const g = gainErosion(env, e.value); deltas.push({ label: "침식률", value: g }); } else { env.state.erosion = Math.max(0, env.state.erosion + e.value); deltas.push({ label: "침식률", value: e.value }); } break;
        case "run_check_bonus": env.modifiers.push({ type: "run_check_bonus", checkType: e.checkType, value: e.value, label: item.name }); deltas.push({ label: "이번 런 판정", text: `${item.name} ${e.value >= 0 ? "+" : ""}${e.value}` }); break;
        case "run_extra_dice": env.modifiers.push({ type: "run_extra_dice", checkType: e.checkType, value: e.value, label: item.name }); deltas.push({ label: "이번 런 다이스", text: `${item.name} +${e.value}` }); break;
        case "escape": nav.escape = true; break;
        case "narrative": case "camera": case "extractor": break;
      }
    }
    const node = await loadNode(tx, run.currentNodeId);
    env.logs.push({ type: "item", nodeId: node.id, choiceText: `${item.name} 사용`, text: "", deltas });
    return finishAction(env, node, false, nav, { kind: "item", title: `${item.name} 사용`, check: null, text: item.description, deltas });
  }, TX_OPTS);
}

/** 런 밖 소모품 사용 (보관함 화면) */
export async function consumeItemOutside(characterId: string, itemId: string): Promise<Delta[]> {
  const cfg = await getConfig();
  return db.$transaction(async (tx) => {
    const [c, inv, item] = await Promise.all([
      tx.character.findUnique({ where: { id: characterId } }),
      tx.inventoryItem.findUnique({ where: { characterId_itemId: { characterId, itemId } } }),
      tx.item.findUnique({ where: { id: itemId } }),
    ]);
    if (!c || !inv || inv.qty <= 0 || !item) throw new EngineError("가지고 있지 않은 아이템입니다.");
    if (item.usableIn === "RUN") throw new EngineError("탐사 중에만 쓸 수 있는 아이템입니다.");
    const effects = (item.effects as ItemEffect[]).filter((e) => e.type === "hp" || e.type === "mp" || e.type === "erosion");
    if (effects.length === 0) throw new EngineError("지금 쓸 수 있는 효과가 없는 아이템입니다.");
    const deltas: Delta[] = [];
    const data: Prisma.CharacterUpdateInput = {};
    let hp = c.hp, mp = c.mp, erosion = c.erosion;
    for (const e of effects) {
      if (e.type === "hp") { hp = Math.max(0, Math.min(c.maxHp, hp + e.value)); deltas.push({ label: "체력", value: e.value }); }
      if (e.type === "mp") { mp = Math.max(0, Math.min(c.maxMp, mp + e.value)); deltas.push({ label: "정신력", value: e.value }); }
      if (e.type === "erosion") { erosion = e.value >= 0 ? erosion + applyErosionGain(e.value, mp, c.maxMp, cfg) : Math.max(0, erosion + e.value); deltas.push({ label: "침식률", value: e.value }); }
    }
    data.hp = hp; data.mp = mp; data.erosion = erosion;
    await tx.character.update({ where: { id: characterId }, data });
    if (inv.qty === 1) await tx.inventoryItem.delete({ where: { id: inv.id } }); else await tx.inventoryItem.update({ where: { id: inv.id }, data: { qty: inv.qty - 1 } });
    return deltas;
  }, TX_OPTS);
}

/** 이번 런 획득 아이템 버리기 */
export async function discardLootAction(runId: string, itemId: string, actorId?: string) {
  const cfg = await getConfig();
  await db.$transaction(async (tx) => {
    const env = await loadEnv(tx, runId, cfg, actorId);
    if (env.run.status !== "ACTIVE") throw new EngineError("진행 중인 런이 아닙니다.");
    const e = env.loot.find((l) => l.itemId === itemId);
    if (!e) return;
    env.loot = env.loot.filter((l) => l !== e);
    await persist(env);
  }, TX_OPTS);
}

/** 관리자 강제 종료 (유저 관리 화면에서 호출) */
export async function abortRun(runId: string) {
  const cfg = await getConfig();
  await db.$transaction(async (tx) => {
    const env = await loadEnv(tx, runId, cfg);
    if (env.run.status !== "ACTIVE") return;
    await endRun(env, "ABORTED");
  }, TX_OPTS);
}

// ───────────────────────── 화면용 뷰 ─────────────────────────

export type ChoiceView = { id: string; text: string; locked: boolean; lockReasons: string[]; check: { type: CheckType; label: string; target: number } | null; autoRemaining: number; used: boolean };
export type MoveView = { edgeId: string; targetId: string; label: string; known: boolean; locked: boolean; check: { label: string; target: number } | null };
export type MiniNode = { id: string; name: string; depth: number; x: number; y: number; known: boolean; current: boolean; visited: boolean; isExit: boolean; revealedBy: string | null };
export type MiniEdge = { id: string; from: string; to: string };
export type RunView = {
  runId: string; isTest: boolean; forceResult: string | null; status: string;
  realm: { id: string; name: string };
  node: { id: string; name: string; depth: number; description: string; isExit: boolean };
  scene: { id: string; kind: "BASE" | "EVENT"; name: string; text: string } | null;
  choices: ChoiceView[];
  moves: MoveView[];
  canEscape: boolean;
  canContinue: boolean;
  inEvent: boolean;
  lastResult: LastResult | null;
  summary: RunSummary | null;
  state: CharState;
  stage: ReturnType<typeof erosionStage>;
  loot: { itemId: string; name: string; qty: number }[];
  usableItems: { itemId: string; name: string; qty: number; description: string; fromLoot: boolean }[];
  modifiers: RunModifier[];
  clues: { text: string; flag: string }[];
  teleportRemaining: number;
  teleportTargets: { id: string; name: string }[];
  minimap: { nodes: MiniNode[]; edges: MiniEdge[] };
  hadCamera: boolean;
  memos: { id: string; title: string; body: string; author: string; reactions: number }[];
  party: { members: { id: string; name: string; hp: number; maxHp: number; mp: number; maxMp: number; erosion: number; status: string; isLeader: boolean }[] } | null;
  actorName: string;
};

export async function getRunView(runId: string, viewerId?: string): Promise<RunView> {
  const cfg = await getConfig();
  const env = await loadEnv(db, runId, cfg, viewerId);
  const { run, state } = env;
  const [nodes, edges, revealedBy] = await Promise.all([
    db.node.findMany({ where: { realmId: run.realmId } }),
    db.edge.findMany({ where: { realmId: run.realmId } }),
    db.character.findMany({ where: { revealedNodes: { some: { realmId: run.realmId } } }, select: { id: true, name: true } }),
  ]);
  const memoRows = run.currentNodeId ? await db.explorationLog.findMany({ where: { nodeId: run.currentNodeId, kind: "DIARY", status: "APPROVED" }, include: { character: { select: { name: true } }, post: { include: { _count: { select: { reactions: true } } } } } }) : [];
  const memos = memoRows.filter((m) => m.post._count.reactions >= cfg["log.memoThreshold"]).map((m) => ({ id: m.id, title: m.title, body: m.body, author: m.character.name, reactions: m.post._count.reactions }));
  const known = (id: string) => { const n = nodes.find((x) => x.id === id); return !!n && (!!n.revealedAt || env.revealed.includes(id) || env.visited.includes(id)); };
  const currentId = run.currentNodeId ?? run.realm.startNodeId ?? nodes[0]?.id;
  const node = currentId ? await loadNode(db, currentId) : null;
  const cctx = conditionCtx(env);
  const [items, tags] = await Promise.all([db.item.findMany({ select: { id: true, name: true, description: true, usableIn: true, effects: true, category: true } }), db.abilityTag.findMany()]);
  const names = { items: new Map(items.map((i) => [i.id, i.name])), tags: new Map(tags.map((t) => [t.id, t.name])) };
  const { describeCondition } = await import("./conditions");

  const scene = node ? (node.scenes.find((s) => s.id === run.currentSceneId) ?? node.scenes.find((s) => s.kind === "BASE") ?? null) : null;
  const inEvent = scene?.kind === "EVENT";
  const choices: ChoiceView[] = (scene?.choices ?? []).flatMap((c) => {
    const conds = c.conditions as Condition[];
    const ok = evalConditions(conds, cctx);
    if (!ok && c.lockedDisplay === "HIDE") return [];
    const used = c.oncePerRun && env.used.includes(c.id);
    return [{
      id: c.id, text: c.text, locked: !ok, lockReasons: ok ? [] : conds.filter((x) => !evalConditions([x], cctx)).map((x) => describeCondition(x, names)),
      check: c.checkType ? { type: c.checkType, label: CHECK_TYPE_LABEL[c.checkType], target: c.checkTarget ?? 7 } : null,
      autoRemaining: c.checkType ? autoSuccessRemaining(env, c.checkType) : 0, used,
    }];
  });
  const moves: MoveView[] = node ? [...node.edgesOut.map((e) => ({ e, targetId: e.toId })), ...node.edgesIn.filter((e) => e.bidirectional).map((e) => ({ e, targetId: e.fromId }))].map(({ e, targetId }) => {
    const k = known(targetId);
    return { edgeId: e.id, targetId, label: k ? (nodes.find((n) => n.id === targetId)?.name ?? "?") : "???", known: k, locked: !evalConditions(e.conditions as Condition[], cctx), check: e.checkType ? { label: CHECK_TYPE_LABEL[e.checkType], target: e.checkTarget ?? 7 } : null };
  }) : [];

  const lootView = env.loot.map((l) => ({ itemId: l.itemId, name: names.items.get(l.itemId) ?? "?", qty: l.qty }));
  const usable: RunView["usableItems"] = [];
  const canUse = (it: typeof items[number]) => it.usableIn !== "OUTSIDE" && it.category !== "EQUIPMENT" && it.category !== "FACTOR" && (it.effects as ItemEffect[]).some((e) => e.type !== "narrative" && e.type !== "camera" && e.type !== "extractor");
  if (!run.isTest) for (const inv of env.actor.inventory) { const it = items.find((i) => i.id === inv.itemId); if (it && canUse(it)) usable.push({ itemId: it.id, name: it.name, qty: inv.qty, description: it.description, fromLoot: false }); }
  for (const l of env.loot) { const it = items.find((i) => i.id === l.itemId); if (it && canUse(it)) usable.push({ itemId: it.id, name: it.name, qty: l.qty, description: it.description, fromLoot: true }); }

  const knownIds = new Set(nodes.filter((n) => known(n.id)).map((n) => n.id));
  const miniNodeIds = new Set(knownIds);
  for (const e of edges) { if (knownIds.has(e.fromId)) miniNodeIds.add(e.toId); if (knownIds.has(e.toId) && e.bidirectional) miniNodeIds.add(e.fromId); }
  const minimap = {
    nodes: nodes.filter((n) => miniNodeIds.has(n.id)).map((n) => ({ id: n.id, name: knownIds.has(n.id) ? n.name : "???", depth: n.depth, x: n.posX, y: n.posY, known: knownIds.has(n.id), current: n.id === currentId, visited: env.visited.includes(n.id), isExit: knownIds.has(n.id) && n.isExit, revealedBy: n.revealedById ? (revealedBy.find((c) => c.id === n.revealedById)?.name ?? null) : null })),
    edges: edges.filter((e) => miniNodeIds.has(e.fromId) && miniNodeIds.has(e.toId) && (knownIds.has(e.fromId) || knownIds.has(e.toId))).map((e) => ({ id: e.id, from: e.fromId, to: e.toId })),
  };

  return {
    runId: run.id, isTest: run.isTest, forceResult: run.forceResult, status: run.status,
    realm: { id: run.realm.id, name: run.realm.name },
    node: node ? { id: node.id, name: node.name, depth: node.depth, description: node.description, isExit: node.isExit } : { id: "", name: "?", depth: 0, description: "", isExit: false },
    scene: scene ? { id: scene.id, kind: scene.kind, name: scene.name, text: scene.text } : null,
    choices, moves,
    canEscape: !!node?.isExit && !(inEvent && choices.length > 0),
    canContinue: !!inEvent && choices.length === 0,
    inEvent: !!inEvent,
    lastResult: (run.lastResult as LastResult | null) ?? null,
    summary: (run.summary as RunSummary | null) ?? null,
    state, stage: erosionStage(state.erosion, cfg),
    loot: lootView, usableItems: usable, modifiers: env.modifiers, clues: env.clues,
    teleportRemaining: teleportRemaining(env),
    teleportTargets: nodes.filter((n) => knownIds.has(n.id) && n.id !== currentId).map((n) => ({ id: n.id, name: n.name })),
    minimap,
    hadCamera: run.hadCamera,
    memos,
    party: run.party ? { members: run.party.members.map((m) => ({ id: m.characterId, name: m.character.name, hp: m.character.hp, maxHp: m.character.maxHp, mp: m.character.mp, maxMp: m.character.maxMp, erosion: m.character.erosion, status: m.status, isLeader: m.characterId === run.party!.leaderId })) } : null,
    actorName: env.actor.name,
  };
}
