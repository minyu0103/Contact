import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import type { GameConfig } from "./game-config";

/** 글·댓글 목록에서 작성자 표시에 필요한 include */
export const authorInclude = { include: { orgMember: { include: { org: { select: { id: true, name: true, isPublic: true } } } } } } satisfies Prisma.CharacterDefaultArgs;
export type AuthorRow = Prisma.CharacterGetPayload<typeof authorInclude>;

export type AuthorView = { id: string | null; name: string; imageUrl: string | null; badge: string | null; anonymous: boolean; realName?: string };

/** 작성자 표시. 익명 글은 이름을 감추되, 관리자에게는 실제 이름을 함께 준다. */
export function authorView(author: AuthorRow, isAnonymous: boolean, viewerIsAdmin: boolean): AuthorView {
  if (isAnonymous) return { id: null, name: "익명", imageUrl: null, badge: null, anonymous: true, realName: viewerIsAdmin ? author.name : undefined };
  const m = author.orgMember;
  return { id: author.id, name: author.name, imageUrl: author.imageUrl, badge: m && m.showBadge ? m.org.name : null, anonymous: false };
}

/**
 * RP 댓글 침식률 감소 판정. 조건: 익명 아님, 남의 글, 최소 글자 수, 오늘 횟수 남음.
 * 적용했으면 감소량을, 아니면 0을 돌려준다.
 */
export async function applyRpErosion(tx: Prisma.TransactionClient, characterId: string, postAuthorId: string, body: string, isAnonymous: boolean, cfg: GameConfig): Promise<{ applied: number; countToday: number }> {
  const c = await tx.character.findUnique({ where: { id: characterId } });
  if (!c) return { applied: 0, countToday: 0 };
  const eligible = !isAnonymous && postAuthorId !== characterId && body.trim().length >= cfg["rp.minLength"] && c.rpCountToday < cfg["rp.dailyLimit"] && cfg["rp.erosionPerComment"] > 0;
  if (!eligible) return { applied: 0, countToday: c.rpCountToday };
  const dec = Math.min(c.erosion, cfg["rp.erosionPerComment"]);
  await tx.character.update({ where: { id: characterId }, data: { erosion: { decrement: dec }, rpCountToday: { increment: 1 } } });
  return { applied: cfg["rp.erosionPerComment"], countToday: c.rpCountToday + 1 };
}

export async function unreadDmCount(characterId: string) {
  return db.directMessage.count({ where: { toId: characterId, readAt: null } });
}

export async function pendingOrgInviteCount(characterId: string) {
  const me = await db.character.findUnique({ where: { id: characterId }, include: { ledOrg: true } });
  const [invites, applies] = await Promise.all([
    db.orgInvite.count({ where: { characterId, kind: "INVITE", status: "PENDING" } }),
    me?.ledOrg ? db.orgInvite.count({ where: { orgId: me.ledOrg.id, kind: "APPLY", status: "PENDING" } }) : Promise.resolve(0),
  ]);
  return invites + applies;
}
