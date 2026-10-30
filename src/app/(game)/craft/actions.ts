"use server";

import { revalidatePath } from "next/cache";
import { requireCharacterUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { CraftError, craftItem, equipItem, extractFactor, unequipSlot } from "@/lib/craft";
import type { FormState } from "@/components/ActionForm";

async function guardNoRun(characterId: string) {
  if (await db.run.findFirst({ where: { characterId, status: "ACTIVE", isTest: false } })) throw new CraftError("탐사 중에는 할 수 없습니다.");
}

export async function extractAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { character } = await requireCharacterUser();
  try {
    await guardNoRun(character.id);
    const r = await extractFactor(character.id, String(formData.get("itemId") ?? ""));
    revalidatePath("/", "layout");
    return r.success ? { success: `추출 성공 (${r.chance}%): ${r.factorName} 획득` } : { error: `추출 실패 (${r.chance}%). 감염물이 인자와 함께 흩어졌다.` };
  } catch (e) { if (e instanceof CraftError) return { error: e.message }; throw e; }
}

export async function craftAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { character } = await requireCharacterUser();
  try {
    await guardNoRun(character.id);
    const r = await craftItem(character.id, String(formData.get("recipeId") ?? ""), formData.getAll("factorIds").map(String).filter(Boolean));
    revalidatePath("/", "layout");
    const dice = `주사위 [${r.check.dice.join(", ")}]${r.check.modifiers.map((m) => ` ${m.value >= 0 ? "+" : ""}${m.value}(${m.label})`).join("")} = ${r.check.total} vs ${r.check.target}`;
    return r.check.success ? { success: `제작 성공. ${dice}. ${r.resultName} ×${r.count} 획득` } : { error: `제작 실패. ${dice}. 인자가 흩어졌다 (기본 아이템은 남음).` };
  } catch (e) { if (e instanceof CraftError) return { error: e.message }; throw e; }
}

export async function equipAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { character } = await requireCharacterUser();
  try {
    await guardNoRun(character.id);
    await equipItem(character.id, String(formData.get("itemId") ?? ""), Number(formData.get("slot")) || 1);
    revalidatePath("/", "layout");
    return { success: "착용했습니다." };
  } catch (e) { if (e instanceof CraftError) return { error: e.message }; throw e; }
}

export async function unequipAction(formData: FormData) {
  const { character } = await requireCharacterUser();
  try { await guardNoRun(character.id); } catch { return; }
  await unequipSlot(character.id, Number(formData.get("slot")) || 1);
  revalidatePath("/", "layout");
}
