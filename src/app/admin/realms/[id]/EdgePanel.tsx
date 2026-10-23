import { ActionForm } from "@/components/ActionForm";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { ConditionsEditor } from "@/components/admin/ConditionsEditor";
import { OutcomeEffectsEditor } from "@/components/admin/OutcomeEffectsEditor";
import type { EditorOptions } from "@/components/admin/editor-options";
import { CHECK_TARGET_HELP, CHECK_TYPE_OPTIONS, type Condition, type OutcomeEffect } from "@/lib/content-types";
import type { Edge, Node } from "@prisma/client";
import { deleteEdgeFormAction, saveEdgeAction } from "./node-actions";

export function EdgePanel({ realmId, edge, options }: { realmId: string; edge: Edge & { from: Node; to: Node }; options: EditorOptions }) {
  return (
    <section className="panel">
      <div className="panel-title">연결: {edge.from.name} {edge.bidirectional ? "↔" : "→"} {edge.to.name}</div>
      <div className="p-4">
        <ActionForm action={saveEdgeAction} submitLabel="연결 저장" extraButtons={<ConfirmSubmit formAction={deleteEdgeFormAction} message="이 연결을 삭제할까요?">연결 삭제</ConfirmSubmit>}>
          <input type="hidden" name="realmId" value={realmId} />
          <input type="hidden" name="edgeId" value={edge.id} />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="bidirectional" defaultChecked={edge.bidirectional} className="accent-[var(--accent)]" /> 양방향 (끄면 {edge.from.name} → {edge.to.name} 한 방향만)</label>
          <div className="field"><label>통과 조건 (예: 열쇠 아이템 보유)</label><ConditionsEditor initial={edge.conditions as Condition[]} options={options} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="field"><label>통과 판정</label>
              <select name="checkType" className="select" defaultValue={edge.checkType ?? ""}><option value="">없음</option>{CHECK_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
            <div className="field"><label>목표치</label><input name="checkTarget" type="number" min={2} max={30} className="input mono" defaultValue={edge.checkTarget ?? 7} /></div>
          </div>
          <p className="help">{CHECK_TARGET_HELP.map((h) => `${h.target}=${h.label}(${h.chance})`).join(" · ")}. 판정에 실패하면 제자리에 머물고 다시 시도할 수 있습니다.</p>
          <div className="field"><label>실패 텍스트</label><input name="failText" className="input" defaultValue={edge.failText} maxLength={1000} placeholder="예: 문이 꿈쩍도 하지 않는다." /></div>
          <div className="field"><label>실패 효과</label><OutcomeEffectsEditor name="failEffects" initial={edge.failEffects as OutcomeEffect[]} options={options} /></div>
        </ActionForm>
      </div>
    </section>
  );
}
