"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import type { FormState } from "@/components/ActionForm";

export async function reviewLogAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = String(formData.get("logId") ?? "");
  const intent = String(formData.get("intent") ?? "");
  const reward = Math.max(0, Math.trunc(Number(formData.get("reward")) || 0));
  const comment = String(formData.get("comment") ?? "").trim().slice(0, 1000);
  const log = await db.explorationLog.findUnique({ where: { id }, include: { character: true } });
  if (!log) return { error: "로그를 찾을 수 없습니다." };
  if (intent === "approve") {
    const delta = reward - log.rewardPaid; // 이미 지급분이 있으면 차액만
    await db.$transaction([
      db.explorationLog.update({ where: { id }, data: { status: "APPROVED", rewardPaid: reward, adminComment: comment, reviewedAt: new Date() } }),
      ...(delta !== 0 ? [db.character.update({ where: { id: log.characterId }, data: { points: { increment: delta } } })] : []),
    ]);
    await audit(admin.id, "log.approve", { type: "log", id }, { character: log.character.name, title: log.title, reward });
    revalidatePath("/", "layout");
    return { success: `승인하고 ${reward}P를 지급했습니다.` };
  }
  if (intent === "reject") {
    if (!comment) return { error: "반려할 때는 코멘트를 적어 주세요." };
    const delta = -log.rewardPaid;
    await db.$transaction([
      db.explorationLog.update({ where: { id }, data: { status: "REJECTED", rewardPaid: 0, adminComment: comment, reviewedAt: new Date() } }),
      ...(delta !== 0 ? [db.character.update({ where: { id: log.characterId }, data: { points: { increment: delta } } })] : []),
    ]);
    await audit(admin.id, "log.reject", { type: "log", id }, { character: log.character.name, title: log.title });
    revalidatePath("/", "layout");
    return { success: "반려했습니다." };
  }
  return { error: "잘못된 요청입니다." };
}
