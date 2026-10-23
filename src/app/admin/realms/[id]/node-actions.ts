"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import type { FormState } from "@/components/ActionForm";
import type { Prisma } from "@prisma/client";
import { conditionListSchema, effectListSchema } from "@/lib/content-schemas";

const nullableInt = z.string().transform((v) => (v.trim() === "" ? null : Number(v))).pipe(z.number().int().min(0).nullable());

// ───────────── 노드 ─────────────

const nodeSchema = z.object({
  name: z.string().trim().min(1, "노드 이름을 입력하세요.").max(40),
  description: z.string().max(5000),
  depth: z.coerce.number().int().min(0).max(999),
  isExit: z.boolean(),
  entryErosion: nullableInt,
  rewardNew: nullableInt,
  rewardKnown: nullableInt,
});

export async function saveNodeAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const realmId = String(formData.get("realmId") ?? "");
  const nodeId = String(formData.get("nodeId") ?? "");
  const parsed = nodeSchema.safeParse({
    name: formData.get("name"), description: formData.get("description") ?? "", depth: formData.get("depth"), isExit: formData.get("isExit") === "on",
    entryErosion: formData.get("entryErosion") ?? "", rewardNew: formData.get("rewardNew") ?? "", rewardKnown: formData.get("rewardKnown") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  await db.node.updateMany({ where: { id: nodeId, realmId }, data: parsed.data });
  await audit(admin.id, "node.update", { type: "node", id: nodeId }, { name: parsed.data.name });
  revalidatePath(`/admin/realms/${realmId}`);
  return { success: "노드를 저장했습니다." };
}

// ───────────── 장면 ─────────────

export async function addSceneAction(formData: FormData) {
  await requireAdmin();
  const realmId = String(formData.get("realmId") ?? "");
  const nodeId = String(formData.get("nodeId") ?? "");
  const count = await db.scene.count({ where: { nodeId } });
  await db.scene.create({ data: { nodeId, kind: "EVENT", name: `이벤트 ${count}`, text: "", chance: 30, mandatory: false, sortOrder: count } });
  revalidatePath(`/admin/realms/${realmId}`);
}

const sceneSchema = z.object({
  name: z.string().trim().max(40),
  text: z.string().max(5000),
  chance: z.coerce.number().int().min(0).max(100),
  mandatory: z.boolean(),
});

export async function saveSceneAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const realmId = String(formData.get("realmId") ?? "");
  const sceneId = String(formData.get("sceneId") ?? "");
  const parsed = sceneSchema.safeParse({ name: formData.get("name") ?? "", text: formData.get("text") ?? "", chance: formData.get("chance") ?? 100, mandatory: formData.get("mandatory") === "on" });
  if (!parsed.success) return { error: "장면 값을 확인하세요." };
  await db.scene.update({ where: { id: sceneId }, data: parsed.data });
  revalidatePath(`/admin/realms/${realmId}`);
  return { success: "장면을 저장했습니다." };
}

export async function deleteSceneAction(formData: FormData) {
  await requireAdmin();
  const realmId = String(formData.get("realmId") ?? "");
  const sceneId = String(formData.get("sceneId") ?? "");
  const scene = await db.scene.findUnique({ where: { id: sceneId } });
  if (!scene || scene.kind === "BASE") return;
  await db.scene.delete({ where: { id: sceneId } });
  revalidatePath(`/admin/realms/${realmId}`);
}

// ───────────── 선택지 ─────────────

export async function addChoiceAction(formData: FormData) {
  await requireAdmin();
  const realmId = String(formData.get("realmId") ?? "");
  const sceneId = String(formData.get("sceneId") ?? "");
  const count = await db.choice.count({ where: { sceneId } });
  const success = await db.outcome.create({ data: { text: "", effects: [] } });
  await db.choice.create({ data: { sceneId, text: "새 선택지", sortOrder: count, successOutcomeId: success.id } });
  revalidatePath(`/admin/realms/${realmId}`);
}

function parseJson(raw: FormDataEntryValue | null): unknown {
  try { return JSON.parse(String(raw ?? "[]")); } catch { return null; }
}

const choiceSchema = z.object({
  text: z.string().trim().min(1, "선택지 문구를 입력하세요.").max(200),
  lockedDisplay: z.enum(["HIDE", "SHOW_LOCKED"]),
  checkType: z.enum(["COMBAT", "SEARCH", "CRAFT", "GENERAL", ""]).transform((v) => (v === "" ? null : v)),
  checkTarget: z.coerce.number().int().min(2).max(30),
  oncePerRun: z.boolean(),
  successText: z.string().max(3000),
  failText: z.string().max(3000),
});

export async function saveChoiceAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const realmId = String(formData.get("realmId") ?? "");
  const choiceId = String(formData.get("choiceId") ?? "");
  const parsed = choiceSchema.safeParse({
    text: formData.get("text"), lockedDisplay: formData.get("lockedDisplay") ?? "HIDE", checkType: formData.get("checkType") ?? "",
    checkTarget: formData.get("checkTarget") || 7, oncePerRun: formData.get("oncePerRun") === "on",
    successText: formData.get("successText") ?? "", failText: formData.get("failText") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const conds = conditionListSchema.safeParse(parseJson(formData.get("conditions")));
  if (!conds.success) return { error: `표시 조건: ${conds.error.issues[0].message}` };
  const sEff = effectListSchema.safeParse(parseJson(formData.get("successEffects")));
  if (!sEff.success) return { error: `성공 결과 효과: ${sEff.error.issues[0].message}` };
  const fEff = effectListSchema.safeParse(parseJson(formData.get("failEffects")));
  if (!fEff.success) return { error: `실패 결과 효과: ${fEff.error.issues[0].message}` };

  const choice = await db.choice.findUnique({ where: { id: choiceId }, include: { scene: { include: { node: true } } } });
  if (!choice || choice.scene.node.realmId !== realmId) return { error: "선택지를 찾을 수 없습니다." };
  const d = parsed.data;

  await db.$transaction(async (tx) => {
    const successOutcomeId = choice.successOutcomeId
      ? (await tx.outcome.update({ where: { id: choice.successOutcomeId }, data: { text: d.successText, effects: sEff.data as Prisma.InputJsonValue } })).id
      : (await tx.outcome.create({ data: { text: d.successText, effects: sEff.data as Prisma.InputJsonValue } })).id;
    let failOutcomeId: string | null = choice.failOutcomeId;
    if (d.checkType) {
      failOutcomeId = failOutcomeId
        ? (await tx.outcome.update({ where: { id: failOutcomeId }, data: { text: d.failText, effects: fEff.data as Prisma.InputJsonValue } })).id
        : (await tx.outcome.create({ data: { text: d.failText, effects: fEff.data as Prisma.InputJsonValue } })).id;
    }
    await tx.choice.update({
      where: { id: choiceId },
      data: {
        text: d.text, lockedDisplay: d.lockedDisplay, checkType: d.checkType, checkTarget: d.checkType ? d.checkTarget : null, oncePerRun: d.oncePerRun,
        conditions: conds.data as Prisma.InputJsonValue, successOutcomeId, failOutcomeId,
      },
    });
  });
  revalidatePath(`/admin/realms/${realmId}`);
  return { success: "선택지를 저장했습니다." };
}

export async function deleteChoiceAction(formData: FormData) {
  await requireAdmin();
  const realmId = String(formData.get("realmId") ?? "");
  const choiceId = String(formData.get("choiceId") ?? "");
  const choice = await db.choice.findUnique({ where: { id: choiceId } });
  if (!choice) return;
  await db.choice.delete({ where: { id: choiceId } });
  await db.outcome.deleteMany({ where: { id: { in: [choice.successOutcomeId, choice.failOutcomeId].filter((v): v is string => !!v) } } });
  revalidatePath(`/admin/realms/${realmId}`);
}

export async function moveChoiceAction(formData: FormData) {
  await requireAdmin();
  const realmId = String(formData.get("realmId") ?? "");
  const choiceId = String(formData.get("choiceId") ?? "");
  const dir = String(formData.get("dir") ?? "up");
  const choice = await db.choice.findUnique({ where: { id: choiceId } });
  if (!choice) return;
  const siblings = await db.choice.findMany({ where: { sceneId: choice.sceneId }, orderBy: { sortOrder: "asc" } });
  const idx = siblings.findIndex((c) => c.id === choiceId);
  const swap = dir === "up" ? idx - 1 : idx + 1;
  if (swap < 0 || swap >= siblings.length) return;
  await db.$transaction([
    db.choice.update({ where: { id: siblings[idx].id }, data: { sortOrder: swap } }),
    db.choice.update({ where: { id: siblings[swap].id }, data: { sortOrder: idx } }),
  ]);
  revalidatePath(`/admin/realms/${realmId}`);
}

// ───────────── 적대 존재 이벤트 자동 생성 ─────────────

const hostileSchema = z.object({
  name: z.string().trim().min(1, "적 이름을 입력하세요.").max(40),
  description: z.string().trim().max(3000),
  threat: z.coerce.number().int().min(2).max(30),
  chance: z.coerce.number().int().min(0).max(100),
  mandatory: z.boolean(),
  killPoints: z.coerce.number().int().min(0),
  killDropTableId: z.string(),
  damage: z.coerce.number().int().min(0),
  bypassCheck: z.enum(["SEARCH", "GENERAL"]),
  bypassTarget: z.coerce.number().int().min(2).max(30),
  fleeMode: z.enum(["damage", "check"]),
  fleeTarget: z.coerce.number().int().min(2).max(30),
  fleeDamage: z.coerce.number().int().min(0),
});

export async function addHostileEventAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const realmId = String(formData.get("realmId") ?? "");
  const nodeId = String(formData.get("nodeId") ?? "");
  const parsed = hostileSchema.safeParse({
    name: formData.get("name"), description: formData.get("description") ?? "", threat: formData.get("threat"), chance: formData.get("chance"), mandatory: formData.get("mandatory") === "on",
    killPoints: formData.get("killPoints") || 0, killDropTableId: formData.get("killDropTableId") ?? "", damage: formData.get("damage"),
    bypassCheck: formData.get("bypassCheck"), bypassTarget: formData.get("bypassTarget"), fleeMode: formData.get("fleeMode"), fleeTarget: formData.get("fleeTarget") || 7, fleeDamage: formData.get("fleeDamage") || 0,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  const node = await db.node.findFirst({ where: { id: nodeId, realmId } });
  if (!node) return { error: "노드를 찾을 수 없습니다." };

  const killEffects: unknown[] = [];
  if (d.killPoints > 0) killEffects.push({ type: "points", value: d.killPoints });
  if (d.killDropTableId) killEffects.push({ type: "item_drop", tableId: d.killDropTableId, rolls: 1 });
  const damageEffects = d.damage > 0 ? [{ type: "hp", value: -d.damage }] : [];

  await db.$transaction(async (tx) => {
    const count = await tx.scene.count({ where: { nodeId } });
    const scene = await tx.scene.create({ data: { nodeId, kind: "EVENT", name: `적대: ${d.name}`, text: d.description || `${d.name}이(가) 나타났다.`, chance: d.chance, mandatory: d.mandatory, sortOrder: count } });
    // 맞선다
    const s1 = await tx.outcome.create({ data: { text: `${d.name}을(를) 처치했다.`, effects: killEffects as Prisma.InputJsonValue } });
    const f1 = await tx.outcome.create({ data: { text: `${d.name}에게 당했다.`, effects: damageEffects as Prisma.InputJsonValue } });
    await tx.choice.create({ data: { sceneId: scene.id, text: `${d.name}에게 맞선다`, conditions: [{ type: "category", value: "COMBAT" }], lockedDisplay: "SHOW_LOCKED", checkType: "COMBAT", checkTarget: d.threat, oncePerRun: true, sortOrder: 0, successOutcomeId: s1.id, failOutcomeId: f1.id } });
    // 우회한다
    const s2 = await tx.outcome.create({ data: { text: `${d.name}의 눈을 피해 지나쳤다.`, effects: [] } });
    const f2 = await tx.outcome.create({ data: { text: `들켰다. ${d.name}이(가) 덮쳐 온다.`, effects: damageEffects as Prisma.InputJsonValue } });
    await tx.choice.create({ data: { sceneId: scene.id, text: "우회한다", conditions: [], checkType: d.bypassCheck, checkTarget: d.bypassTarget, oncePerRun: false, sortOrder: 1, successOutcomeId: s2.id, failOutcomeId: f2.id } });
    // 도주한다
    if (d.fleeMode === "damage") {
      const s3 = await tx.outcome.create({ data: { text: `왔던 길로 달아났다.`, effects: [...(d.fleeDamage > 0 ? [{ type: "hp", value: -d.fleeDamage }] : []), { type: "move_back" }] as Prisma.InputJsonValue } });
      await tx.choice.create({ data: { sceneId: scene.id, text: "도주한다", conditions: [], checkType: null, checkTarget: null, oncePerRun: false, sortOrder: 2, successOutcomeId: s3.id } });
    } else {
      const s3 = await tx.outcome.create({ data: { text: `무사히 왔던 길로 달아났다.`, effects: [{ type: "move_back" }] as Prisma.InputJsonValue } });
      const f3 = await tx.outcome.create({ data: { text: `달아나다 상처를 입었다.`, effects: [...(d.fleeDamage > 0 ? [{ type: "hp", value: -d.fleeDamage }] : []), { type: "move_back" }] as Prisma.InputJsonValue } });
      await tx.choice.create({ data: { sceneId: scene.id, text: "도주한다", conditions: [], checkType: "GENERAL", checkTarget: d.fleeTarget, oncePerRun: false, sortOrder: 2, successOutcomeId: s3.id, failOutcomeId: f3.id } });
    }
  });
  await audit(admin.id, "node.addHostile", { type: "node", id: nodeId }, { name: d.name, threat: d.threat });
  revalidatePath(`/admin/realms/${realmId}`);
  return { success: `적대 존재 "${d.name}" 이벤트와 선택지 3개를 만들었습니다. 아래에서 자유롭게 고치세요.` };
}

// ───────────── 연결 ─────────────

const edgeSchema = z.object({
  bidirectional: z.boolean(),
  checkType: z.enum(["COMBAT", "SEARCH", "CRAFT", "GENERAL", ""]).transform((v) => (v === "" ? null : v)),
  checkTarget: z.coerce.number().int().min(2).max(30),
  failText: z.string().max(1000),
});

export async function saveEdgeAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const realmId = String(formData.get("realmId") ?? "");
  const edgeId = String(formData.get("edgeId") ?? "");
  const parsed = edgeSchema.safeParse({ bidirectional: formData.get("bidirectional") === "on", checkType: formData.get("checkType") ?? "", checkTarget: formData.get("checkTarget") || 7, failText: formData.get("failText") ?? "" });
  if (!parsed.success) return { error: "연결 값을 확인하세요." };
  const conds = conditionListSchema.safeParse(parseJson(formData.get("conditions")));
  if (!conds.success) return { error: `통과 조건: ${conds.error.issues[0].message}` };
  const fEff = effectListSchema.safeParse(parseJson(formData.get("failEffects")));
  if (!fEff.success) return { error: `실패 효과: ${fEff.error.issues[0].message}` };
  const d = parsed.data;
  await db.edge.updateMany({ where: { id: edgeId, realmId }, data: { bidirectional: d.bidirectional, checkType: d.checkType, checkTarget: d.checkType ? d.checkTarget : null, failText: d.failText, conditions: conds.data as Prisma.InputJsonValue, failEffects: fEff.data as Prisma.InputJsonValue } });
  revalidatePath(`/admin/realms/${realmId}`);
  return { success: "연결을 저장했습니다." };
}

export async function deleteEdgeFormAction(formData: FormData) {
  await requireAdmin();
  const realmId = String(formData.get("realmId") ?? "");
  const edgeId = String(formData.get("edgeId") ?? "");
  await db.edge.deleteMany({ where: { id: edgeId, realmId } });
  revalidatePath(`/admin/realms/${realmId}`);
  redirect(`/admin/realms/${realmId}`);
}
