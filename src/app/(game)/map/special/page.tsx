import Link from "next/link";
import { db } from "@/lib/db";
import { requireCharacterUser } from "@/lib/auth";
import { ActionForm } from "@/components/ActionForm";
import { formatKst } from "@/lib/time";
import { applySpecialAction } from "./actions";

const ST = { PENDING: { l: "심사 중", c: "tag-warn" }, APPROVED: { l: "승인", c: "tag-ok" }, REJECTED: { l: "반려", c: "tag-danger" } } as const;

export default async function SpecialPage() {
  const { character } = await requireCharacterUser();
  const [mine, reports] = await Promise.all([
    db.specialApplication.findMany({ where: { characterId: character.id }, orderBy: { createdAt: "desc" }, include: { realm: true } }),
    db.specialApplication.findMany({ where: { isReportPublic: true }, orderBy: [{ isWinner: "desc" }, { createdAt: "desc" }], include: { character: true, realm: true, post: { include: { _count: { select: { reactions: true, comments: true } } } } } }),
  ]);
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_24rem]">
      <div className="flex flex-col gap-4">
        <section className="panel">
          <div className="panel-title">공개된 이계 보고서<span className="code">{reports.length}</span></div>
          <ul className="divide-y divide-line text-sm">
            {reports.length === 0 && <li className="help p-4">아직 공개된 보고서가 없습니다.</li>}
            {reports.map((r) => (
              <li key={r.id} className="px-4 py-2.5">
                <Link href={`/map/special/${r.id}`} className="flex flex-wrap items-center gap-2 hover:text-accent">
                  {r.isWinner && <span className="tag tag-accent">정식 공략 루트</span>}<b>{r.title}</b><span className="text-xs text-fg-dim">{r.character.name}</span>
                  <span className="mono ml-auto text-xs text-fg-mute">◆{r.post._count.reactions} · 댓글 {r.post._count.comments} · {formatKst(r.createdAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <section className="panel">
          <div className="panel-title">내 신청<span className="code">{mine.length}</span></div>
          <ul className="divide-y divide-line text-sm">
            {mine.length === 0 && <li className="help p-4">신청한 적이 없습니다.</li>}
            {mine.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5">
                <span className={`tag ${ST[a.status].c}`}>{ST[a.status].l}</span><Link href={`/map/special/${a.id}`} className="font-semibold hover:text-accent">{a.title}</Link>
                {a.isWinner && <span className="tag tag-accent">1등</span>}{a.rewardPaid > 0 && <span className="tag tag-ok">보수 {a.rewardPaid}P</span>}
                {a.realm && a.realm.isPublished && <Link href={`/map/${a.realm.id}`} className="btn btn-sm ml-auto">이계로 이동</Link>}
              </li>
            ))}
          </ul>
        </section>
        <Link href="/map" className="btn btn-ghost btn-sm self-start">← 세계 지도</Link>
      </div>
      <section className="panel self-start">
        <div className="panel-title">특수형 이계 진입 신청</div>
        <div className="p-4">
          <p className="help mb-3">SCP 문서처럼 이계 보고서를 직접 작성합니다. 운영자가 승인하면 그 설정으로 이계가 만들어지고 신청자만 들어갈 수 있습니다. 다른 이계보다 훨씬 큰 보수를 받으며, 공유할 만한 보고서는 모두에게 공개되고, 1등 이계는 정식 공략 루트로 지도에 영구히 남습니다.</p>
          <ActionForm action={applySpecialAction} submitLabel="신청">
            <div className="field"><label>이계 이름</label><input name="title" className="input" maxLength={60} required /></div>
            <div className="field"><label>분위기</label><textarea name="atmosphere" className="textarea" maxLength={5000} required placeholder="공간, 소리, 냄새, 들어갔을 때의 감각" /></div>
            <div className="field"><label>주인의 설정</label><textarea name="master" className="textarea" maxLength={5000} required placeholder="누구였고 무엇이 되었는지. 토벌이 가능한지" /></div>
            <div className="field"><label>내부 이상현상</label><textarea name="anomalies" className="textarea" maxLength={8000} required placeholder="구역별로 일어나는 일, 규칙, 위험" /></div>
            <div className="field"><label>기타 (선택)</label><textarea name="extra" className="textarea min-h-[3rem]" maxLength={5000} /></div>
          </ActionForm>
        </div>
      </section>
    </div>
  );
}
