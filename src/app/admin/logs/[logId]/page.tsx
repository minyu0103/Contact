import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/PageHeader";
import { ActionForm } from "@/components/ActionForm";
import { formatKst } from "@/lib/time";
import { reviewLogAction } from "../actions";
import { ReviewButtons } from "./ReviewButtons";

export default async function AdminLogReviewPage({ params }: { params: Promise<{ logId: string }> }) {
  const { logId } = await params;
  const log = await db.explorationLog.findUnique({ where: { id: logId }, include: { character: true, realm: true, node: true, run: { select: { id: true, startedAt: true, hadCamera: true } } } });
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
      </div>
    </div>
  );
}
