import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/PageHeader";
import { ActionForm } from "@/components/ActionForm";
import { updateNoticeAction } from "../actions";

export default async function EditNoticePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const n = await db.notice.findUnique({ where: { id } });
  if (!n) notFound();
  return (
    <div className="max-w-2xl">
      <PageHeader title="공지 수정" />
      <section className="panel"><div className="p-4">
        <ActionForm action={updateNoticeAction}>
          <input type="hidden" name="id" value={n.id} />
          <div className="field"><label htmlFor="title">제목</label><input id="title" name="title" className="input" defaultValue={n.title} maxLength={100} required /></div>
          <div className="field"><label htmlFor="body">내용</label><textarea id="body" name="body" className="textarea min-h-[12rem]" defaultValue={n.body} maxLength={5000} required /></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="pinned" defaultChecked={n.pinned} className="accent-[var(--accent)]" /> 고정</label>
        </ActionForm>
      </div></section>
    </div>
  );
}
