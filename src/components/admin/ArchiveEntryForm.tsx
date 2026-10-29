import type { ArchiveEntry } from "@prisma/client";
import { ActionForm } from "@/components/ActionForm";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { deleteEntryAction, saveEntryAction } from "@/app/admin/archive/actions";

export function ArchiveEntryForm({ entry, logs }: { entry: ArchiveEntry | null; logs: { id: string; title: string; author: string }[] }) {
  return (
    <ActionForm action={saveEntryAction} submitLabel={entry ? "저장" : "만들기"} extraButtons={entry && <ConfirmSubmit formAction={deleteEntryAction} message={`"${entry.title}" 문서를 삭제할까요?`}>삭제</ConfirmSubmit>}>
      {entry && <input type="hidden" name="id" value={entry.id} />}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="field"><label htmlFor="category">분류</label><select id="category" name="category" className="select" defaultValue={entry?.category ?? "REALM"}><option value="REALM">이계</option><option value="CREATURE">이계 생물</option><option value="INFECTED">감염물</option></select></div>
        <div className="field"><label htmlFor="code">문서 번호</label><input id="code" name="code" className="input mono" defaultValue={entry?.code ?? ""} placeholder="ARC-001" maxLength={20} /></div>
        <div className="field col-span-2"><label htmlFor="title">제목</label><input id="title" name="title" className="input" defaultValue={entry?.title ?? ""} maxLength={80} required /></div>
      </div>
      <div className="field"><label htmlFor="summary">요약 (목록과 문서 머리에 표시, 항상 공개)</label><textarea id="summary" name="summary" className="textarea" defaultValue={entry?.summary ?? ""} maxLength={2000} /></div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="field col-span-2"><label htmlFor="adoptedLogId">채택한 카메라 로그 (작성자 이름 표시)</label>
          <select id="adoptedLogId" name="adoptedLogId" className="select" defaultValue={entry?.adoptedLogId ?? ""}><option value="">없음</option>{logs.map((l) => <option key={l.id} value={l.id}>{l.title} — {l.author}</option>)}</select></div>
        <div className="field"><label htmlFor="sortOrder">정렬</label><input id="sortOrder" name="sortOrder" type="number" className="input mono" defaultValue={entry?.sortOrder ?? 0} /></div>
        <label className="flex items-center gap-2 pt-5 text-sm"><input type="checkbox" name="isPublished" defaultChecked={entry?.isPublished ?? false} className="accent-[var(--accent)]" /> 공개</label>
      </div>
      <div className="field"><label htmlFor="image">이미지</label>
        {entry?.imageUrl && (
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={entry.imageUrl} alt="" className="h-16 w-16 border border-line object-cover" />
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" name="removeImage" className="accent-[var(--accent)]" /> 제거</label>
          </div>
        )}
        <input id="image" name="image" type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="input text-sm" /></div>
    </ActionForm>
  );
}
