import Link from "next/link";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/PageHeader";
import { ActionForm } from "@/components/ActionForm";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { formatKst } from "@/lib/time";
import { createNoticeAction, deleteNoticeAction, togglePinAction } from "./actions";

export default async function NoticesPage() {
  const notices = await db.notice.findMany({ orderBy: [{ pinned: "desc" }, { createdAt: "desc" }], include: { author: true } });
  return (
    <div>
      <PageHeader title="공지" description="홈 화면 맨 위에 표시됩니다. 고정 공지가 먼저, 그다음 최신순으로 최대 5개." />
      <div className="grid gap-4 lg:grid-cols-[24rem_1fr]">
        <section className="panel">
          <div className="panel-title">새 공지</div>
          <div className="p-4">
            <ActionForm action={createNoticeAction} submitLabel="올리기">
              <div className="field"><label htmlFor="title">제목</label><input id="title" name="title" className="input" maxLength={100} required /></div>
              <div className="field"><label htmlFor="body">내용</label><textarea id="body" name="body" className="textarea" maxLength={5000} required /></div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="pinned" className="accent-[var(--accent)]" /> 고정</label>
            </ActionForm>
          </div>
        </section>
        <section className="panel">
          <div className="panel-title">공지 목록<span className="code">{notices.length}</span></div>
          <ul className="divide-y divide-line">
            {notices.map((n) => (
              <li key={n.id} className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  {n.pinned && <span className="tag tag-accent">고정</span>}
                  <span className="font-semibold">{n.title}</span>
                  <span className="mono text-xs text-fg-mute">{formatKst(n.createdAt)} · {n.author?.loginId ?? "-"}</span>
                  <div className="ml-auto flex gap-1.5">
                    <form action={togglePinAction}><input type="hidden" name="id" value={n.id} /><button className="btn btn-sm" type="submit">{n.pinned ? "고정 해제" : "고정"}</button></form>
                    <Link href={`/admin/notices/${n.id}`} className="btn btn-sm">수정</Link>
                    <form action={deleteNoticeAction}><input type="hidden" name="id" value={n.id} /><ConfirmSubmit message={`"${n.title}" 공지를 삭제할까요?`}>삭제</ConfirmSubmit></form>
                  </div>
                </div>
                <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-fg-dim">{n.body}</p>
              </li>
            ))}
            {notices.length === 0 && <li className="help p-4">공지가 없습니다.</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}
