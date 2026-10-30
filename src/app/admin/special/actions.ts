"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import type { FormState } from "@/components/ActionForm";

/** 승인: 신청자 전용 특수형 이계를 만들고(비공개, 편집기에서 완성) 신청을 승인 상태로 */
export async function approveSpecialAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const comment = String(formData.get("comment") ?? "").trim().slice(0, 1000);
  const a = await db.specialApplication.findUnique({ where: { id }, include: { character: true } });
  if (!a) return { error: "신청을 찾을 수 없습니다." };
  if (a.realmId) return { error: "이미 이계가 만들어져 있습니다." };
  const realmId = await db.$transaction(async (tx) => {
    const realm = await tx.realm.create({ data: { name: a.title, kind: "SPECIAL", intro: a.atmosphere, isPublished: false, applicantId: a.characterId, mapX: 50, mapY: 50 } });
    const start = await tx.node.create({ data: { realmId: realm.id, name: "입구", description: a.atmosphere.slice(0, 500), depth: 1, isExit: true } });
    await tx.scene.create({ data: { nodeId: start.id, kind: "BASE", text: "" } });
    await tx.realm.update({ where: { id: realm.id }, data: { startNodeId: start.id } });
    await tx.specialApplication.update({ where: { id }, data: { status: "APPROVED", adminComment: comment, realmId: realm.id, reviewedAt: new Date() } });
    return realm.id;
  });
  await audit(admin.id, "special.approve", { type: "special", id }, { title: a.title, applicant: a.character.name, realmId });
  revalidatePath("/", "layout");
  redirect(`/admin/realms/${realmId}`);
}

export async function rejectSpecialAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const comment = String(formData.get("comment") ?? "").trim().slice(0, 1000);
  if (!comment) return { error: "반려할 때는 코멘트를 적어 주세요." };
  const a = await db.specialApplication.update({ where: { id }, data: { status: "REJECTED", adminComment: comment, reviewedAt: new Date() } });
  await audit(admin.id, "special.reject", { type: "special", id }, { title: a.title });
  revalidatePath("/", "layout");
  return { success: "반려했습니다." };
}

export async function paySpecialRewardAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const reward = Math.max(0, Math.trunc(Number(formData.get("reward")) || 0));
  const a = await db.specialApplication.findUnique({ where: { id } });
  if (!a) return { error: "신청을 찾을 수 없습니다." };
  const delta = reward - a.rewardPaid;
  await db.$transaction([
    db.specialApplication.update({ where: { id }, data: { rewardPaid: reward } }),
    ...(delta !== 0 ? [db.character.update({ where: { id: a.characterId }, data: { points: { increment: delta } } })] : []),
  ]);
  await audit(admin.id, "special.reward", { type: "special", id }, { title: a.title, reward, delta });
  revalidatePath("/", "layout");
  return { success: `보수를 ${reward}P로 맞췄습니다 (차액 ${delta >= 0 ? "+" : ""}${delta}P).` };
}

export async function togglePublicAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const a = await db.specialApplication.findUnique({ where: { id } });
  if (!a) return;
  await db.specialApplication.update({ where: { id }, data: { isReportPublic: !a.isReportPublic } });
  await audit(admin.id, "special.public", { type: "special", id }, { isReportPublic: !a.isReportPublic });
  revalidatePath("/", "layout");
}

/** 1등 선정: 보고서 공개, 이계를 모두에게 개방(정식 공략 루트) */
export async function setWinnerAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const a = await db.specialApplication.findUnique({ where: { id } });
  if (!a) return;
  const next = !a.isWinner;
  await db.$transaction([
    db.specialApplication.update({ where: { id }, data: { isWinner: next, isReportPublic: next ? true : a.isReportPublic } }),
    ...(a.realmId ? [db.realm.update({ where: { id: a.realmId }, data: { applicantId: next ? null : a.characterId, isPublished: next ? true : undefined } })] : []),
  ]);
  await audit(admin.id, "special.winner", { type: "special", id }, { title: a.title, isWinner: next });
  revalidatePath("/", "layout");
}
