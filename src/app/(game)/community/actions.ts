"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireCharacterUser } from "@/lib/auth";
import { getConfig } from "@/lib/game-config";
import { applyRpErosion } from "@/lib/community";
import { audit } from "@/lib/audit";
import type { FormState } from "@/components/ActionForm";

async function canAccessOrgBoard(characterId: string, orgId: string) {
  return !!(await db.orgMember.findFirst({ where: { orgId, characterId } }));
}

export async function createPostAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { character } = await requireCharacterUser();
  const cfg = await getConfig();
  const kind = String(formData.get("kind") ?? "");
  const title = String(formData.get("title") ?? "").trim().slice(0, 100);
  const body = String(formData.get("body") ?? "").trim();
  const isAnonymous = formData.get("isAnonymous") === "on";
  const orgId = String(formData.get("orgId") ?? "") || null;
  if (!body) return { error: "내용을 입력하세요." };
  if (kind === "TIMELINE") {
    if (body.length > cfg["post.timelineMaxLength"]) return { error: `타임라인 글은 ${cfg["post.timelineMaxLength"]}자 이하입니다.` };
    await db.post.create({ data: { kind: "TIMELINE", authorId: character.id, body } });
    revalidatePath("/community/timeline");
    return { success: "올렸습니다." };
  }
  if (kind === "BOARD") {
    if (!title) return { error: "제목을 입력하세요." };
    if (body.length > 10000) return { error: "본문은 10000자 이하입니다." };
    const post = await db.post.create({ data: { kind: "BOARD", authorId: character.id, title, body, isAnonymous } });
    revalidatePath("/community/board");
    redirect(`/community/board/${post.id}`);
  }
  if (kind === "ORG") {
    if (!orgId || !(await canAccessOrgBoard(character.id, orgId))) return { error: "조직원만 쓸 수 있습니다." };
    if (!title) return { error: "제목을 입력하세요." };
    await db.post.create({ data: { kind: "ORG", authorId: character.id, orgId, title, body } });
    revalidatePath(`/community/org/${orgId}`);
    return { success: "올렸습니다." };
  }
  return { error: "잘못된 요청입니다." };
}

export async function deletePostAction(formData: FormData) {
  const { user, character } = await requireCharacterUser();
  const id = String(formData.get("postId") ?? "");
  const post = await db.post.findUnique({ where: { id } });
  if (!post) return;
  if (post.authorId !== character.id && user.role !== "ADMIN") return;
  await db.post.delete({ where: { id } });
  if (user.role === "ADMIN" && post.authorId !== character.id) await audit(user.id, "post.delete", { type: "post", id }, { kind: post.kind, title: post.title });
  revalidatePath("/community", "layout");
  if (post.kind === "BOARD") redirect("/community/board");
}

export async function addCommentAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { character } = await requireCharacterUser();
  const cfg = await getConfig();
  const postId = String(formData.get("postId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const isAnonymous = formData.get("isAnonymous") === "on";
  if (!body) return { error: "댓글을 입력하세요." };
  if (body.length > 2000) return { error: "댓글은 2000자 이하입니다." };
  const post = await db.post.findUnique({ where: { id: postId } });
  if (!post) return { error: "글을 찾을 수 없습니다." };
  if (post.kind === "ORG" && post.orgId && !(await canAccessOrgBoard(character.id, post.orgId))) return { error: "조직원만 쓸 수 있습니다." };
  const anon = post.kind === "BOARD" && post.isAnonymous ? true : isAnonymous && post.kind === "BOARD";
  const rp = await db.$transaction(async (tx) => {
    const r = await applyRpErosion(tx, character.id, post.authorId, body, anon, cfg);
    await tx.comment.create({ data: { postId, authorId: character.id, body, isAnonymous: anon, erosionApplied: r.applied > 0 } });
    return r;
  });
  revalidatePath("/", "layout");
  return { success: rp.applied > 0 ? `댓글을 달았습니다. RP 인정: 침식률 −${rp.applied} (오늘 ${rp.countToday}/${cfg["rp.dailyLimit"]})` : "댓글을 달았습니다." };
}

export async function deleteCommentAction(formData: FormData) {
  const { user, character } = await requireCharacterUser();
  const id = String(formData.get("commentId") ?? "");
  const c = await db.comment.findUnique({ where: { id } });
  if (!c) return;
  if (c.authorId !== character.id && user.role !== "ADMIN") return;
  await db.comment.delete({ where: { id } });
  revalidatePath("/community", "layout");
}

export async function toggleReactionAction(formData: FormData) {
  const { character } = await requireCharacterUser();
  const postId = String(formData.get("postId") ?? "");
  const key = { postId_characterId: { postId, characterId: character.id } };
  const existing = await db.reaction.findUnique({ where: key });
  if (existing) await db.reaction.delete({ where: key }); else await db.reaction.create({ data: { postId, characterId: character.id } });
  revalidatePath("/community", "layout");
}

// ───────── 1:1 대화 ─────────

export async function sendDmAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { character } = await requireCharacterUser();
  const toId = String(formData.get("toId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { error: "내용을 입력하세요." };
  if (body.length > 2000) return { error: "2000자 이하로 써 주세요." };
  if (toId === character.id) return { error: "자기 자신에게는 보낼 수 없습니다." };
  const to = await db.character.findUnique({ where: { id: toId } });
  if (!to) return { error: "상대를 찾을 수 없습니다." };
  await db.directMessage.create({ data: { fromId: character.id, toId, body } });
  revalidatePath(`/community/dm/${toId}`);
  revalidatePath("/community", "layout");
  return undefined;
}

export async function startDmAction(formData: FormData) {
  const { character } = await requireCharacterUser();
  const name = String(formData.get("name") ?? "").trim();
  const to = await db.character.findFirst({ where: { name } });
  if (!to || to.id === character.id) redirect("/community/dm?error=notfound");
  redirect(`/community/dm/${to.id}`);
}

// ───────── 조직 ─────────

const orgSchema = z.object({ name: z.string().trim().min(2, "조직 이름은 2자 이상입니다.").max(20, "조직 이름은 20자 이하입니다."), description: z.string().trim().max(2000), isPublic: z.boolean() });

export async function createOrgAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { user, character } = await requireCharacterUser();
  const parsed = orgSchema.safeParse({ name: formData.get("name"), description: formData.get("description") ?? "", isPublic: formData.get("isPublic") === "on" });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (await db.orgMember.findUnique({ where: { characterId: character.id } })) return { error: "이미 조직에 속해 있습니다. 한 사람은 한 조직에만 가입할 수 있습니다." };
  if (await db.organization.findUnique({ where: { name: parsed.data.name } })) return { error: "이미 있는 조직 이름입니다." };
  const org = await db.organization.create({ data: { ...parsed.data, leaderId: character.id, members: { create: { characterId: character.id } } } });
  await db.orgInvite.updateMany({ where: { characterId: character.id, status: "PENDING" }, data: { status: "DECLINED", decidedAt: new Date() } });
  await audit(user.id, "org.create", { type: "org", id: org.id }, { name: org.name });
  revalidatePath("/community", "layout");
  redirect(`/community/org/${org.id}`);
}

export async function updateOrgAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { character } = await requireCharacterUser();
  const orgId = String(formData.get("orgId") ?? "");
  const org = await db.organization.findUnique({ where: { id: orgId } });
  if (!org || org.leaderId !== character.id) return { error: "수장만 수정할 수 있습니다." };
  const parsed = orgSchema.safeParse({ name: formData.get("name"), description: formData.get("description") ?? "", isPublic: formData.get("isPublic") === "on" });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const dup = await db.organization.findUnique({ where: { name: parsed.data.name } });
  if (dup && dup.id !== orgId) return { error: "이미 있는 조직 이름입니다." };
  await db.organization.update({ where: { id: orgId }, data: parsed.data });
  revalidatePath("/community", "layout");
  return { success: "저장했습니다." };
}

export async function inviteToOrgAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { character } = await requireCharacterUser();
  const cfg = await getConfig();
  const orgId = String(formData.get("orgId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim().slice(0, 300);
  const org = await db.organization.findUnique({ where: { id: orgId }, include: { _count: { select: { members: true } } } });
  if (!org || org.leaderId !== character.id) return { error: "수장만 영입할 수 있습니다." };
  if (org._count.members >= cfg["org.maxMembers"]) return { error: `조직 인원이 가득 찼습니다 (${cfg["org.maxMembers"]}명).` };
  const target = await db.character.findFirst({ where: { name }, include: { orgMember: true } });
  if (!target) return { error: "그 이름의 유저가 없습니다." };
  if (target.orgMember) return { error: "이미 다른 조직에 속한 유저입니다." };
  if (await db.orgInvite.findFirst({ where: { orgId, characterId: target.id, status: "PENDING" } })) return { error: "이미 보낸 신청이 있습니다." };
  await db.orgInvite.create({ data: { orgId, characterId: target.id, kind: "INVITE", message } });
  revalidatePath("/community", "layout");
  return { success: `${target.name}에게 영입 신청을 보냈습니다.` };
}

export async function applyToOrgAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { character } = await requireCharacterUser();
  const orgId = String(formData.get("orgId") ?? "");
  const message = String(formData.get("message") ?? "").trim().slice(0, 300);
  if (await db.orgMember.findUnique({ where: { characterId: character.id } })) return { error: "이미 조직에 속해 있습니다." };
  const org = await db.organization.findUnique({ where: { id: orgId } });
  if (!org || !org.isPublic) return { error: "가입 신청을 받지 않는 조직입니다." };
  if (await db.orgInvite.findFirst({ where: { orgId, characterId: character.id, status: "PENDING" } })) return { error: "이미 신청했습니다." };
  await db.orgInvite.create({ data: { orgId, characterId: character.id, kind: "APPLY", message } });
  revalidatePath("/community", "layout");
  return { success: "가입 신청을 보냈습니다. 수장이 수락하면 가입됩니다." };
}

/** 영입 신청(유저가 수락·거절) 또는 가입 신청(수장이 수락·거절) 처리 */
export async function decideInviteAction(formData: FormData) {
  const { character } = await requireCharacterUser();
  const cfg = await getConfig();
  const id = String(formData.get("inviteId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const inv = await db.orgInvite.findUnique({ where: { id }, include: { org: { include: { _count: { select: { members: true } } } } } });
  if (!inv || inv.status !== "PENDING") return;
  const isDecider = inv.kind === "INVITE" ? inv.characterId === character.id : inv.org.leaderId === character.id;
  if (!isDecider) return;
  if (decision !== "accept") {
    await db.orgInvite.update({ where: { id }, data: { status: "DECLINED", decidedAt: new Date() } });
  } else {
    const already = await db.orgMember.findUnique({ where: { characterId: inv.characterId } });
    if (already || inv.org._count.members >= cfg["org.maxMembers"]) {
      await db.orgInvite.update({ where: { id }, data: { status: "DECLINED", decidedAt: new Date() } });
    } else {
      await db.$transaction([
        db.orgMember.create({ data: { orgId: inv.orgId, characterId: inv.characterId } }),
        db.orgInvite.update({ where: { id }, data: { status: "ACCEPTED", decidedAt: new Date() } }),
        db.orgInvite.updateMany({ where: { characterId: inv.characterId, status: "PENDING", id: { not: id } }, data: { status: "DECLINED", decidedAt: new Date() } }),
      ]);
    }
  }
  revalidatePath("/community", "layout");
}

export async function kickMemberAction(formData: FormData) {
  const { user, character } = await requireCharacterUser();
  const orgId = String(formData.get("orgId") ?? "");
  const targetId = String(formData.get("characterId") ?? "");
  const org = await db.organization.findUnique({ where: { id: orgId } });
  if (!org || org.leaderId !== character.id || targetId === character.id) return;
  await db.orgMember.deleteMany({ where: { orgId, characterId: targetId } });
  await audit(user.id, "org.kick", { type: "org", id: orgId }, { characterId: targetId });
  revalidatePath("/community", "layout");
}

export async function leaveOrgAction(formData: FormData) {
  const { character } = await requireCharacterUser();
  const orgId = String(formData.get("orgId") ?? "");
  const org = await db.organization.findUnique({ where: { id: orgId }, include: { _count: { select: { members: true } } } });
  if (!org) return;
  if (org.leaderId === character.id) {
    // 수장이 나가면: 혼자면 조직 해산, 아니면 다음 멤버에게 수장 이양
    const next = await db.orgMember.findFirst({ where: { orgId, characterId: { not: character.id } }, orderBy: { joinedAt: "asc" } });
    if (!next) { await db.organization.delete({ where: { id: orgId } }); revalidatePath("/community", "layout"); redirect("/community/org"); }
    await db.$transaction([
      db.organization.update({ where: { id: orgId }, data: { leaderId: next.characterId } }),
      db.orgMember.deleteMany({ where: { orgId, characterId: character.id } }),
    ]);
  } else {
    await db.orgMember.deleteMany({ where: { orgId, characterId: character.id } });
  }
  revalidatePath("/community", "layout");
  redirect("/community/org");
}

export async function toggleBadgeAction() {
  const { character } = await requireCharacterUser();
  const m = await db.orgMember.findUnique({ where: { characterId: character.id } });
  if (!m) return;
  await db.orgMember.update({ where: { characterId: character.id }, data: { showBadge: !m.showBadge } });
  revalidatePath("/", "layout");
}

export async function disbandOrgAction(formData: FormData) {
  const { user, character } = await requireCharacterUser();
  const orgId = String(formData.get("orgId") ?? "");
  const org = await db.organization.findUnique({ where: { id: orgId } });
  if (!org || org.leaderId !== character.id) return;
  await db.organization.delete({ where: { id: orgId } });
  await audit(user.id, "org.disband", { type: "org", id: orgId }, { name: org.name });
  revalidatePath("/community", "layout");
  redirect("/community/org");
}
