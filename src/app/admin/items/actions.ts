"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { saveImage } from "@/lib/upload";
import type { FormState } from "@/components/ActionForm";
import type { Prisma } from "@prisma/client";

const checkTarget = z.enum(["OWN", "ALL", "COMBAT", "SEARCH", "CRAFT", "GENERAL"]);
const effectSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("hp"), value: z.number().int() }),
  z.object({ type: z.literal("mp"), value: z.number().int() }),
  z.object({ type: z.literal("erosion"), value: z.number().int() }),
  z.object({ type: z.literal("run_check_bonus"), checkType: checkTarget, value: z.number().int() }),
  z.object({ type: z.literal("run_extra_dice"), checkType: checkTarget, value: z.number().int().min(1) }),
  z.object({ type: z.literal("escape") }),
  z.object({ type: z.literal("camera") }),
  z.object({ type: z.literal("extractor") }),
  z.object({ type: z.literal("narrative"), text: z.string().max(200) }),
]);

const schema = z.object({
  name: z.string().trim().min(1, "이름을 입력하세요.").max(40),
  description: z.string().trim().max(1000),
  category: z.enum(["CONSUMABLE", "INFECTED", "MATERIAL", "KEY", "EQUIPMENT", "FACTOR"]),
  traitTag: z.string().trim().max(30),
  usableIn: z.enum(["BOTH", "RUN", "OUTSIDE"]),
  stackLimit: z.coerce.number().int().min(1).max(9999),
  shopEnabled: z.boolean(),
  price: z.coerce.number().int().min(0),
  minLevel: z.coerce.number().int().min(0),
  minEscapes: z.coerce.number().int().min(0),
  sellPrice: z.coerce.number().int().min(0),
  sortOrder: z.coerce.number().int(),
  effects: z.array(effectSchema),
});

function parseForm(formData: FormData) {
  let effects: unknown = [];
  try { effects = JSON.parse(String(formData.get("effects") ?? "[]")); } catch { /* 아래 검증에서 걸림 */ }
  return schema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    category: formData.get("category"),
    usableIn: formData.get("usableIn"),
    stackLimit: formData.get("stackLimit"),
    shopEnabled: formData.get("shopEnabled") === "on",
    price: formData.get("price"),
    minLevel: formData.get("minLevel"),
    minEscapes: formData.get("minEscapes"),
    sellPrice: formData.get("sellPrice"),
    sortOrder: formData.get("sortOrder") ?? 0,
    traitTag: formData.get("traitTag") ?? "",
    effects,
  });
}

export async function saveItemAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const parsed = parseForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message + (parsed.error.issues[0].path.length ? ` (${parsed.error.issues[0].path.join(".")})` : "") };

  let imageUrl: string | null | undefined;
  try {
    const file = formData.get("image");
    const uploaded = await saveImage(file instanceof File ? file : null, "items");
    if (uploaded) imageUrl = uploaded;
    if (formData.get("removeImage") === "on") imageUrl = null;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "이미지 업로드 실패" };
  }

  const data = { ...parsed.data, effects: parsed.data.effects as Prisma.InputJsonValue, ...(imageUrl !== undefined ? { imageUrl } : {}) };
  if (id) {
    await db.item.update({ where: { id }, data });
    await audit(admin.id, "item.update", { type: "item", id }, { name: data.name });
    revalidatePath("/admin/items");
    return { success: "저장했습니다." };
  }
  const item = await db.item.create({ data });
  await audit(admin.id, "item.create", { type: "item", id: item.id }, { name: item.name });
  revalidatePath("/admin/items");
  redirect(`/admin/items/${item.id}`);
}

export async function deleteItemAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const item = await db.item.findUnique({ where: { id } });
  if (!item) return;
  await db.item.delete({ where: { id } });
  await audit(admin.id, "item.delete", { type: "item", id }, { name: item.name });
  revalidatePath("/admin/items");
  redirect("/admin/items");
}
