import { ActionForm } from "@/components/ActionForm";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { ChoiceEditor, type ChoiceData } from "@/components/admin/ChoiceEditor";
import type { EditorOptions } from "@/components/admin/editor-options";
import type { Condition, OutcomeEffect } from "@/lib/content-types";
import type { Prisma } from "@prisma/client";
import { deleteNodeAction } from "../actions";
import { addChoiceAction, addSceneAction, deleteChoiceAction, deleteSceneAction, moveChoiceAction, saveNodeAction, saveSceneAction } from "./node-actions";
import { HostileForm } from "./HostileForm";

type NodeFull = Prisma.NodeGetPayload<{ include: { scenes: { include: { choices: { include: { successOutcome: true; failOutcome: true } } } }; revealedBy: true } }>;

export function NodePanel({ realmId, node, isStart, options, cfgDefaults }: { realmId: string; node: NodeFull; isStart: boolean; options: EditorOptions; cfgDefaults: { rewardNew: number; rewardKnown: number } }) {
  const scenes = [...node.scenes].sort((a, b) => (a.kind === b.kind ? a.sortOrder - b.sortOrder : a.kind === "BASE" ? -1 : 1));
  const sceneOptions: EditorOptions = { ...options, scenes: scenes.map((s) => ({ id: s.id, name: s.kind === "BASE" ? "기본 장면" : s.name || "(이름 없음)" })) };
  return (
    <div className="flex flex-col gap-4">
      <section className="panel">
        <div className="panel-title">노드: {node.name}{isStart && <span className="tag tag-accent ml-2">시작 노드</span>}<span className="code">{node.revealedAt ? `공개됨 · ${node.revealedBy?.name ?? "-"}` : "미공개"}</span></div>
        <div className="p-4">
          <ActionForm action={saveNodeAction} submitLabel="노드 저장" extraButtons={!isStart && (
            <ConfirmSubmit formAction={deleteNodeAction} message={`노드 "${node.name}"을(를) 삭제할까요? 연결과 장면, 선택지가 모두 사라집니다.`}>노드 삭제</ConfirmSubmit>
          )}>
            <input type="hidden" name="realmId" value={realmId} />
            <input type="hidden" name="nodeId" value={node.id} />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="field col-span-2"><label htmlFor="n-name">이름</label><input id="n-name" name="name" className="input" defaultValue={node.name} maxLength={40} required /></div>
              <div className="field"><label htmlFor="n-depth">층 (깊이)</label><input id="n-depth" name="depth" type="number" min={0} className="input mono" defaultValue={node.depth} /></div>
            </div>
            <div className="field"><label htmlFor="n-desc">묘사 텍스트 (노드에 들어갔을 때)</label><textarea id="n-desc" name="description" className="textarea min-h-[7rem]" defaultValue={node.description} maxLength={5000} /></div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <label className="flex items-center gap-2 pt-5 text-sm"><input type="checkbox" name="isExit" defaultChecked={node.isExit} className="accent-[var(--accent)]" /> 출구 노드</label>
              <div className="field"><label htmlFor="n-ero">진입 침식률</label><input id="n-ero" name="entryErosion" type="number" min={0} className="input mono" defaultValue={node.entryErosion ?? ""} placeholder={`기본 (층 수 ${node.depth})`} /></div>
              <div className="field"><label htmlFor="n-rn">새 공개 보수 P</label><input id="n-rn" name="rewardNew" type="number" min={0} className="input mono" defaultValue={node.rewardNew ?? ""} placeholder={`기본 ${cfgDefaults.rewardNew}`} /></div>
              <div className="field"><label htmlFor="n-rk">재진입 보수 P</label><input id="n-rk" name="rewardKnown" type="number" min={0} className="input mono" defaultValue={node.rewardKnown ?? ""} placeholder={`기본 ${cfgDefaults.rewardKnown}`} /></div>
            </div>
            <p className="help">비워 두면 게임 설정의 기본값을 씁니다.</p>
          </ActionForm>
        </div>
      </section>

      {scenes.map((scene) => (
        <section key={scene.id} className="panel">
          <div className="panel-title">
            {scene.kind === "BASE" ? "기본 장면" : `이벤트 장면: ${scene.name || "(이름 없음)"}`}
            {scene.kind === "EVENT" && <span className="code">{scene.mandatory ? "반드시 발생" : `${scene.chance}%`}</span>}
          </div>
          <div className="flex flex-col gap-3 p-4">
            <ActionForm action={saveSceneAction} submitLabel="장면 저장" submitClassName="btn btn-sm" extraButtons={scene.kind === "EVENT" && (
              <ConfirmSubmit formAction={deleteSceneAction} message={`이벤트 장면 "${scene.name}"을(를) 삭제할까요? 선택지도 함께 사라집니다.`}>장면 삭제</ConfirmSubmit>
            )}>
              <input type="hidden" name="realmId" value={realmId} />
              <input type="hidden" name="sceneId" value={scene.id} />
              {scene.kind === "EVENT" && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="field col-span-2"><label>이벤트 이름 (운영자용)</label><input name="name" className="input" defaultValue={scene.name} maxLength={40} /></div>
                  <div className="field"><label>발생 확률 %</label><input name="chance" type="number" min={0} max={100} className="input mono" defaultValue={scene.chance} /></div>
                  <label className="flex items-center gap-2 pt-5 text-sm"><input type="checkbox" name="mandatory" defaultChecked={scene.mandatory} className="accent-[var(--accent)]" /> 반드시 발생</label>
                </div>
              )}
              <div className="field"><label>{scene.kind === "BASE" ? "기본 장면 텍스트 (묘사 아래에 표시, 비워도 됨)" : "이벤트 텍스트"}</label><textarea name="text" className="textarea min-h-[5rem]" defaultValue={scene.text} maxLength={5000} /></div>
            </ActionForm>

            <div className="divider-label">선택지 {scene.choices.length}개</div>
            {[...scene.choices].sort((a, b) => a.sortOrder - b.sortOrder).map((c) => {
              const data: ChoiceData = {
                id: c.id, text: c.text, conditions: c.conditions as Condition[], lockedDisplay: c.lockedDisplay, checkType: c.checkType, checkTarget: c.checkTarget, oncePerRun: c.oncePerRun,
                success: c.successOutcome ? { text: c.successOutcome.text, effects: c.successOutcome.effects as OutcomeEffect[] } : null,
                fail: c.failOutcome ? { text: c.failOutcome.text, effects: c.failOutcome.effects as OutcomeEffect[] } : null,
              };
              return (
                <ChoiceEditor key={c.id} realmId={realmId} choice={data} options={sceneOptions}>
                  <form action={moveChoiceAction} className="flex gap-0.5">
                    <input type="hidden" name="realmId" value={realmId} /><input type="hidden" name="choiceId" value={c.id} />
                    <button className="btn btn-ghost btn-sm" name="dir" value="up" type="submit" title="위로">↑</button>
                    <button className="btn btn-ghost btn-sm" name="dir" value="down" type="submit" title="아래로">↓</button>
                  </form>
                  <form action={deleteChoiceAction}>
                    <input type="hidden" name="realmId" value={realmId} /><input type="hidden" name="choiceId" value={c.id} />
                    <ConfirmSubmit message={`선택지 "${c.text}"을(를) 삭제할까요?`} className="btn btn-ghost btn-sm text-danger">삭제</ConfirmSubmit>
                  </form>
                </ChoiceEditor>
              );
            })}
            <form action={addChoiceAction}>
              <input type="hidden" name="realmId" value={realmId} /><input type="hidden" name="sceneId" value={scene.id} />
              <button className="btn btn-sm" type="submit">+ 선택지 추가</button>
            </form>
          </div>
        </section>
      ))}

      <div className="flex flex-wrap gap-2">
        <form action={addSceneAction}>
          <input type="hidden" name="realmId" value={realmId} /><input type="hidden" name="nodeId" value={node.id} />
          <button className="btn" type="submit">+ 이벤트 장면 추가</button>
        </form>
      </div>
      <HostileForm realmId={realmId} nodeId={node.id} dropTables={options.dropTables} />
      <p className="help">이동 선택지(“→ 노드 이름”)는 그래프의 연결에서 자동으로 만들어지므로 여기서 따로 적지 않습니다.</p>
    </div>
  );
}
