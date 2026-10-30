"use client";

import { useActionState } from "react";
import { rejectSpecialAction } from "../actions";

/** 승인 양식 옆에 두는 반려 버튼. 같은 코멘트 칸의 내용을 읽어 반려 액션으로 보낸다. */
export function RejectForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(rejectSpecialAction, undefined);
  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" className="btn btn-danger" disabled={pending} onClick={(e) => {
        const form = (e.currentTarget.closest("form") as HTMLFormElement | null);
        const comment = (form?.querySelector("textarea[name=comment]") as HTMLTextAreaElement | null)?.value ?? "";
        if (!comment.trim()) { alert("반려할 때는 코멘트를 적어 주세요."); return; }
        if (!confirm("반려할까요?")) return;
        const fd = new FormData(); fd.set("id", id); fd.set("comment", comment);
        action(fd);
      }}>반려</button>
      {state?.error && <span className="error">{state.error}</span>}{state?.success && <span className="success">{state.success}</span>}
    </span>
  );
}
