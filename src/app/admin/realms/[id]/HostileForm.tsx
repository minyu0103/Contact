import { ActionForm } from "@/components/ActionForm";
import type { Opt } from "@/components/admin/editor-options";
import { addHostileEventAction } from "./node-actions";

/** 적대 존재 이벤트 양식: 입력하면 이벤트 장면과 맞선다·우회한다·도주한다 선택지가 자동 생성된다. */
export function HostileForm({ realmId, nodeId, dropTables }: { realmId: string; nodeId: string; dropTables: Opt[] }) {
  return (
    <details className="panel">
      <summary className="panel-title cursor-pointer">적대 존재 이벤트 추가 (자동 생성)</summary>
      <div className="p-4">
        <ActionForm action={addHostileEventAction} submitLabel="이벤트와 선택지 3개 만들기">
          <input type="hidden" name="realmId" value={realmId} /><input type="hidden" name="nodeId" value={nodeId} />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="field col-span-2"><label>적 이름</label><input name="name" className="input" maxLength={40} required placeholder="예: 붕대 감은 것" /></div>
            <div className="field"><label>위협도 (전투 목표치)</label><input name="threat" type="number" min={2} max={30} className="input mono" defaultValue={7} /></div>
            <div className="field"><label>발생 확률 %</label><input name="chance" type="number" min={0} max={100} className="input mono" defaultValue={40} /></div>
          </div>
          <div className="field"><label>묘사</label><textarea name="description" className="textarea min-h-[4rem]" maxLength={3000} placeholder="복도 끝에서 붕대를 질질 끌며 다가온다." /></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="mandatory" className="accent-[var(--accent)]" /> 반드시 발생</label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="field"><label>처치 보상 P</label><input name="killPoints" type="number" min={0} className="input mono" defaultValue={20} /></div>
            <div className="field"><label>처치 드랍 테이블</label><select name="killDropTableId" className="select"><option value="">없음</option>{dropTables.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
            <div className="field"><label>패배·실패 피해 (체력)</label><input name="damage" type="number" min={0} className="input mono" defaultValue={2} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="field"><label>우회 판정</label><select name="bypassCheck" className="select"><option value="SEARCH">탐색</option><option value="GENERAL">일반</option></select></div>
            <div className="field"><label>우회 목표치</label><input name="bypassTarget" type="number" min={2} max={30} className="input mono" defaultValue={7} /></div>
            <div className="field"><label>도주 방식</label><select name="fleeMode" className="select"><option value="damage">확정 피해 후 직전 노드로</option><option value="check">일반 판정 (실패 시 피해)</option></select></div>
            <div className="grid grid-cols-2 gap-2">
              <div className="field"><label>도주 목표치</label><input name="fleeTarget" type="number" min={2} max={30} className="input mono" defaultValue={5} /></div>
              <div className="field"><label>도주 피해</label><input name="fleeDamage" type="number" min={0} className="input mono" defaultValue={1} /></div>
            </div>
          </div>
          <p className="help">맞선다: 전투형만 보임(잠긴 채 표시), 전투 판정 목표치 = 위협도. 우회한다: 누구나. 도주한다: 직전 노드로 이동.</p>
        </ActionForm>
      </div>
    </details>
  );
}
