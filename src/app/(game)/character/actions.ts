"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireCharacterUser, hashPassword, verifyPassword } from "@/lib/auth";
import { saveImage } from "@/lib/upload";
import { audit } from "@/lib/audit";
import { EngineError, consumeItemOutside } from "@/lib/engine/engine";
import type { FormState } from "@/components/ActionForm";

export async function updateProfileAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { character } = await requireCharacterUser();
  let imageUrl: string | null | undefined;
  try {
    const file = formData.get("image");
    const uploaded = await saveImage(file instanceof File ? file : null, "profiles");
    if (uploaded) imageUrl = uploaded;
    if (formData.get("removeImage") === "on") imageUrl = null;
  } catch (e) { return { error: e instanceof Error ? e.message : "이미지 업로드 실패" }; }
  if (imageUrl === undefined) return { error: "바꿀 이미지를 고르세요." };
  await db.character.update({ where: { id: character.id }, data: { imageUrl } });
  revalidatePath("/", "layout");
  return { success: "프로필 이미지를 바꿨습니다." };
}

export async function changePasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { user } = await requireCharacterUser();
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (!(await verifyPassword(current, user.passwordHash))) return { error: "현재 비밀번호가 틀립니다." };
  if (next.length < 6) return { error: "새 비밀번호는 6자 이상이어야 합니다." };
  if (next !== confirm) return { error: "새 비밀번호 확인이 일치하지 않습니다." };
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next) } });
  return { success: "비밀번호를 바꿨습니다." };
}

const abilitySchema = z.object({
  abilityName: z.string().trim().min(1, "능력 이름을 입력하세요.").max(40),
  abilityDesc: z.string().trim().min(10, "능력 서술을 10자 이상 적어 주세요.").max(3000),
});

export async function resubmitAbilityAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { user, character } = await requireCharacterUser();
  if (character.abilityStatus !== "RETURNED") return { error: "반려된 상태에서만 다시 제출할 수 있습니다." };
  const parsed = abilitySchema.safeParse({ abilityName: formData.get("abilityName"), abilityDesc: formData.get("abilityDesc") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  await db.character.update({ where: { id: character.id }, data: { ...parsed.data, abilityStatus: "PENDING" } });
  await audit(user.id, "ability.resubmit", { type: "character", id: character.id }, { name: character.name });
  revalidatePath("/", "layout");
  return { success: "다시 제출했습니다. 심사 중 상태가 됩니다." };
}

export async function allocateStatAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { user, character } = await requireCharacterUser();
  const stat = String(formData.get("stat") ?? "");
  if (stat !== "hp" && stat !== "mp") return { error: "잘못된 항목입니다." };
  const result = await db.$transaction(async (tx) => {
    const c = await tx.character.findUnique({ where: { id: character.id } });
    if (!c || c.statPoints <= 0) return { error: "배분할 스탯 포인트가 없습니다." };
    await tx.character.update({ where: { id: c.id }, data: stat === "hp" ? { maxHp: { increment: 1 }, hp: { increment: 1 }, statPoints: { decrement: 1 } } : { maxMp: { increment: 1 }, mp: { increment: 1 }, statPoints: { decrement: 1 } } });
    return { success: stat === "hp" ? "최대 체력 +1" : "최대 정신력 +1" };
  });
  await audit(user.id, "character.allocate", { type: "character", id: character.id }, { stat });
  revalidatePath("/", "layout");
  return result;
}

export async function useItemAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { character } = await requireCharacterUser();
  const itemId = String(formData.get("itemId") ?? "");
  if (await db.run.findFirst({ where: { characterId: character.id, status: "ACTIVE", isTest: false } })) return { error: "탐사 중에는 탐사 화면에서 사용하세요." };
  try {
    const deltas = await consumeItemOutside(character.id, itemId);
    revalidatePath("/", "layout");
    return { success: deltas.map((d) => `${d.label} ${d.value !== undefined && d.value > 0 ? "+" : ""}${d.value ?? d.text}`).join(", ") };
  } catch (e) {
    if (e instanceof EngineError) return { error: e.message };
    throw e;
  }
}

export async function discardItemAction(formData: FormData) {
  const { character } = await requireCharacterUser();
  const itemId = String(formData.get("itemId") ?? "");
  await db.inventoryItem.deleteMany({ where: { characterId: character.id, itemId } });
  await db.equippedItem.deleteMany({ where: { characterId: character.id, itemId } });
  revalidatePath("/character");
}
