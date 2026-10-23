"use client";

import { useActionState } from "react";
import { loginAction } from "../actions";
import { SubmitButton } from "@/components/SubmitButton";

export function LoginForm() {
  const [state, action] = useActionState(loginAction, undefined);
  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="field">
        <label htmlFor="loginId">아이디</label>
        <input id="loginId" name="loginId" className="input" autoComplete="username" required />
      </div>
      <div className="field">
        <label htmlFor="password">비밀번호</label>
        <input id="password" name="password" type="password" className="input" autoComplete="current-password" required />
      </div>
      {state?.error && <p className="error">{state.error}</p>}
      <SubmitButton pendingText="인증 중...">접속</SubmitButton>
    </form>
  );
}
