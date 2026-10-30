import "server-only";
import { db } from "./db";

/** 내가 참여 중인(주인이거나 파티 멤버인) 진행 중 런 */
export async function findActiveRunFor(characterId: string) {
  return db.run.findFirst({
    where: { status: "ACTIVE", isTest: false, OR: [{ characterId }, { party: { members: { some: { characterId, status: "JOINED" } } } }] },
    include: { realm: true },
  });
}

/** 이 런을 볼 수 있는가 (주인, 파티 멤버, 관리자) */
export async function canAccessRun(runId: string, characterId: string, isAdmin: boolean) {
  const run = await db.run.findUnique({ where: { id: runId }, include: { party: { include: { members: true } } } });
  if (!run) return null;
  const ok = isAdmin || run.characterId === characterId || !!run.party?.members.some((m) => m.characterId === characterId);
  return ok ? run : null;
}

/** 내 모집 중 파티 (파티장 또는 수락한 멤버) */
export async function myFormingParty(characterId: string) {
  return db.party.findFirst({ where: { status: "FORMING", members: { some: { characterId, status: "JOINED" } } }, include: { realm: true, leader: true, members: { include: { character: true }, orderBy: { joinedAt: "asc" } } } });
}
