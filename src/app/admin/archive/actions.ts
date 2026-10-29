"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { saveImage } from "@/lib/upload";
import { unlockListSchema } from "@/lib/archive-schemas";
import type { FormState } from "@/components/ActionForm";
import type { Prisma } from "@prisma/client";

const entrySchema = z.object({
  category: z.enum(["REALM", "CREATURE", "INFECTED"]),
  code: z.string().trim().max(20),
  title: z.string().trim().min(1, "제목을 입력하세요.").max(80),
  summary: z.string().trim().max(2000),
  isPublished: z.boolean(),
  sortOrder: z.coerce.number().int(),
  adoptedLogId: z.string().transform((v) => v || null),
});

export async function saveEntryAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const parsed = entrySchema.safeParse({ category: formData.get("category"), code: formData.get("code") ?? "", title: formData.get("title"), summary: formData.get("summary") ?? "", isPublished: formData.get("isPublished") === "on", sortOrder: formData.get("sortOrder") || 0, adoptedLogId: formData.get("adoptedLogId") ?? "" });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  let imageUrl: string | null | undefined;
  try { const f = formData.get("image"); const up = await saveImage(f instanceof File ? f : null, "archive"); if (up) imageUrl = up; if (formData.get("removeImage") === "on") imageUrl = null; } catch (e) { return { error: e instanceof Error ? e.message : "이미지 업로드 실패" }; }
  if (parsed.data.adoptedLogId) {
    const taken = await db.archiveEntry.findFirst({ where: { adoptedLogId: parsed.data.adoptedLogId, NOT: { id: id || "" } } });
    if (taken) return { error: "그 로그는 이미 다른 문서에 채택되어 있습니다." };
  }
  const data = { ...parsed.data, ...(imageUrl !== undefined ? { imageUrl } : {}) };
  if (id) {
    await db.archiveEntry.update({ where: { id }, data });
    await audit(admin.id, "archive.update", { type: "archive", id }, { title: data.title });
    revalidatePath("/", "layout");
    return { success: "저장했습니다." };
  }
  const entry = await db.archiveEntry.create({ data: { ...data, stages: { create: { sortOrder: 0, title: "1단계", body: "", conditions: [] } } } });
  await audit(admin.id, "archive.create", { type: "archive", id: entry.id }, { title: entry.title });
  redirect(`/admin/archive/${entry.id}`);
}

export async function deleteEntryAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const e = await db.archiveEntry.findUnique({ where: { id } });
  if (!e) return;
  await db.archiveEntry.delete({ where: { id } });
  await audit(admin.id, "archive.delete", { type: "archive", id }, { title: e.title });
  revalidatePath("/", "layout");
  redirect("/admin/archive");
}

export async function addStageAction(formData: FormData) {
  await requireAdmin();
  const entryId = String(formData.get("entryId") ?? "");
  const count = await db.archiveStage.count({ where: { entryId } });
  await db.archiveStage.create({ data: { entryId, sortOrder: count, title: `${count + 1}단계`, body: "", conditions: [] } });
  revalidatePath(`/admin/archive/${entryId}`);
}

export async function saveStageAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const stageId = String(formData.get("stageId") ?? "");
  const entryId = String(formData.get("entryId") ?? "");
  const title = String(formData.get("title") ?? "").trim().slice(0, 60);
  const body = String(formData.get("body") ?? "").slice(0, 20000);
  const hint = String(formData.get("hint") ?? "").trim().slice(0, 300);
  let raw: unknown; try { raw = JSON.parse(String(formData.get("conditions") ?? "[]")); } catch { return { error: "조건 형식 오류" }; }
  const conds = unlockListSchema.safeParse(raw);
  if (!conds.success) return { error: `해금 조건: ${conds.error.issues[0].message}` };
  await db.archiveStage.update({ where: { id: stageId }, data: { title, body, hint, conditions: conds.data as Prisma.InputJsonValue } });
  revalidatePath(`/admin/archive/${entryId}`);
  revalidatePath("/archive", "layout");
  return { success: "단계를 저장했습니다." };
}

export async function deleteStageAction(formData: FormData) {
  await requireAdmin();
  const stageId = String(formData.get("stageId") ?? "");
  const entryId = String(formData.get("entryId") ?? "");
  await db.archiveStage.delete({ where: { id: stageId } });
  revalidatePath(`/admin/archive/${entryId}`);
}

/** 승인된 카메라 로그로 문서 만들기 (본문을 1단계로) */
export async function createEntryFromLogAction(formData: FormData) {
  const admin = await requireAdmin();
  const logId = String(formData.get("logId") ?? "");
  const category = String(formData.get("category") ?? "REALM");
  const log = await db.explorationLog.findUnique({ where: { id: logId }, include: { character: true, realm: true } });
  if (!log || log.status !== "APPROVED") return;
  if (await db.archiveEntry.findUnique({ where: { adoptedLogId: logId } })) return;
  const entry = await db.archiveEntry.create({ data: {
    category: category === "CREATURE" ? "CREATURE" : category === "INFECTED" ? "INFECTED" : "REALM", title: log.title, summary: `${log.realm.name} 탐사 로그에서 채택`, imageUrl: log.imageUrl, adoptedLogId: logId, isPublished: false,
    stages: { create: { sortOrder: 0, title: "1단계", body: log.body, conditions: [] } },
  } });
  await audit(admin.id, "archive.adoptLog", { type: "archive", id: entry.id }, { log: log.title, author: log.character.name });
  redirect(`/admin/archive/${entry.id}`);
}
