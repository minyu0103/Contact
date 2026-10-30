"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import type { FormState } from "@/components/ActionForm";
import type { Prisma } from "@prisma/client";

const bonusSchema = z.array(z.discriminatedUnion("type", [
  z.object({ type: z.literal("run_check_bonus"), checkType: z.enum(["OWN", "ALL", "COMBAT", "SEARCH", "CRAFT", "GENERAL"]), value: z.number().int() }),
  z.object({ type: z.literal("run_extra_dice"), checkType: z.enum(["OWN", "ALL", "COMBAT", "SEARCH", "CRAFT", "GENERAL"]), value: z.number().int().min(1) }),
  z.object({ type: z.literal("narrative"), text: z.string().max(200) }),
]));

export async function saveTraitAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const tag = String(formData.get("tag") ?? "").trim().slice(0, 30);
  const description = String(formData.get("description") ?? "").trim().slice(0, 300);
  if (!tag) return { error: "태그 이름을 입력하세요." };
  let raw: unknown; try { raw = JSON.parse(String(formData.get("effects") ?? "[]")); } catch { return { error: "효과 형식 오류" }; }
  const eff = bonusSchema.safeParse(raw);
  if (!eff.success) return { error: "특성 보너스는 판정 보정·다이스 추가·서술만 가능합니다." };
  const dup = await db.factorTrait.findUnique({ where: { tag } });
  if (dup && dup.id !== id) return { error: "이미 있는 태그입니다." };
  const data = { tag, description, bonusEffects: eff.data as Prisma.InputJsonValue };
  if (id) await db.factorTrait.update({ where: { id }, data }); else await db.factorTrait.create({ data });
  await audit(admin.id, "trait.save", { type: "trait", id }, { tag });
  revalidatePath("/admin/craft");
  return { success: "저장했습니다." };
}

export async function deleteTraitAction(formData: FormData) {
  await requireAdmin();
  await db.factorTrait.deleteMany({ where: { id: String(formData.get("id") ?? "") } });
  revalidatePath("/admin/craft");
}

export async function saveRecipeAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim().slice(0, 40);
  const baseItemId = String(formData.get("baseItemId") ?? "");
  const resultItemId = String(formData.get("resultItemId") ?? "");
  const checkTarget = Math.min(30, Math.max(2, Math.trunc(Number(formData.get("checkTarget")) || 7)));
  if (!name || !baseItemId || !resultItemId) return { error: "이름, 기본 아이템, 결과 장비를 모두 고르세요." };
  const result = await db.item.findUnique({ where: { id: resultItemId } });
  if (!result || result.category !== "EQUIPMENT") return { error: "결과 아이템은 분류가 '장비'여야 합니다." };
  const data = { name, baseItemId, resultItemId, checkTarget };
  if (id) await db.recipe.update({ where: { id }, data }); else await db.recipe.create({ data });
  await audit(admin.id, "recipe.save", { type: "recipe", id }, { name });
  revalidatePath("/admin/craft");
  return { success: "저장했습니다." };
}

export async function deleteRecipeAction(formData: FormData) {
  await requireAdmin();
  await db.recipe.deleteMany({ where: { id: String(formData.get("id") ?? "") } });
  revalidatePath("/admin/craft");
}
