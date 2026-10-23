"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { SETTING_DEFS, coerceSettingValue, getConfig } from "@/lib/game-config";
import type { FormState } from "@/components/ActionForm";

export async function saveSettingsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const before = await getConfig();
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  for (const def of SETTING_DEFS) {
    const raw = formData.get(def.key);
    const value = coerceSettingValue(def, typeof raw === "string" ? raw : null);
    if (value !== before[def.key]) {
      changes[def.key] = { from: before[def.key], to: value };
      await db.setting.upsert({ where: { key: def.key }, update: { value }, create: { key: def.key, value } });
    }
  }
  const n = Object.keys(changes).length;
  if (n > 0) await audit(admin.id, "settings.update", { type: "settings" }, JSON.parse(JSON.stringify(changes)));
  revalidatePath("/", "layout");
  return { success: n > 0 ? `${n}개 항목을 저장했습니다.` : "바뀐 항목이 없습니다." };
}

export async function resetSettingAction(formData: FormData) {
  const admin = await requireAdmin();
  const key = String(formData.get("key") ?? "");
  const def = SETTING_DEFS.find((d) => d.key === key);
  if (!def) return;
  await db.setting.deleteMany({ where: { key } });
  await audit(admin.id, "settings.reset", { type: "settings", id: key }, { to: def.default });
  revalidatePath("/admin/settings");
}
