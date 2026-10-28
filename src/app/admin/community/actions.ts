"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function adminDeletePostAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("postId") ?? "");
  const post = await db.post.findUnique({ where: { id }, include: { author: true } });
  if (!post) return;
  await db.post.delete({ where: { id } });
  await audit(admin.id, "post.delete", { type: "post", id }, { kind: post.kind, title: post.title, author: post.author.name });
  revalidatePath("/admin/community");
  revalidatePath("/community", "layout");
}

export async function adminDeleteOrgAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("orgId") ?? "");
  const org = await db.organization.findUnique({ where: { id } });
  if (!org) return;
  await db.organization.delete({ where: { id } });
  await audit(admin.id, "org.disband", { type: "org", id }, { name: org.name, by: "admin" });
  revalidatePath("/admin/community");
  revalidatePath("/community", "layout");
}
