"use server";

import { revalidatePath } from "next/cache";
import { randomInt } from "crypto";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import type { FormState } from "@/components/ActionForm";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 헷갈리는 글자(0,O,1,I) 제외

function generateCode() {
  const part = () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
  return `${part()}-${part()}`;
}

export async function issueInvitesAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const count = Math.min(50, Math.max(1, Number(formData.get("count")) || 1));
  const note = String(formData.get("note") ?? "").trim().slice(0, 100);
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    let code = generateCode();
    while (await db.inviteCode.findUnique({ where: { code } })) code = generateCode();
    await db.inviteCode.create({ data: { code, note, createdById: admin.id } });
    codes.push(code);
  }
  await audit(admin.id, "invite.issue", { type: "invite" }, { count, note, codes });
  revalidatePath("/admin/invites");
  return { success: `초대 코드 ${count}개를 발급했습니다: ${codes.join(", ")}` };
}

export async function deleteInviteAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const code = await db.inviteCode.findUnique({ where: { id } });
  if (!code || code.usedById) return;
  await db.inviteCode.delete({ where: { id } });
  await audit(admin.id, "invite.delete", { type: "invite", id }, { code: code.code });
  revalidatePath("/admin/invites");
}
