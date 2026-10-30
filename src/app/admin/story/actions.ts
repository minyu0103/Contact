"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { fireStoryEvent } from "@/lib/story";
import type { FormState } from "@/components/ActionForm";

const schema = z.object({
  title: z.string().trim().min(1, "제목을 입력하세요.").max(80),
  body: z.string().trim().max(5000),
  bannerText: z.string().trim().max(200),
  bannerDays: z.coerce.number().int().min(0).max(365),
  conditionType: z.enum(["REALM_PROGRESS", "SERVER_ESCAPES", "DATE", "MANUAL"]),
  realmId: z.string().transform((v) => v || null),
  threshold: z.coerce.number().int().min(0),
  triggerAt: z.string().transform((v) => (v ? new Date(v + "+09:00") : null)),
  rewardPoints: z.coerce.number().int().min(0),
  rewardItemId: z.string().transform((v) => v || null),
  rewardQty: z.coerce.number().int().min(1),
  publishRealmId: z.string().transform((v) => v || null),
  isActive: z.boolean(),
});

export async function saveStoryAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const parsed = schema.safeParse({
    title: formData.get("title"), body: formData.get("body") ?? "", bannerText: formData.get("bannerText") ?? "", bannerDays: formData.get("bannerDays") || 3,
    conditionType: formData.get("conditionType"), realmId: formData.get("realmId") ?? "", threshold: formData.get("threshold") || 0, triggerAt: formData.get("triggerAt") ?? "",
    rewardPoints: formData.get("rewardPoints") || 0, rewardItemId: formData.get("rewardItemId") ?? "", rewardQty: formData.get("rewardQty") || 1, publishRealmId: formData.get("publishRealmId") ?? "", isActive: formData.get("isActive") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  if (d.conditionType === "REALM_PROGRESS" && !d.realmId) return { error: "진행도 조건에는 이계를 골라야 합니다." };
  if (d.conditionType === "DATE" && !d.triggerAt) return { error: "발동 시각을 입력하세요." };
  if (id) await db.storyEvent.update({ where: { id }, data: d }); else await db.storyEvent.create({ data: d });
  await audit(admin.id, "story.save", { type: "story", id }, { title: d.title, conditionType: d.conditionType });
  revalidatePath("/admin/story");
  return { success: "저장했습니다." };
}

export async function deleteStoryAction(formData: FormData) {
  await requireAdmin();
  await db.storyEvent.deleteMany({ where: { id: String(formData.get("id") ?? "") } });
  revalidatePath("/admin/story");
}

export async function fireNowAction(formData: FormData) {
  const admin = await requireAdmin();
  await fireStoryEvent(String(formData.get("id") ?? ""), admin.id);
  revalidatePath("/", "layout");
}

export async function resetStoryAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  await db.storyEvent.update({ where: { id }, data: { firedAt: null } });
  await audit(admin.id, "story.reset", { type: "story", id });
  revalidatePath("/admin/story");
}
