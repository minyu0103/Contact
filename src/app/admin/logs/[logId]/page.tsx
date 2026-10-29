import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/PageHeader";
import { ActionForm } from "@/components/ActionForm";
import { formatKst } from "@/lib/time";
import { reviewLogAction } from "../actions";
import { ReviewButtons } from "./ReviewButtons";
import { createEntryFromLogAction } from "@/app/admin/archive/actions";

export default async function AdminLogReviewPage({ params }: { params: Promise<{ logId: string }> }) {
  const { logId } = await params;
  const log = await db.explorationLog.findUnique({ where: { id: logId }, include: { character: true, realm: true, node: true, run: { select: { id: true, startedAt: true, hadCamera: true } }, archiveEntry: true } });
  if (!log) notFound();
  return (
    <div>
      <PageHeader title={`${log.kind === "DIARY" ? "일기" : "카메라"} 로그: ${log.title}`} description={`${log.character.name} · ${log.realm.name}${log.node ? ` · ${log.node.name}` : ""} · ${formatKst(log.createdAt)} · 글자 수 ${log.body.length}`} />
      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <section className="panel">
          <div className="panel-title">본문</div>
          <div className="flex flex-col gap-3 p-4">
            {log.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={log.imageUrl} alt="" className="max-h-[32rem] w-auto max-w-full border border-line-2 object-contain" />
            )}
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{log.body}</p>
            <div className="flex gap-2"><Link href={`/community/logs/${log.id}`} className="btn btn-sm">유저 화면으로 보기</Link><Link href={`/records/${log.run.id}`} className="btn btn-sm">원본 탐사기록</Link></div>
          </div>
        </section>
        <section className="panel self-start">
          <div className="panel-title">심사<span className="code">{log.status}</span></div>
          <div className="p-4">
            <ActionForm action={reviewLogAction} submitLabel="승인하고 지급" submitName="intent" submitValue="approve" extraButtons={<ReviewButtons />}>
              <input type="hidden" name="logId" value={log.id} />
              <div className="field"><label htmlFor="reward">지급할 보수 (P)</label><input id="reward" name="reward" type="number" min={0} className="input mono" defaultValue={log.rewardPaid || (log.kind === "CAMERA" ? 100 : 0)} /></div>
              <div className="field"><label htmlFor="comment">코멘트 (유저에게 표시)</label><textarea id="comment" name="comment" className="textarea" defaultValue={log.adminComment} maxLength={1000} /></div>
              <p className="help">이미 지급한 금액이 있으면 차액만 반영됩니다. 반려하면 지급분을 회수합니다.</p>
            </ActionForm>
          </div>
        </section>
        {log.kind === "CAMERA" && log.status === "APPROVED" && (
          <section className="panel self-start lg:col-start-2">
            <div className="panel-title">도감 채택</div>
            <div className="p-4 text-sm">
              {log.archiveEntry ? <p>이미 채택됨: <Link href={`/admin/archive/${log.archiveEntry.id}`} className="text-accent">{log.archiveEntry.title}</Link></p> : (
                <form action={createEntryFromLogAction} className="flex items-center gap-2">
                  <input type="hidden" name="logId" value={log.id} />
                  <select name="category" className="select w-auto"><option value="REALM">이계</option><option value="CREATURE">이계 생물</option><option value="INFECTED">감염물</option></select>
                  <button className="btn btn-sm" type="submit">이 로그로 문서 만들기</button>
                </form>
              )}
              <p className="help mt-2">본문이 1단계로 들어가고 작성자 이름이 문서에 남습니다. 만든 뒤 비공개 상태에서 다듬어 공개하세요.</p>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
