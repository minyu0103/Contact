"use client";

import { useActionState } from "react";
import { installAction } from "../actions";
import { SubmitButton } from "@/components/SubmitButton";

export function InstallForm() {
  const [state, action] = useActionState(installAction, undefined);
  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="field">
        <label htmlFor="inviteCode">초대 코드</label>
        <input id="inviteCode" name="inviteCode" className="input mono uppercase" placeholder="XXXX-XXXX" autoComplete="off" required />
      </div>
      <div className="field">
        <label htmlFor="loginId">아이디</label>
        <input id="loginId" name="loginId" className="input" placeholder="영문, 숫자, 밑줄 3~20자" autoComplete="username" required />
      </div>
      <div className="field">
        <label htmlFor="password">비밀번호</label>
        <input id="password" name="password" type="password" className="input" placeholder="6자 이상" autoComplete="new-password" required />
      </div>
      <div className="field">
        <label htmlFor="passwordConfirm">비밀번호 확인</label>
        <input id="passwordConfirm" name="passwordConfirm" type="password" className="input" autoComplete="new-password" required />
      </div>
      {state?.error && <p className="error">{state.error}</p>}
      <SubmitButton pendingText="설치 중...">설치 시작</SubmitButton>
    </form>
  );
}
