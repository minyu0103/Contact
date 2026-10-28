import { ActionForm } from "@/components/ActionForm";
import { createPostAction } from "../../actions";

export default function NewBoardPostPage() {
  return (
    <section className="panel">
      <div className="panel-title">글쓰기</div>
      <div className="p-4">
        <ActionForm action={createPostAction} submitLabel="올리기">
          <input type="hidden" name="kind" value="BOARD" />
          <div className="field"><label htmlFor="title">제목</label><input id="title" name="title" className="input" maxLength={100} required /></div>
          <div className="field"><label htmlFor="body">내용</label><textarea id="body" name="body" className="textarea min-h-[12rem]" maxLength={10000} required /></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isAnonymous" className="accent-[var(--accent)]" /> 익명으로 올리기 (댓글도 모두 익명이 되며 RP 인정은 되지 않습니다)</label>
        </ActionForm>
      </div>
    </section>
  );
}
