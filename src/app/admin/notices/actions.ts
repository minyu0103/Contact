"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import type { FormState } from "@/components/ActionForm";

function parse(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const pinned = formData.get("pinned") === "on";
  if (!title) return { error: "제목을 입력하세요." } as const;
  if (!body) return { error: "내용을 입력하세요." } as const;
  return { data: { title: title.slice(0, 100), body: body.slice(0, 5000), pinned } } as const;
}

export async function createNoticeAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const p = parse(formData);
  if ("error" in p) return { error: p.error };
  const n = await db.notice.create({ data: { ...p.data, authorId: admin.id } });
  await audit(admin.id, "notice.create", { type: "notice", id: n.id }, { title: n.title });
  revalidatePath("/admin/notices");
  revalidatePath("/home");
  return { success: "공지를 올렸습니다." };
}

export async function updateNoticeAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const p = parse(formData);
  if ("error" in p) return { error: p.error };
  await db.notice.update({ where: { id }, data: p.data });
  await audit(admin.id, "notice.update", { type: "notice", id }, { title: p.data.title });
  revalidatePath("/admin/notices");
  revalidatePath("/home");
  redirect("/admin/notices");
}

export async function deleteNoticeAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const n = await db.notice.findUnique({ where: { id } });
  if (!n) return;
  await db.notice.delete({ where: { id } });
  await audit(admin.id, "notice.delete", { type: "notice", id }, { title: n.title });
  revalidatePath("/admin/notices");
  revalidatePath("/home");
}

export async function togglePinAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const n = await db.notice.findUnique({ where: { id } });
  if (!n) return;
  await db.notice.update({ where: { id }, data: { pinned: !n.pinned } });
  await audit(admin.id, "notice.pin", { type: "notice", id }, { pinned: !n.pinned });
  revalidatePath("/admin/notices");
  revalidatePath("/home");
}
