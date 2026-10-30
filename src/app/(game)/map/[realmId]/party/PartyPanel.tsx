import { db } from "@/lib/db";
import { getConfig } from "@/lib/game-config";
import { ActionForm } from "@/components/ActionForm";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { myFormingParty } from "@/lib/party";
import { CATEGORY_LABEL } from "@/lib/rules";
import { createPartyAction, invitePartyAction, leavePartyAction, respondPartyAction, startPartyAction } from "./actions";

/** 이계 정보 화면의 공동 탐사 패널: 초대 응답, 내 파티, 파티 만들기 */
export async function PartyPanel({ realmId, characterId }: { realmId: string; characterId: string }) {
  const cfg = await getConfig();
  const [party, invites] = await Promise.all([
    myFormingParty(characterId),
    db.partyMember.findMany({ where: { characterId, status: "INVITED", party: { status: "FORMING", realmId } }, include: { party: { include: { leader: true, realm: true } } } }),
  ]);
  const isLeader = party?.leaderId === characterId;
  return (
    <section className="panel">
      <div className="panel-title">공동 탐사<span className="code">최대 {cfg["coop.maxMembers"]}명</span></div>
      <div className="flex flex-col gap-3 p-4 text-sm">
        {invites.map((inv) => (
          <form key={inv.partyId} action={respondPartyAction} className="flex flex-wrap items-center gap-2 border border-accent/40 bg-accent-dim p-2">
            <input type="hidden" name="partyId" value={inv.partyId} />
            <span><b>{inv.party.leader.name}</b>의 파티 초대</span>
            <button className="btn btn-primary btn-sm ml-auto" name="decision" value="accept" disabled={!!party}>수락</button><button className="btn btn-sm" name="decision" value="decline">거절</button>
          </form>
        ))}
        {party ? (
          <>
            <p className="help">{party.realm.name} 탐사 파티 · 파티장 {party.leader.name}{party.realmId !== realmId && " (다른 이계의 파티입니다)"}</p>
            <ul className="flex flex-wrap gap-1.5">
              {party.members.filter((m) => m.status !== "LEFT").map((m) => <li key={m.characterId} className={`tag ${m.status === "JOINED" ? "tag-accent" : ""}`}>{m.character.name} <span className="text-fg-mute">{CATEGORY_LABEL[m.character.category]}{m.status === "INVITED" ? " · 응답 대기" : ""}</span></li>)}
            </ul>
            {isLeader && (
              <ActionForm action={invitePartyAction} submitLabel="초대" submitClassName="btn btn-sm" className="flex items-end gap-2">
                <input type="hidden" name="partyId" value={party.id} />
                <div className="field flex-1"><label>유저 이름</label><input name="name" className="input py-1" required /></div>
              </ActionForm>
            )}
            <div className="flex flex-wrap gap-2">
              {isLeader && party.realmId === realmId && (
                <ActionForm action={startPartyAction} submitLabel="파티 출발 (전원 행동력 −1)" submitClassName="btn btn-primary btn-sm" className="flex flex-col gap-1">
                  <input type="hidden" name="partyId" value={party.id} />
                </ActionForm>
              )}
              <form action={leavePartyAction}><input type="hidden" name="partyId" value={party.id} /><ConfirmSubmit message={isLeader ? "파티를 해산할까요?" : "파티에서 나갈까요?"} className="btn btn-sm">{isLeader ? "해산" : "나가기"}</ConfirmSubmit></form>
            </div>
            <p className="help">전원이 같은 구역을 함께 이동합니다. 선택지는 누구나 고를 수 있고, 판정과 피해는 고른 사람에게 적용됩니다. 탈출하면 보수·경험치·탈출 횟수를 전원이 받고 획득물은 나눠 가지며 침식률이 {cfg["coop.erosionReduce"]} 내려갑니다. 쓰러진 사람만 이탈하고 나머지는 계속 탐사합니다.</p>
          </>
        ) : (
          <ActionForm action={createPartyAction} submitLabel="이 이계 파티 만들기" submitClassName="btn btn-sm" className="flex flex-col gap-2">
            <input type="hidden" name="realmId" value={realmId} />
            <p className="help">혼자가 아니라 여럿이서 들어갑니다. 파티를 만들고 이름으로 초대하세요.</p>
          </ActionForm>
        )}
      </div>
    </section>
  );
}
