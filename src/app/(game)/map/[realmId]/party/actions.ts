"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireCharacterUser } from "@/lib/auth";
import { getConfig } from "@/lib/game-config";
import { findActiveRunFor, myFormingParty } from "@/lib/party";
import { EngineError, startRun } from "@/lib/engine/engine";
import type { FormState } from "@/components/ActionForm";

export async function createPartyAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { character } = await requireCharacterUser();
  const realmId = String(formData.get("realmId") ?? "");
  if (await findActiveRunFor(character.id)) return { error: "진행 중인 탐사가 있습니다." };
  if (await myFormingParty(character.id)) return { error: "이미 모집 중인 파티에 속해 있습니다." };
  await db.party.create({ data: { leaderId: character.id, realmId, members: { create: { characterId: character.id, status: "JOINED" } } } });
  revalidatePath(`/map/${realmId}`);
  return { success: "파티를 만들었습니다. 멤버를 초대하세요." };
}

export async function invitePartyAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { character } = await requireCharacterUser();
  const cfg = await getConfig();
  const partyId = String(formData.get("partyId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const party = await db.party.findUnique({ where: { id: partyId }, include: { members: true } });
  if (!party || party.leaderId !== character.id || party.status !== "FORMING") return { error: "파티장만 초대할 수 있습니다." };
  if (party.members.filter((m) => m.status === "JOINED" || m.status === "INVITED").length >= cfg["coop.maxMembers"]) return { error: `파티는 ${cfg["coop.maxMembers"]}명까지입니다.` };
  const target = await db.character.findFirst({ where: { name } });
  if (!target) return { error: "그 이름의 유저가 없습니다." };
  if (party.members.some((m) => m.characterId === target.id && m.status !== "LEFT")) return { error: "이미 초대했거나 참여 중입니다." };
  await db.partyMember.upsert({ where: { partyId_characterId: { partyId, characterId: target.id } }, update: { status: "INVITED" }, create: { partyId, characterId: target.id, status: "INVITED" } });
  revalidatePath(`/map/${party.realmId}`);
  return { success: `${target.name}을(를) 초대했습니다. 상대가 이계 정보 화면에서 수락하면 합류합니다.` };
}

export async function respondPartyAction(formData: FormData) {
  const { character } = await requireCharacterUser();
  const partyId = String(formData.get("partyId") ?? "");
  const accept = String(formData.get("decision") ?? "") === "accept";
  const m = await db.partyMember.findUnique({ where: { partyId_characterId: { partyId, characterId: character.id } }, include: { party: true } });
  if (!m || m.status !== "INVITED" || m.party.status !== "FORMING") return;
  if (accept && (await myFormingParty(character.id))) return;
  await db.partyMember.update({ where: { partyId_characterId: { partyId, characterId: character.id } }, data: { status: accept ? "JOINED" : "LEFT", joinedAt: new Date() } });
  revalidatePath("/", "layout");
}

export async function leavePartyAction(formData: FormData) {
  const { character } = await requireCharacterUser();
  const partyId = String(formData.get("partyId") ?? "");
  const party = await db.party.findUnique({ where: { id: partyId } });
  if (!party || party.status !== "FORMING") return;
  if (party.leaderId === character.id) await db.party.delete({ where: { id: partyId } });
  else await db.partyMember.update({ where: { partyId_characterId: { partyId, characterId: character.id } }, data: { status: "LEFT" } });
  revalidatePath("/", "layout");
}

export async function startPartyAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { character } = await requireCharacterUser();
  const partyId = String(formData.get("partyId") ?? "");
  const party = await db.party.findUnique({ where: { id: partyId }, include: { members: true } });
  if (!party || party.leaderId !== character.id) return { error: "파티장만 출발할 수 있습니다." };
  if (party.members.filter((m) => m.status === "JOINED").length < 2) return { error: "함께 갈 멤버가 한 명 이상 합류해야 출발할 수 있습니다." };
  let runId: string;
  try { runId = await startRun(character.id, party.realmId, { partyId }); }
  catch (e) { if (e instanceof EngineError) return { error: e.message }; throw e; }
  revalidatePath("/", "layout");
  redirect(`/explore/${runId}`);
}
