"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { requireAdmin, hashPassword, createSession } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { getConfig } from "@/lib/game-config";
import { gameDayKey } from "@/lib/time";
import { saveImage } from "@/lib/upload";
import type { FormState } from "@/components/ActionForm";

const RETURN_COOKIE = "contact_admin_return";

export async function createNpcAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const cfg = await getConfig();
  const name = String(formData.get("name") ?? "").trim().slice(0, 20);
  const category = String(formData.get("category") ?? "SPECIAL");
  const abilityName = String(formData.get("abilityName") ?? "").trim().slice(0, 40) || "비공개";
  const abilityDesc = String(formData.get("abilityDesc") ?? "").trim().slice(0, 3000) || "(운영자 NPC)";
  if (!name) return { error: "이름을 입력하세요." };
  if (await db.character.findUnique({ where: { name } })) return { error: "이미 있는 이름입니다." };
  let imageUrl: string | null = null;
  try { const f = formData.get("image"); imageUrl = await saveImage(f instanceof File ? f : null, "profiles"); } catch (e) { return { error: e instanceof Error ? e.message : "이미지 업로드 실패" }; }
  const loginId = `npc_${randomBytes(4).toString("hex")}`;
  const cat = ["COMBAT", "SEARCH", "PRODUCTION", "SPECIAL"].includes(category) ? (category as "COMBAT" | "SEARCH" | "PRODUCTION" | "SPECIAL") : "SPECIAL";
  const user = await db.user.create({ data: { loginId, passwordHash: await hashPassword(randomBytes(16).toString("hex")), role: "USER",
    character: { create: { name, imageUrl, category: cat, abilityName, abilityDesc, abilityStatus: "ACTIVE", isNpc: true, hp: cfg["char.startMaxHp"], maxHp: cfg["char.startMaxHp"], mp: cfg["char.startMaxMp"], maxMp: cfg["char.startMaxMp"], ap: cfg["char.dailyAp"], points: cfg["char.startPoints"], lastDailyResetKey: gameDayKey() } } }, include: { character: true } });
  await audit(admin.id, "npc.create", { type: "character", id: user.character!.id }, { name });
  revalidatePath("/admin/npcs");
  return { success: `NPC "${name}"을(를) 만들었습니다.` };
}

export async function deleteNpcAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const c = await db.character.findUnique({ where: { id } });
  if (!c || !c.isNpc) return;
  await db.user.delete({ where: { id: c.userId } });
  await audit(admin.id, "npc.delete", { type: "character", id }, { name: c.name });
  revalidatePath("/admin/npcs");
}

/** NPC로 전환: 현재 관리자 세션을 돌아올 쿠키에 보관하고 NPC 계정 세션을 연다 */
export async function switchToNpcAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const c = await db.character.findUnique({ where: { id } });
  if (!c || !c.isNpc) return;
  const jar = await cookies();
  const current = jar.get("contact_session")?.value;
  if (current) jar.set(RETURN_COOKIE, current, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 12 });
  await audit(admin.id, "npc.switch", { type: "character", id }, { name: c.name });
  await createSession(c.userId);
  redirect("/home");
}

/** 관리자 계정으로 돌아가기 */
export async function returnToAdminAction() {
  const jar = await cookies();
  const back = jar.get(RETURN_COOKIE)?.value;
  const npcSession = jar.get("contact_session")?.value;
  if (!back) redirect("/home");
  const session = await db.session.findUnique({ where: { id: back }, include: { user: true } });
  if (!session || session.user.role !== "ADMIN" || session.expiresAt < new Date()) { jar.delete(RETURN_COOKIE); redirect("/login"); }
  if (npcSession) await db.session.deleteMany({ where: { id: npcSession } });
  jar.set("contact_session", back, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", expires: session.expiresAt });
  jar.delete(RETURN_COOKIE);
  redirect("/admin/npcs");
}
