"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireCharacterUser } from "@/lib/auth";
import { getConfig } from "@/lib/game-config";
import type { FormState } from "@/components/ActionForm";

const schema = z.object({
  title: z.string().trim().min(1, "이계 이름을 입력하세요.").max(60),
  atmosphere: z.string().trim().min(30, "분위기를 30자 이상 적어 주세요.").max(5000),
  master: z.string().trim().min(30, "주인의 설정을 30자 이상 적어 주세요.").max(5000),
  anomalies: z.string().trim().min(30, "이상현상을 30자 이상 적어 주세요.").max(8000),
  extra: z.string().trim().max(5000),
});

export async function applySpecialAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { character } = await requireCharacterUser();
  const cfg = await getConfig();
  const parsed = schema.safeParse({ title: formData.get("title"), atmosphere: formData.get("atmosphere"), master: formData.get("master"), anomalies: formData.get("anomalies"), extra: formData.get("extra") ?? "" });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const pending = await db.specialApplication.count({ where: { characterId: character.id, status: "PENDING" } });
  if (pending >= cfg["special.maxPending"]) return { error: `심사 중인 신청은 ${cfg["special.maxPending"]}건까지입니다.` };
  const app = await db.$transaction(async (tx) => {
    const post = await tx.post.create({ data: { kind: "REPORT", authorId: character.id, title: parsed.data.title, body: "" } });
    return tx.specialApplication.create({ data: { ...parsed.data, characterId: character.id, postId: post.id } });
  });
  revalidatePath("/map/special");
  redirect(`/map/special/${app.id}`);
}

export async function withdrawSpecialAction(formData: FormData) {
  const { character } = await requireCharacterUser();
  const id = String(formData.get("id") ?? "");
  const app = await db.specialApplication.findUnique({ where: { id } });
  if (!app || app.characterId !== character.id || app.status !== "PENDING") return;
  await db.specialApplication.delete({ where: { id } });
  await db.post.deleteMany({ where: { id: app.postId } });
  revalidatePath("/map/special");
}
