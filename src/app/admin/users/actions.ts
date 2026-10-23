"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin, hashPassword } from "@/lib/auth";
import { audit } from "@/lib/audit";
import type { FormState } from "@/components/ActionForm";

const statsSchema = z.object({
  hp: z.coerce.number().int().min(0),
  maxHp: z.coerce.number().int().min(1),
  mp: z.coerce.number().int().min(0),
  maxMp: z.coerce.number().int().min(1),
  erosion: z.coerce.number().int().min(0),
  ap: z.coerce.number().int().min(0),
  points: z.coerce.number().int().min(0),
  level: z.coerce.number().int().min(1),
  exp: z.coerce.number().int().min(0),
  statPoints: z.coerce.number().int().min(0),
  proficiency: z.coerce.number().int().min(1).max(5),
  proficiencyExp: z.coerce.number().int().min(0),
  escapeCount: z.coerce.number().int().min(0),
});

const STAT_LABEL: Record<keyof z.infer<typeof statsSchema>, string> = {
  hp: "체력", maxHp: "최대 체력", mp: "정신력", maxMp: "최대 정신력", erosion: "침식률", ap: "행동력", points: "P",
  level: "레벨", exp: "경험치", statPoints: "스탯 포인트", proficiency: "숙련도", proficiencyExp: "숙련 경험", escapeCount: "탈출 성공 횟수",
};

export async function adjustStatsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const parsed = statsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: `값을 확인하세요: ${parsed.error.issues[0].path.join(".")}` };
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 200);
  const before = await db.character.findUnique({ where: { id } });
  if (!before) return { error: "캐릭터를 찾을 수 없습니다." };
  const data = { ...parsed.data, hp: Math.min(parsed.data.hp, parsed.data.maxHp), mp: Math.min(parsed.data.mp, parsed.data.maxMp) };
  const changes: Record<string, { from: number; to: number }> = {};
  for (const k of Object.keys(data) as (keyof typeof data)[]) {
    if (before[k] !== data[k]) changes[STAT_LABEL[k]] = { from: before[k], to: data[k] };
  }
  if (Object.keys(changes).length === 0) return { success: "바뀐 값이 없습니다." };
  await db.character.update({ where: { id }, data });
  await audit(admin.id, "character.adjust", { type: "character", id }, { name: before.name, reason, changes });
  revalidatePath(`/admin/users/${id}`);
  return { success: `${Object.keys(changes).length}개 수치를 조정했습니다.` };
}

export async function grantItemAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const itemId = String(formData.get("itemId") ?? "");
  const qty = Math.trunc(Number(formData.get("qty")) || 0);
  if (!itemId || qty === 0) return { error: "아이템과 0이 아닌 수량을 입력하세요. 음수면 회수합니다." };
  const [character, item] = await Promise.all([db.character.findUnique({ where: { id } }), db.item.findUnique({ where: { id: itemId } })]);
  if (!character || !item) return { error: "대상을 찾을 수 없습니다." };
  const existing = await db.inventoryItem.findUnique({ where: { characterId_itemId: { characterId: id, itemId } } });
  const next = (existing?.qty ?? 0) + qty;
  if (next < 0) return { error: `보유 수량(${existing?.qty ?? 0})보다 많이 회수할 수 없습니다.` };
  if (next === 0) {
    if (existing) await db.inventoryItem.delete({ where: { id: existing.id } });
  } else if (existing) {
    await db.inventoryItem.update({ where: { id: existing.id }, data: { qty: next } });
  } else {
    await db.inventoryItem.create({ data: { characterId: id, itemId, qty: next } });
  }
  await audit(admin.id, qty > 0 ? "character.grantItem" : "character.takeItem", { type: "character", id }, { name: character.name, item: item.name, qty, after: next });
  revalidatePath(`/admin/users/${id}`);
  return { success: `${item.name} ${qty > 0 ? `+${qty}` : qty} (현재 ${next}개)` };
}

export async function forceEndRunAction(formData: FormData) {
  const admin = await requireAdmin();
  const runId = String(formData.get("runId") ?? "");
  const run = await db.run.findUnique({ where: { id: runId }, include: { character: true } });
  if (!run || run.status !== "ACTIVE") return;
  await db.run.update({ where: { id: runId }, data: { status: "ABORTED", endedAt: new Date() } });
  await audit(admin.id, "run.forceEnd", { type: "run", id: runId }, { character: run.character.name });
  revalidatePath(`/admin/users/${run.characterId}`);
  revalidatePath("/admin");
}

export async function resetPasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const password = String(formData.get("password") ?? "");
  if (password.length < 6) return { error: "비밀번호는 6자 이상이어야 합니다." };
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "계정을 찾을 수 없습니다." };
  await db.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(password) } });
  await db.session.deleteMany({ where: { userId } });
  await audit(admin.id, "user.resetPassword", { type: "user", id: userId }, { loginId: user.loginId });
  return { success: "비밀번호를 바꾸고 기존 접속을 모두 끊었습니다." };
}

export async function toggleRoleAction(formData: FormData) {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  if (userId === admin.id) return;
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return;
  const role = user.role === "ADMIN" ? "USER" : "ADMIN";
  await db.user.update({ where: { id: userId }, data: { role } });
  await audit(admin.id, "user.role", { type: "user", id: userId }, { loginId: user.loginId, role });
  revalidatePath(`/admin/users`);
}
