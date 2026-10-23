import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getConfig } from "@/lib/game-config";
import { PageHeader } from "@/components/admin/PageHeader";
import { ActionForm } from "@/components/ActionForm";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { MapPicker } from "@/components/admin/MapPicker";
import { RealmGraph, type GraphEdge, type GraphNode } from "@/components/admin/RealmGraph";
import type { EditorOptions } from "@/components/admin/editor-options";
import { validateRealm } from "@/lib/realm-validate";
import { deleteRealmAction, resetRevealsAction, saveRealmInfoAction } from "../actions";
import { NodePanel } from "./NodePanel";
import { EdgePanel } from "./EdgePanel";

export default async function RealmEditorPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ node?: string; edge?: string }> }) {
  const { id } = await params;
  const { node: nodeId, edge: edgeId } = await searchParams;
  const [realm, items, dropTables, tags, otherRealms, cfg] = await Promise.all([
    db.realm.findUnique({
      where: { id },
      include: {
        nodes: { orderBy: { depth: "asc" }, include: { scenes: { include: { choices: { include: { successOutcome: true, failOutcome: true } } } }, revealedBy: true } },
        edges: { include: { from: true, to: true } },
      },
    }),
    db.item.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
    db.dropTable.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.abilityTag.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.realm.findMany({ where: { id: { not: id } }, select: { id: true, name: true, mapX: true, mapY: true } }),
    getConfig(),
  ]);
  if (!realm) notFound();

  const options: EditorOptions = { items, dropTables, tags, nodes: realm.nodes.map((n) => ({ id: n.id, name: n.name })), scenes: [] };
  const graphNodes: GraphNode[] = realm.nodes.map((n) => ({
    id: n.id, name: n.name, depth: n.depth, isExit: n.isExit, posX: n.posX, posY: n.posY, revealed: !!n.revealedAt, isStart: realm.startNodeId === n.id,
    sceneCount: n.scenes.length, choiceCount: n.scenes.reduce((s, sc) => s + sc.choices.length, 0),
  }));
  const graphEdges: GraphEdge[] = realm.edges.map((e) => ({
    id: e.id, fromId: e.fromId, toId: e.toId, bidirectional: e.bidirectional,
    hasCondition: (Array.isArray(e.conditions) && e.conditions.length > 0) || !!e.checkType,
  }));
  const warnings = validateRealm(realm);
  const selectedNode = nodeId ? realm.nodes.find((n) => n.id === nodeId) : undefined;
  const selectedEdge = edgeId ? realm.edges.find((e) => e.id === edgeId) : undefined;
  const revealed = realm.nodes.filter((n) => n.revealedAt).length;

  return (
    <div>
      <PageHeader title={`이계 편집: ${realm.name}`} description={`노드 ${realm.nodes.length} · 연결 ${realm.edges.length} · 공개 ${revealed}/${realm.nodes.length} · ${realm.isPublished ? "공개 중" : "비공개 (작성 중)"}`} />
      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
        <Link href="/admin/realms" className="btn btn-sm">← 이계 목록</Link>
        <Link href={`/admin/realms/${realm.id}/test`} className="btn btn-sm" title="4단계에서 연결">테스트 플레이</Link>
        <form action={resetRevealsAction} className="ml-auto">
          <input type="hidden" name="id" value={realm.id} />
          <ConfirmSubmit message={`"${realm.name}"의 서버 공개 노드 ${revealed}개를 모두 미공개로 되돌릴까요? 유저들의 지도에서 사라집니다.`} className="btn btn-sm">공개 상태 초기화</ConfirmSubmit>
        </form>
      </div>

      <RealmGraph realmId={realm.id} nodes={graphNodes} edges={graphEdges} selectedNodeId={nodeId} selectedEdgeId={edgeId} />

      {warnings.length > 0 && (
        <div className="mt-3 border border-warn/40 bg-warn/8 p-3 text-sm">
          <p className="mb-1 font-semibold text-warn">오류 검사: {warnings.length}건</p>
          <ul className="list-disc pl-5 text-fg-dim">{warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
        </div>
      )}

      <div className="mt-4">
        {selectedNode ? (
          <NodePanel realmId={realm.id} node={selectedNode} isStart={realm.startNodeId === selectedNode.id} options={options} cfgDefaults={{ rewardNew: cfg["reward.newNode"], rewardKnown: cfg["reward.knownNode"] }} />
        ) : selectedEdge ? (
          <EdgePanel realmId={realm.id} edge={selectedEdge} options={options} />
        ) : (
          <section className="panel">
            <div className="panel-title">기본 정보</div>
            <div className="p-4">
              <ActionForm action={saveRealmInfoAction} submitLabel="기본 정보 저장" extraButtons={
                <ConfirmSubmit formAction={deleteRealmAction} message={`이계 "${realm.name}"을(를) 통째로 삭제할까요? 노드, 연결, 런 기록이 모두 사라지며 되돌릴 수 없습니다.`}>이계 삭제</ConfirmSubmit>
              }>
                <input type="hidden" name="id" value={realm.id} />
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="flex flex-col gap-3">
                    <div className="field"><label htmlFor="r-name">이름</label><input id="r-name" name="name" className="input" defaultValue={realm.name} maxLength={40} required /></div>
                    <div className="field"><label htmlFor="r-intro">소개문 (이계 정보 화면에 표시)</label><textarea id="r-intro" name="intro" className="textarea min-h-[8rem]" defaultValue={realm.intro} maxLength={3000} /></div>
                    <div className="field"><label htmlFor="r-start">시작 노드</label>
                      <select id="r-start" name="startNodeId" className="select" defaultValue={realm.startNodeId ?? ""}>{realm.nodes.map((n) => <option key={n.id} value={n.id}>{n.name} ({n.depth}층)</option>)}</select></div>
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isPublished" defaultChecked={realm.isPublished} className="accent-[var(--accent)]" /> 공개 (유저의 세계 지도에 표시)</label>
                  </div>
                  <div className="field"><label>세계 지도 위치</label>
                    <MapPicker x={realm.mapX} y={realm.mapY} label={realm.name} others={otherRealms.map((r) => ({ id: r.id, x: r.mapX, y: r.mapY, label: r.name }))} /></div>
                </div>
              </ActionForm>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
