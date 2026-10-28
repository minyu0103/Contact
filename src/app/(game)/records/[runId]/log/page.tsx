import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireCharacterUser } from "@/lib/auth";
import { getConfig } from "@/lib/game-config";
import { ActionForm } from "@/components/ActionForm";
import { createLogAction } from "./actions";

export default async function NewLogPage({ params, searchParams }: { params: Promise<{ runId: string }>; searchParams: Promise<{ kind?: string }> }) {
  const { runId } = await params;
  const { kind: k } = await searchParams;
  const kind = k === "camera" ? "CAMERA" : "DIARY";
  const { character } = await requireCharacterUser();
  const cfg = await getConfig();
  const run = await db.run.findUnique({ where: { id: runId }, include: { realm: true, logs2: true } });
  if (!run || run.characterId !== character.id || run.isTest) notFound();
  if (run.status === "ACTIVE") redirect(`/explore/${runId}`);
  const existing = run.logs2.find((l) => l.kind === kind);
  if (existing) redirect(`/community/logs/${existing.id}`);
  const visitedIds = Array.isArray(run.visitedNodeIds) ? (run.visitedNodeIds as string[]) : [];
  const nodes = await db.node.findMany({ where: { id: { in: visitedIds } } });
  return (
    <section className="panel mx-auto max-w-2xl">
      <div className="panel-title">{kind === "DIARY" ? "일기 로그" : "카메라 로그"}<span className="code">{run.realm.name}</span></div>
      <div className="p-4">
        {kind === "DIARY" ? (
          <p className="help mb-4">캐릭터가 탐사 결과를 모두에게 공유하는 짧은 글입니다. 올리면 바로 {cfg["log.diaryReward"]}P를 받고, 공감을 {cfg["log.memoThreshold"]}개 이상 받으면 고른 구역에 메모로 남아 뒤에 오는 사람들이 읽게 됩니다.</p>
        ) : !run.hadCamera ? (
          <p className="error mb-4">이 탐사는 이계용 비디오 카메라 없이 입장했습니다. 카메라를 지니고 들어간 탐사만 카메라 로그를 쓸 수 있습니다.</p>
        ) : (
          <p className="help mb-4">탐사기록을 바탕으로 정리된 글 로그 또는 그림 로그를 씁니다. 운영자가 심사한 뒤 분량에 따라 보수를 지급하고, 통과하면 로그 목록에 공개됩니다.</p>
        )}
        <ActionForm action={createLogAction} submitLabel={kind === "DIARY" ? "올리고 보수 받기" : "심사 요청"}>
          <input type="hidden" name="runId" value={run.id} /><input type="hidden" name="kind" value={kind} />
          <div className="field"><label htmlFor="title">제목</label><input id="title" name="title" className="input" maxLength={100} required /></div>
          <div className="field"><label htmlFor="body">내용</label><textarea id="body" name="body" className={`textarea ${kind === "DIARY" ? "min-h-[8rem]" : "min-h-[16rem]"}`} maxLength={kind === "DIARY" ? cfg["log.diaryMaxLength"] : 20000} required /></div>
          {kind === "DIARY" && (
            <div className="field"><label htmlFor="nodeId">메모를 남길 구역 (선택)</label>
              <select id="nodeId" name="nodeId" className="select"><option value="">없음</option>{nodes.map((n) => <option key={n.id} value={n.id}>{n.name} ({n.depth}F)</option>)}</select></div>
          )}
          {kind === "CAMERA" && (
            <div className="field"><label htmlFor="image">그림 (선택, 3MB 이하)</label><input id="image" name="image" type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="input text-sm" /></div>
          )}
        </ActionForm>
        <Link href={`/records/${run.id}`} className="btn btn-ghost btn-sm mt-3">← 탐사기록</Link>
      </div>
    </section>
  );
}
