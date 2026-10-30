import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getConfig } from "@/lib/game-config";
import { PageHeader } from "@/components/admin/PageHeader";
import { ActionForm } from "@/components/ActionForm";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { formatKst } from "@/lib/time";
import { approveSpecialAction, paySpecialRewardAction, setWinnerAction, togglePublicAction } from "../actions";
import { RejectForm } from "./RejectForm";

export default async function AdminSpecialDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [a, cfg] = await Promise.all([db.specialApplication.findUnique({ where: { id }, include: { character: true, realm: true } }), getConfig()]);
  if (!a) notFound();
  return (
    <div>
      <PageHeader title={`특수형 이계 신청: ${a.title}`} description={`${a.character.name} · ${formatKst(a.createdAt)} · ${a.status}`} />
      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <section className="panel"><div className="panel-title">보고서</div><div className="flex flex-col gap-4 p-4"><Sec t="분위기" b={a.atmosphere} /><Sec t="주인" b={a.master} /><Sec t="이상현상" b={a.anomalies} /><Sec t="기타" b={a.extra} /></div></section>
        <div className="flex flex-col gap-4">
          {a.status === "PENDING" && (
            <section className="panel"><div className="panel-title">심사</div><div className="p-4">
              <ActionForm action={approveSpecialAction} submitLabel="승인하고 이계 만들기" extraButtons={<RejectForm id={a.id} />}>
                <input type="hidden" name="id" value={a.id} />
                <div className="field"><label>코멘트 (유저에게 표시)</label><textarea name="comment" className="textarea" maxLength={1000} /></div>
                <p className="help">승인하면 보고서의 분위기를 소개문으로 하는 신청자 전용 이계가 비공개로 생기고 편집기로 이동합니다. 노드·장면·선택지를 구성한 뒤 공개하세요.</p>
              </ActionForm>
            </div></section>
          )}
          {a.status === "APPROVED" && (
            <section className="panel"><div className="panel-title">이계</div><div className="flex flex-col gap-2 p-4 text-sm">
              {a.realm ? <><p>{a.realm.name} · {a.realm.isPublished ? <span className="tag tag-ok">공개</span> : <span className="tag">비공개 (작성 중)</span>} · {a.realm.applicantId ? "신청자 전용" : "모두 입장 가능"}</p><Link href={`/admin/realms/${a.realm.id}`} className="btn btn-sm self-start">편집기 열기</Link></> : <p className="help">이계가 삭제되었습니다.</p>}
            </div></section>
          )}
          <section className="panel"><div className="panel-title">보수</div><div className="p-4">
            <ActionForm action={paySpecialRewardAction} submitLabel="보수 지급·조정" submitClassName="btn btn-sm">
              <input type="hidden" name="id" value={a.id} />
              <div className="field"><label>지급 총액 (P)</label><input name="reward" type="number" min={0} className="input mono" defaultValue={a.rewardPaid || cfg["special.defaultReward"]} /></div>
              <p className="help">지금까지 지급한 금액: {a.rewardPaid}P. 입력한 총액과의 차액만 반영됩니다.</p>
            </ActionForm>
          </div></section>
          <section className="panel"><div className="panel-title">공개 · 1등</div><div className="flex flex-col gap-2 p-4 text-sm">
            <form action={togglePublicAction}><input type="hidden" name="id" value={a.id} /><button className="btn btn-sm" type="submit">보고서 {a.isReportPublic ? "비공개로" : "모두에게 공개"}</button></form>
            <form action={setWinnerAction}><input type="hidden" name="id" value={a.id} /><ConfirmSubmit message={a.isWinner ? "1등 선정을 해제할까요? 이계가 다시 신청자 전용이 됩니다." : "이 이계를 1등으로 선정할까요? 보고서가 공개되고 이계가 정식 공략 루트로 모두에게 개방·지도에 영구 등록됩니다."} className={`btn btn-sm ${a.isWinner ? "" : "btn-primary"}`}>{a.isWinner ? "1등 해제" : "1등 선정 (정식 공략 루트)"}</ConfirmSubmit></form>
          </div></section>
        </div>
      </div>
    </div>
  );
}


function Sec({ t, b }: { t: string; b: string }) { return b ? <div><p className="hud-label mb-1">{t}</p><p className="whitespace-pre-wrap text-sm leading-relaxed">{b}</p></div> : null; }
