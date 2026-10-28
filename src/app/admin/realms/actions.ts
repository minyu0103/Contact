"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import type { FormState } from "@/components/ActionForm";

export async function createRealmAction(formData: FormData) {
  const admin = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim().slice(0, 40) || "새 이계";
  const realm = await db.realm.create({ data: { name } });
  // 시작 노드를 하나 만들어 둔다
  const start = await db.node.create({ data: { realmId: realm.id, name: "입구", description: "", depth: 1, isExit: true, posX: 0, posY: 0 } });
  await db.scene.create({ data: { nodeId: start.id, kind: "BASE", text: "" } });
  await db.realm.update({ where: { id: realm.id }, data: { startNodeId: start.id } });
  await audit(admin.id, "realm.create", { type: "realm", id: realm.id }, { name });
  redirect(`/admin/realms/${realm.id}`);
}

const infoSchema = z.object({
  name: z.string().trim().min(1, "이름을 입력하세요.").max(40),
  intro: z.string().trim().max(3000),
  mapX: z.coerce.number().min(0).max(100),
  mapY: z.coerce.number().min(0).max(100),
  startNodeId: z.string().min(1, "시작 노드를 고르세요."),
  isPublished: z.boolean(),
  kind: z.enum(["FIXED", "INSTANT"]),
  spawnIntervalHours: z.coerce.number().int().min(1).max(720),
  maxConcurrent: z.coerce.number().int().min(1).max(20),
});

export async function saveRealmInfoAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const parsed = infoSchema.safeParse({
    name: formData.get("name"), intro: formData.get("intro") ?? "", mapX: formData.get("mapX"), mapY: formData.get("mapY"),
    startNodeId: formData.get("startNodeId"), isPublished: formData.get("isPublished") === "on",
    kind: formData.get("kind") ?? "FIXED", spawnIntervalHours: formData.get("spawnIntervalHours") || 24, maxConcurrent: formData.get("maxConcurrent") || 2,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const node = await db.node.findFirst({ where: { id: parsed.data.startNodeId, realmId: id } });
  if (!node) return { error: "시작 노드가 이 이계의 노드가 아닙니다." };
  const current = await db.realm.findUnique({ where: { id } });
  if (current?.templateId) return { error: "인스턴스는 기본 정보를 바꿀 수 없습니다. 템플릿을 고치세요." };
  await db.realm.update({ where: { id }, data: { ...parsed.data, isTemplate: parsed.data.kind === "INSTANT" } });
  await audit(admin.id, "realm.update", { type: "realm", id }, { name: parsed.data.name, isPublished: parsed.data.isPublished });
  revalidatePath(`/admin/realms/${id}`);
  revalidatePath("/map");
  return { success: "저장했습니다." };
}

export async function deleteRealmAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const realm = await db.realm.findUnique({ where: { id } });
  if (!realm) return;
  await db.realm.delete({ where: { id } });
  await audit(admin.id, "realm.delete", { type: "realm", id }, { name: realm.name });
  revalidatePath("/admin/realms");
  redirect("/admin/realms");
}

/** 서버 공개 노드를 모두 미공개로 되돌린다 (확인 창 필수) */
export async function resetRevealsAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const r = await db.node.updateMany({ where: { realmId: id }, data: { revealedAt: null, revealedById: null } });
  await audit(admin.id, "realm.resetReveals", { type: "realm", id }, { nodes: r.count });
  revalidatePath(`/admin/realms/${id}`);
  revalidatePath("/map");
}

// ───────────── 그래프 (노드 위치·연결) ─────────────

export async function addNodeAction(realmId: string, posX: number, posY: number) {
  await requireAdmin();
  const count = await db.node.count({ where: { realmId } });
  const node = await db.node.create({ data: { realmId, name: `노드 ${count + 1}`, depth: 1, posX, posY } });
  await db.scene.create({ data: { nodeId: node.id, kind: "BASE", text: "" } });
  revalidatePath(`/admin/realms/${realmId}`);
  return node.id;
}

export async function moveNodesAction(realmId: string, positions: { id: string; x: number; y: number }[]) {
  await requireAdmin();
  await db.$transaction(positions.map((p) => db.node.updateMany({ where: { id: p.id, realmId }, data: { posX: p.x, posY: p.y } })));
}

export async function addEdgeAction(realmId: string, fromId: string, toId: string) {
  await requireAdmin();
  if (fromId === toId) return null;
  const nodes = await db.node.count({ where: { realmId, id: { in: [fromId, toId] } } });
  if (nodes !== 2) return null;
  const dup = await db.edge.findFirst({ where: { realmId, OR: [{ fromId, toId }, { fromId: toId, toId: fromId }] } });
  if (dup) return dup.id;
  const edge = await db.edge.create({ data: { realmId, fromId, toId, bidirectional: true } });
  revalidatePath(`/admin/realms/${realmId}`);
  return edge.id;
}

export async function deleteEdgeAction(realmId: string, edgeId: string) {
  await requireAdmin();
  await db.edge.deleteMany({ where: { id: edgeId, realmId } });
  revalidatePath(`/admin/realms/${realmId}`);
}

export async function deleteNodeAction(formData: FormData) {
  const admin = await requireAdmin();
  const realmId = String(formData.get("realmId") ?? "");
  const nodeId = String(formData.get("nodeId") ?? "");
  const realm = await db.realm.findUnique({ where: { id: realmId } });
  if (!realm) return;
  if (realm.startNodeId === nodeId) return; // 시작 노드는 지울 수 없음
  const node = await db.node.findFirst({ where: { id: nodeId, realmId } });
  if (!node) return;
  await db.node.delete({ where: { id: nodeId } });
  await audit(admin.id, "node.delete", { type: "node", id: nodeId }, { realm: realm.name, name: node.name });
  revalidatePath(`/admin/realms/${realmId}`);
  redirect(`/admin/realms/${realmId}`);
}


/** 템플릿에서 인스턴스를 지금 생성 */
export async function spawnNowAction(formData: FormData) {
  const admin = await requireAdmin();
  const templateId = String(formData.get("templateId") ?? "");
  const { spawnInstance } = await import("@/lib/instant");
  await spawnInstance(templateId, admin.id);
  revalidatePath("/admin/realms");
  revalidatePath("/map");
}

/** 인스턴스 제거 (진행 중 런은 강제 종료) */
export async function removeInstanceAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const realm = await db.realm.findUnique({ where: { id } });
  if (!realm || !realm.templateId) return;
  const { abortRun } = await import("@/lib/engine/engine");
  const active = await db.run.findMany({ where: { realmId: id, status: "ACTIVE" } });
  for (const r of active) await abortRun(r.id);
  await db.realm.delete({ where: { id } });
  await audit(admin.id, "instant.remove", { type: "realm", id }, { name: realm.name });
  revalidatePath("/admin/realms");
  revalidatePath("/map");
}
