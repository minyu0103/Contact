"use client";

import { useActionState } from "react";

export type FormState = { error?: string; success?: string } | undefined;
type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

/**
 * 서버 액션 결과(오류·성공 메시지)를 보여 주는 공용 양식.
 * children은 서버 컴포넌트에서 넘겨도 된다.
 */
export function ActionForm({ action, children, className = "flex flex-col gap-4", submitLabel = "저장", pendingLabel = "저장 중...", submitClassName = "btn btn-primary", extraButtons, submitName, submitValue }: {
  action: Action;
  children: React.ReactNode;
  className?: string;
  submitLabel?: string;
  pendingLabel?: string;
  submitClassName?: string;
  extraButtons?: React.ReactNode;
  submitName?: string;
  submitValue?: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} className={className}>
      {children}
      {state?.error && <p className="error">{state.error}</p>}
      {state?.success && <p className="success">{state.success}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" className={submitClassName} disabled={pending} name={submitName} value={submitValue}>{pending ? pendingLabel : submitLabel}</button>
        {extraButtons}
      </div>
    </form>
  );
}
