"use client";

import { useActionState, useState } from "react";
import { CHECK_TARGET_HELP, CHECK_TYPE_OPTIONS, type Condition, type OutcomeEffect } from "@/lib/content-types";
import { saveChoiceAction } from "@/app/admin/realms/[id]/node-actions";
import { ConditionsEditor } from "./ConditionsEditor";
import { OutcomeEffectsEditor } from "./OutcomeEffectsEditor";
import type { EditorOptions } from "./editor-options";

export type ChoiceData = {
  id: string; text: string; conditions: Condition[]; lockedDisplay: "HIDE" | "SHOW_LOCKED"; checkType: string | null; checkTarget: number | null; oncePerRun: boolean;
  success: { text: string; effects: OutcomeEffect[] } | null;
  fail: { text: string; effects: OutcomeEffect[] } | null;
};

/** 선택지 하나의 편집 양식 */
export function ChoiceEditor({ realmId, choice, options, children }: { realmId: string; choice: ChoiceData; options: EditorOptions; children?: React.ReactNode }) {
  const [state, action, pending] = useActionState(saveChoiceAction, undefined);
  const [checkType, setCheckType] = useState(choice.checkType ?? "");
  const [open, setOpen] = useState(choice.text === "새 선택지");
  return (
    <div className="border border-line bg-bg/40">
      <div className="flex items-center gap-2 px-3 py-2">
        <button type="button" className="mono text-xs text-fg-mute" onClick={() => setOpen((o) => !o)}>{open ? "▾" : "▸"}</button>
        <button type="button" className="flex-1 text-left text-sm font-semibold" onClick={() => setOpen((o) => !o)}>{choice.text}</button>
        {choice.checkType && <span className="tag">{CHECK_TYPE_OPTIONS.find((o) => o.value === choice.checkType)?.label} {choice.checkTarget}</span>}
        {choice.conditions.length > 0 && <span className="tag tag-warn">조건 {choice.conditions.length}</span>}
        {children}
      </div>
      {open && (
        <form action={action} className="flex flex-col gap-3 border-t border-line p-3">
          <input type="hidden" name="realmId" value={realmId} />
          <input type="hidden" name="choiceId" value={choice.id} />
          <div className="field"><label>문구 (화면에 보이는 행동)</label><input name="text" className="input" defaultValue={choice.text} maxLength={200} required /></div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="field"><label>판정 종류</label>
              <select name="checkType" className="select" value={checkType} onChange={(e) => setCheckType(e.target.value)}>
                <option value="">없음 (확정 결과)</option>
                {CHECK_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select></div>
            <div className="field"><label>목표치</label><input name="checkTarget" type="number" min={2} max={30} className="input mono" defaultValue={choice.checkTarget ?? 7} disabled={!checkType} /></div>
            <div className="field"><label>조건 미충족 시</label>
              <select name="lockedDisplay" className="select" defaultValue={choice.lockedDisplay}><option value="HIDE">숨김</option><option value="SHOW_LOCKED">잠긴 채 표시</option></select></div>
            <label className="field justify-end"><span className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" name="oncePerRun" defaultChecked={choice.oncePerRun} className="accent-[var(--accent)]" /> 런당 1회만</span></label>
          </div>
          {checkType && (
            <p className="help">2d6 + 보정 ≥ 목표치. {CHECK_TARGET_HELP.map((h) => `${h.target}=${h.label}(${h.chance})`).join(" · ")}</p>
          )}
          <div className="field"><label>표시 조건 (모두 충족해야 표시)</label><ConditionsEditor initial={choice.conditions} options={options} /></div>
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="border border-ok/30 p-3">
              <p className="field-label mb-2 text-ok">{checkType ? "성공 결과" : "결과"}</p>
              <textarea name="successText" className="textarea mb-2 min-h-[4.5rem]" placeholder="결과 텍스트" defaultValue={choice.success?.text ?? ""} />
              <OutcomeEffectsEditor name="successEffects" initial={choice.success?.effects ?? []} options={options} />
            </div>
            {checkType && (
              <div className="border border-danger/30 p-3">
                <p className="field-label mb-2 text-danger">실패 결과</p>
                <textarea name="failText" className="textarea mb-2 min-h-[4.5rem]" placeholder="결과 텍스트" defaultValue={choice.fail?.text ?? ""} />
                <OutcomeEffectsEditor name="failEffects" initial={choice.fail?.effects ?? []} options={options} />
              </div>
            )}
          </div>
          {state?.error && <p className="error">{state.error}</p>}
          {state?.success && <p className="success">{state.success}</p>}
          <div><button type="submit" className="btn btn-primary btn-sm" disabled={pending}>{pending ? "저장 중..." : "선택지 저장"}</button></div>
        </form>
      )}
    </div>
  );
}
