"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSession, destroySession, hashPassword, verifyPassword } from "@/lib/auth";
import { audit } from "@/lib/audit";

export type AuthState = { error?: string } | undefined;

const loginIdSchema = z
  .string()
  .trim()
  .min(3, "아이디는 3자 이상이어야 합니다.")
  .max(20, "아이디는 20자 이하여야 합니다.")
  .regex(/^[a-zA-Z0-9_]+$/, "아이디는 영문, 숫자, 밑줄(_)만 쓸 수 있습니다.");
const passwordSchema = z.string().min(6, "비밀번호는 6자 이상이어야 합니다.").max(100);

export async function installAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = z
    .object({
      inviteCode: z.string().trim().min(1, "초대 코드를 입력하세요."),
      loginId: loginIdSchema,
      password: passwordSchema,
      passwordConfirm: z.string(),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { inviteCode, loginId, password, passwordConfirm } = parsed.data;
  if (password !== passwordConfirm) return { error: "비밀번호 확인이 일치하지 않습니다." };

  const code = await db.inviteCode.findUnique({ where: { code: inviteCode.toUpperCase() } });
  if (!code) return { error: "유효하지 않은 초대 코드입니다. 접근 권한을 확인할 수 없습니다." };
  if (code.usedById) return { error: "이미 사용된 초대 코드입니다." };

  const dup = await db.user.findUnique({ where: { loginId } });
  if (dup) return { error: "이미 사용 중인 아이디입니다." };

  const user = await db.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: { loginId, passwordHash: await hashPassword(password), role: "USER" },
    });
    const claimed = await tx.inviteCode.updateMany({
      where: { id: code.id, usedById: null },
      data: { usedById: created.id, usedAt: new Date() },
    });
    if (claimed.count === 0) throw new Error("INVITE_RACE");
    return created;
  }).catch((e) => {
    if (e instanceof Error && e.message === "INVITE_RACE") return null;
    throw e;
  });
  if (!user) return { error: "이미 사용된 초대 코드입니다." };

  await audit(user.id, "user.install", { type: "user", id: user.id }, { inviteCode: code.code });
  await createSession(user.id);
  redirect("/create-character");
}

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const loginId = String(formData.get("loginId") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!loginId || !password) return { error: "아이디와 비밀번호를 입력하세요." };

  const user = await db.user.findUnique({ where: { loginId } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "접속 권한을 확인할 수 없습니다. 아이디 또는 비밀번호를 확인하세요." };
  }
  await createSession(user.id);
  redirect("/");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
