import "server-only";
import { randomInt } from "crypto";
import { db } from "./db";
import { getConfig } from "./game-config";
import type { Prisma } from "@prisma/client";

/** 템플릿 이계를 통째로 복제해 인스턴스를 만든다 (노드·연결·장면·선택지·결과). 지도 위치는 무작위. */
export async function spawnInstance(templateId: string, actorUserId: string | null = null): Promise<string> {
  const t = await db.realm.findUnique({ where: { id: templateId }, include: { nodes: { include: { scenes: { include: { choices: { include: { successOutcome: true, failOutcome: true } } } } } }, edges: true } });
  if (!t || !t.isTemplate) throw new Error("템플릿이 아닙니다.");
  const count = await db.realm.count({ where: { templateId } });
  return db.$transaction(async (tx) => {
    const realm = await tx.realm.create({ data: {
      name: `${t.name} #${count + 1}`, intro: t.intro, kind: "INSTANT", isPublished: true, isTemplate: false, templateId,
      mapX: 8 + randomInt(0, 8500) / 100, mapY: 12 + randomInt(0, 7000) / 100,
    } });
    const nodeMap = new Map<string, string>();
    const sceneMap = new Map<string, string>();
    // 1) 노드와 장면 id 매핑 먼저 (효과의 move/goto_scene 참조를 바꾸기 위해)
    for (const n of t.nodes) {
      const created = await tx.node.create({ data: { realmId: realm.id, name: n.name, description: n.description, depth: n.depth, isExit: n.isExit, entryErosion: n.entryErosion, rewardNew: n.rewardNew, rewardKnown: n.rewardKnown, posX: n.posX, posY: n.posY } });
      nodeMap.set(n.id, created.id);
      for (const sc of n.scenes) {
        const s = await tx.scene.create({ data: { nodeId: created.id, kind: sc.kind, name: sc.name, text: sc.text, chance: sc.chance, mandatory: sc.mandatory, sortOrder: sc.sortOrder } });
        sceneMap.set(sc.id, s.id);
      }
    }
    const remap = (effects: unknown): Prisma.InputJsonValue => {
      const arr = Array.isArray(effects) ? (effects as Record<string, unknown>[]) : [];
      return arr.map((e) => {
        if ((e.type === "move" || e.type === "reveal") && typeof e.nodeId === "string") return { ...e, nodeId: nodeMap.get(e.nodeId) ?? e.nodeId };
        if (e.type === "goto_scene" && typeof e.sceneId === "string") return { ...e, sceneId: sceneMap.get(e.sceneId) ?? e.sceneId };
        return e;
      }) as Prisma.InputJsonValue;
    };
    // 2) 선택지와 결과
    for (const n of t.nodes) for (const sc of n.scenes) for (const c of sc.choices) {
      const so = c.successOutcome ? await tx.outcome.create({ data: { text: c.successOutcome.text, effects: remap(c.successOutcome.effects) } }) : null;
      const fo = c.failOutcome ? await tx.outcome.create({ data: { text: c.failOutcome.text, effects: remap(c.failOutcome.effects) } }) : null;
      await tx.choice.create({ data: { sceneId: sceneMap.get(sc.id)!, text: c.text, conditions: c.conditions as Prisma.InputJsonValue, lockedDisplay: c.lockedDisplay, checkType: c.checkType, checkTarget: c.checkTarget, oncePerRun: c.oncePerRun, sortOrder: c.sortOrder, successOutcomeId: so?.id ?? null, failOutcomeId: fo?.id ?? null } });
    }
    // 3) 연결
    for (const e of t.edges) {
      await tx.edge.create({ data: { realmId: realm.id, fromId: nodeMap.get(e.fromId)!, toId: nodeMap.get(e.toId)!, bidirectional: e.bidirectional, conditions: e.conditions as Prisma.InputJsonValue, checkType: e.checkType, checkTarget: e.checkTarget, failText: e.failText, failEffects: remap(e.failEffects) } });
    }
    await tx.realm.update({ where: { id: realm.id }, data: { startNodeId: t.startNodeId ? nodeMap.get(t.startNodeId) : null } });
    await tx.realm.update({ where: { id: templateId }, data: { lastSpawnAt: new Date() } });
    if (actorUserId) await tx.auditLog.create({ data: { actorId: actorUserId, action: "instant.spawn", targetType: "realm", targetId: realm.id, detail: { template: t.name, name: realm.name } } });
    return realm.id;
  }, { timeout: 30000 });
}

/**
 * 자동 생성 점검. 요청 시점에 늦게 실행된다 (크론 불필요).
 * 공개된 템플릿마다 봉합되지 않은 인스턴스 수가 동시 존재 수보다 적고, 마지막 생성 후 주기가 지났으면 하나 만든다.
 */
export async function ensureInstantSpawns() {
  const cfg = await getConfig();
  if (!cfg["instant.autoSpawn"]) return;
  const templates = await db.realm.findMany({ where: { kind: "INSTANT", isTemplate: true, isPublished: true }, include: { _count: { select: { instances: { where: { sealedAt: null } } } } } });
  const now = Date.now();
  for (const t of templates) {
    if (t._count.instances >= t.maxConcurrent) continue;
    if (t.lastSpawnAt && now - t.lastSpawnAt.getTime() < t.spawnIntervalHours * 3600 * 1000) continue;
    try { await spawnInstance(t.id); } catch (e) { console.error("instant spawn failed", e); }
  }
}
