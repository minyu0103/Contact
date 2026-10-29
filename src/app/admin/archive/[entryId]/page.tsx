import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/PageHeader";
import { ActionForm } from "@/components/ActionForm";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { ArchiveEntryForm } from "@/components/admin/ArchiveEntryForm";
import { UnlockEditor } from "@/components/admin/UnlockEditor";
import { addStageAction, deleteStageAction, saveStageAction } from "../actions";

export default async function EditArchivePage({ params }: { params: Promise<{ entryId: string }> }) {
  const { entryId } = await params;
  const [entry, logs, realms, items, runs] = await Promise.all([
    db.archiveEntry.findUnique({ where: { id: entryId }, include: { stages: { orderBy: { sortOrder: "asc" } } } }),
    db.explorationLog.findMany({ where: { kind: "CAMERA", status: "APPROVED", OR: [{ archiveEntry: null }, { archiveEntry: { id: entryId } }] }, include: { character: true } }),
    db.realm.findMany({ where: { templateId: null }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.item.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.run.findMany({ select: { clues: true }, take: 500 }),
  ]);
  if (!entry) notFound();
  // 지금까지 등장한 단서 플래그 목록 (자동완성용) + 이계 편집기의 clue 플래그
  const outcomes = await db.outcome.findMany({ select: { effects: true } });
  const flagSet = new Set<string>();
  for (const o of outcomes) for (const e of (Array.isArray(o.effects) ? (o.effects as { type: string; flag?: string }[]) : [])) if ((e.type === "clue" || e.type === "set_flag") && e.flag) flagSet.add(e.flag);
  for (const r of runs) for (const c of (Array.isArray(r.clues) ? (r.clues as { flag: string }[]) : [])) if (c.flag) flagSet.add(c.flag);
  return (
    <div>
      <PageHeader title={`문서: ${entry.title}`} />
      <div className="flex flex-col gap-4">
        <section className="panel"><div className="panel-title">문서 정보</div><div className="p-4"><ArchiveEntryForm entry={entry} logs={logs.map((l) => ({ id: l.id, title: l.title, author: l.character.name }))} /></div></section>
        {entry.stages.map((st, i) => (
          <section key={st.id} className="panel">
            <div className="panel-title">단계 {i + 1}: {st.title}</div>
            <div className="p-4">
              <ActionForm action={saveStageAction} submitLabel="단계 저장" submitClassName="btn btn-sm" extraButtons={entry.stages.length > 1 && (
                <form action={deleteStageAction}><input type="hidden" name="stageId" value={st.id} /><input type="hidden" name="entryId" value={entry.id} /><ConfirmSubmit message="이 단계를 삭제할까요?">단계 삭제</ConfirmSubmit></form>
              )}>
                <input type="hidden" name="stageId" value={st.id} /><input type="hidden" name="entryId" value={entry.id} />
                <div className="field"><label>단계 제목</label><input name="title" className="input max-w-sm" defaultValue={st.title} maxLength={60} /></div>
                <div className="field"><label>본문 (SCP 문서풍. 조건을 채운 유저에게만 보임)</label><textarea name="body" className="textarea min-h-[10rem]" defaultValue={st.body} maxLength={20000} /></div>
                <div className="field"><label>해금 조건</label><UnlockEditor name="conditions" initial={(st.conditions as { type: "flag" | "realm_escapes" | "item"; flag?: string; realmId?: string; count?: number; itemId?: string }[]).map((c) => ({ type: c.type, flag: c.flag ?? "", realmId: c.realmId ?? "", count: c.count ?? 1, itemId: c.itemId ?? "" }))} realms={realms} items={items} flags={[...flagSet].sort()} /></div>
                <div className="field"><label>잠겼을 때 힌트 (비우면 조건을 풀어서 보여 줌)</label><input name="hint" className="input" defaultValue={st.hint} maxLength={300} placeholder="예: 지하에서 무언가를 찾아야 한다" /></div>
              </ActionForm>
            </div>
          </section>
        ))}
        <form action={addStageAction} className="flex gap-2"><input type="hidden" name="entryId" value={entry.id} /><button className="btn" type="submit">+ 단계 추가</button>{entry.stages.length > 1 && <span className="help self-center">단계 삭제는 각 단계의 양식에서 할 수 있습니다. 순서는 추가한 순서입니다.</span>}</form>
      </div>
    </div>
  );
}
