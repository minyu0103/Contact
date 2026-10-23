"use client";

import { useActionState } from "react";
import { enterRealmAction } from "@/app/(game)/explore/actions";

export function EnterForm({ realmId, disabled }: { realmId: string; disabled: boolean }) {
  const [state, action, pending] = useActionState(enterRealmAction, undefined);
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="realmId" value={realmId} />
      {state?.error && <p className="error">{state.error}</p>}
      <button className="btn btn-primary btn-block" disabled={pending || disabled}>{pending ? "이동 중..." : disabled ? "행동력 없음" : "이계로 이동 (행동력 −1)"}</button>
    </form>
  );
}
