"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import type { FormState } from "@/components/ActionForm";

export async function createTagAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "태그 이름을 입력하세요." };
  if (name.length > 20) return { error: "태그 이름은 20자 이하여야 합니다." };
  if (await db.abilityTag.findUnique({ where: { name } })) return { error: "이미 있는 태그입니다." };
  const tag = await db.abilityTag.create({ data: { name } });
  await audit(admin.id, "tag.create", { type: "tag", id: tag.id }, { name });
  revalidatePath("/admin/tags");
  return { success: `태그 "${name}"을(를) 추가했습니다.` };
}

export async function renameTagAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name) return;
  const before = await db.abilityTag.findUnique({ where: { id } });
  if (!before || before.name === name) return;
  if (await db.abilityTag.findUnique({ where: { name } })) return;
  await db.abilityTag.update({ where: { id }, data: { name } });
  await audit(admin.id, "tag.rename", { type: "tag", id }, { from: before.name, to: name });
  revalidatePath("/admin/tags");
}

export async function deleteTagAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const tag = await db.abilityTag.findUnique({ where: { id } });
  if (!tag) return;
  await db.abilityTag.delete({ where: { id } });
  await audit(admin.id, "tag.delete", { type: "tag", id }, { name: tag.name });
  revalidatePath("/admin/tags");
}
