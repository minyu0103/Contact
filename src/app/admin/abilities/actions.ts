"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import type { FormState } from "@/components/ActionForm";

const effectSchema = z.object({
  type: z.enum(["CHECK_BONUS", "EXTRA_DICE", "AUTO_SUCCESS", "TELEPORT", "CRAFT_DOUBLE", "NARRATIVE"]),
  checkType: z.enum(["COMBAT", "SEARCH", "CRAFT", "GENERAL"]).nullable(),
  value: z.coerce.number().int(),
  perDay: z.coerce.number().int().min(0),
  note: z.string().max(200),
});

const schema = z.object({
  category: z.enum(["COMBAT", "SEARCH", "PRODUCTION", "SPECIAL"]),
  proficiencyCheckType: z.enum(["COMBAT", "SEARCH", "CRAFT", "GENERAL", ""]).transform((v) => (v === "" ? null : v)),
  proficiency: z.coerce.number().int().min(1).max(5),
  comment: z.string().max(2000),
  effects: z.array(effectSchema),
  tagIds: z.array(z.string()),
  intent: z.enum(["save", "approve", "return"]),
});

export async function reviewAbilityAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  let effects: unknown = [];
  try { effects = JSON.parse(String(formData.get("effects") ?? "[]")); } catch { return { error: "효과 형식이 잘못되었습니다." }; }
  const parsed = schema.safeParse({
    category: formData.get("category"),
    proficiencyCheckType: formData.get("proficiencyCheckType") ?? "",
    proficiency: formData.get("proficiency"),
    comment: formData.get("comment") ?? "",
    effects,
    tagIds: formData.getAll("tagIds").map(String),
    intent: formData.get("intent"),
  });
  if (!parsed.success) return { error: `입력을 확인하세요: ${parsed.error.issues[0].path.join(".")} ${parsed.error.issues[0].message}` };
  const d = parsed.data;
  const c = await db.character.findUnique({ where: { id } });
  if (!c) return { error: "캐릭터를 찾을 수 없습니다." };
  if (d.intent === "return" && !d.comment.trim()) return { error: "반려할 때는 코멘트를 적어 주세요." };

  const status = d.intent === "approve" ? "ACTIVE" : d.intent === "return" ? "RETURNED" : c.abilityStatus;
  await db.$transaction([
    db.character.update({
      where: { id },
      data: {
        category: d.category,
        proficiencyCheckType: d.category === "SPECIAL" ? d.proficiencyCheckType : null,
        proficiency: d.proficiency,
        abilityComment: d.comment.trim(),
        abilityStatus: status,
      },
    }),
    db.abilityEffect.deleteMany({ where: { characterId: id } }),
    db.abilityEffect.createMany({ data: d.effects.map((e, i) => ({ characterId: id, type: e.type, checkType: e.checkType, value: e.value, perDay: e.perDay, note: e.note, sortOrder: i })) }),
    db.characterTag.deleteMany({ where: { characterId: id } }),
    db.characterTag.createMany({ data: d.tagIds.map((tagId) => ({ characterId: id, tagId })), skipDuplicates: true }),
  ]);
  await audit(admin.id, `ability.${d.intent}`, { type: "character", id }, { name: c.name, status, category: d.category, proficiency: d.proficiency, effects: d.effects.length, tags: d.tagIds.length });
  revalidatePath("/admin/abilities");
  revalidatePath(`/admin/abilities/${id}`);
  revalidatePath("/admin", "layout");
  return { success: d.intent === "approve" ? "승인했습니다. 능력이 활성 상태가 되었습니다." : d.intent === "return" ? "반려했습니다. 유저에게 코멘트가 표시됩니다." : "저장했습니다 (상태 변경 없음)." };
}
