"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import type { FormState } from "@/components/ActionForm";

export async function createDropTableAction(formData: FormData) {
  const admin = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim().slice(0, 40) || "새 드랍 테이블";
  const t = await db.dropTable.create({ data: { name } });
  await audit(admin.id, "droptable.create", { type: "droptable", id: t.id }, { name });
  redirect(`/admin/drop-tables/${t.id}`);
}

const entrySchema = z.object({
  itemId: z.string(),
  weight: z.coerce.number().int().min(0),
  minQty: z.coerce.number().int().min(1),
  maxQty: z.coerce.number().int().min(1),
});

export async function saveDropTableAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "테이블 이름을 입력하세요." };
  let raw: unknown = [];
  try { raw = JSON.parse(String(formData.get("entries") ?? "[]")); } catch { return { error: "항목 형식이 잘못되었습니다." }; }
  const parsed = z.array(entrySchema).safeParse(raw);
  if (!parsed.success) return { error: "항목 값을 확인하세요 (가중치 0 이상, 수량 1 이상)." };
  const entries = parsed.data.map((e) => ({ ...e, maxQty: Math.max(e.minQty, e.maxQty) }));
  if (entries.some((e) => e.weight > 0) === false && entries.length > 0) return { error: "가중치가 0보다 큰 항목이 하나는 있어야 합니다." };
  const itemIds = entries.map((e) => e.itemId).filter(Boolean);
  const found = await db.item.count({ where: { id: { in: itemIds } } });
  if (found !== new Set(itemIds).size) return { error: "존재하지 않는 아이템이 포함되어 있습니다." };

  await db.$transaction([
    db.dropTable.update({ where: { id }, data: { name: name.slice(0, 40) } }),
    db.dropEntry.deleteMany({ where: { tableId: id } }),
    db.dropEntry.createMany({ data: entries.map((e) => ({ tableId: id, itemId: e.itemId || null, weight: e.weight, minQty: e.minQty, maxQty: e.maxQty })) }),
  ]);
  await audit(admin.id, "droptable.update", { type: "droptable", id }, { name, entries: entries.length });
  revalidatePath("/admin/drop-tables");
  return { success: "저장했습니다." };
}

export async function deleteDropTableAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const t = await db.dropTable.findUnique({ where: { id } });
  if (!t) return;
  await db.dropTable.delete({ where: { id } });
  await audit(admin.id, "droptable.delete", { type: "droptable", id }, { name: t.name });
  revalidatePath("/admin/drop-tables");
  redirect("/admin/drop-tables");
}
