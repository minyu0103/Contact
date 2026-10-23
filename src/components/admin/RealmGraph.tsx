"use client";

import { useCallback, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ReactFlow, Background, Controls, MarkerType, Handle, Position, type Node, type Edge, type OnConnect, type NodeProps } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { addEdgeAction, addNodeAction, moveNodesAction } from "@/app/admin/realms/actions";

export type GraphNode = { id: string; name: string; depth: number; isExit: boolean; posX: number; posY: number; revealed: boolean; isStart: boolean; sceneCount: number; choiceCount: number };
export type GraphEdge = { id: string; fromId: string; toId: string; bidirectional: boolean; hasCondition: boolean };

type RNode = Node<GraphNode, "realm">;

function RealmNode({ data, selected }: NodeProps<RNode>) {
  return (
    <div className={`min-w-[8.5rem] border bg-bg-2 px-3 py-2 text-xs shadow-lg ${selected ? "border-accent shadow-[0_0_14px_rgba(114,214,227,0.35)]" : "border-line-2"}`}>
      <Handle type="target" position={Position.Top} className="!h-2 !w-2 !bg-accent-2" />
      <div className="flex items-center gap-1.5">
        <span className="mono text-[0.6rem] text-fg-mute">{data.depth}F</span>
        <span className="font-semibold text-fg">{data.name}</span>
      </div>
      <div className="mt-1 flex flex-wrap gap-1">
        {data.isStart && <span className="tag tag-accent !px-1 !py-0 !text-[0.58rem]">시작</span>}
        {data.isExit && <span className="tag tag-ok !px-1 !py-0 !text-[0.58rem]">출구</span>}
        {data.revealed && <span className="tag !px-1 !py-0 !text-[0.58rem]">공개됨</span>}
        <span className="mono text-[0.58rem] text-fg-mute">장면 {data.sceneCount} · 선택지 {data.choiceCount}</span>
      </div>
      <Handle type="source" position={Position.Bottom} className="!h-2 !w-2 !bg-accent-2" />
    </div>
  );
}

const nodeTypes = { realm: RealmNode };

/** 이계 노드 그래프 편집기. 끌어서 옮기고, 아래 손잡이에서 위 손잡이로 끌어 연결한다. */
export function RealmGraph({ realmId, nodes, edges, selectedNodeId, selectedEdgeId }: { realmId: string; nodes: GraphNode[]; edges: GraphEdge[]; selectedNodeId?: string; selectedEdgeId?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const rfNodes: RNode[] = useMemo(() => nodes.map((n) => ({ id: n.id, type: "realm", position: { x: n.posX, y: n.posY }, data: n, selected: n.id === selectedNodeId })), [nodes, selectedNodeId]);
  const rfEdges: Edge[] = useMemo(() => edges.map((e) => ({
    id: e.id, source: e.fromId, target: e.toId, selected: e.id === selectedEdgeId,
    label: e.hasCondition ? "조건" : undefined,
    labelStyle: { fill: "#e6b94d", fontSize: 10 },
    labelBgStyle: { fill: "#0a0d12" },
    style: { stroke: e.id === selectedEdgeId ? "#72d6e3" : e.hasCondition ? "#e6b94d" : "#3aa3b3", strokeWidth: 1.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: e.hasCondition ? "#e6b94d" : "#3aa3b3" },
    markerStart: e.bidirectional ? { type: MarkerType.ArrowClosed, color: e.hasCondition ? "#e6b94d" : "#3aa3b3", orient: "auto-start-reverse" } : undefined,
  })), [edges, selectedEdgeId]);

  // 노드·연결 구성이 바뀌면 캔버스를 다시 그린다 (위치 이동만으로는 바뀌지 않음)
  const graphKey = useMemo(() => nodes.map((n) => `${n.id}:${n.name}:${n.depth}:${n.isExit}:${n.isStart}:${n.sceneCount}:${n.choiceCount}`).join("|") + "#" + edges.map((e) => `${e.id}:${e.bidirectional}:${e.hasCondition}`).join("|"), [nodes, edges]);

  const onConnect: OnConnect = useCallback((c) => {
    if (!c.source || !c.target) return;
    startTransition(async () => {
      await addEdgeAction(realmId, c.source, c.target);
      router.refresh();
    });
  }, [realmId, router]);

  const onAddNode = () => {
    const maxY = nodes.reduce((m, n) => Math.max(m, n.posY), 0);
    startTransition(async () => {
      const id = await addNodeAction(realmId, 40 + (nodes.length % 4) * 180, maxY + 120);
      router.push(`/admin/realms/${realmId}?node=${id}`);
      router.refresh();
    });
  };

  return (
    <div className="relative h-[26rem] border border-line bg-bg">
      <div className="absolute left-2 top-2 z-10 flex items-center gap-2">
        <button type="button" className="btn btn-primary btn-sm" onClick={onAddNode} disabled={pending}>+ 노드 추가</button>
        <span className="help">노드 클릭: 편집 · 끌기: 이동 · 아래 손잡이→위 손잡이: 연결 · 연결 클릭: 조건 편집</span>
        {pending && <span className="tag tag-accent">저장 중</span>}
      </div>
      <ReactFlow
        key={graphKey}
        colorMode="dark"
        nodeTypes={nodeTypes}
        defaultNodes={rfNodes}
        defaultEdges={rfEdges}
        fitView
        fitViewOptions={{ padding: 0.3, maxZoom: 1.2 }}
        minZoom={0.3}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        onConnect={onConnect}
        onNodeClick={(_, n) => router.push(`/admin/realms/${realmId}?node=${n.id}`)}
        onEdgeClick={(_, e) => router.push(`/admin/realms/${realmId}?edge=${e.id}`)}
        onPaneClick={() => router.push(`/admin/realms/${realmId}`)}
        onNodeDragStop={(_, __, dragged) => {
          startTransition(async () => {
            await moveNodesAction(realmId, dragged.map((n) => ({ id: n.id, x: Math.round(n.position.x), y: Math.round(n.position.y) })));
          });
        }}
        deleteKeyCode={null}
      >
        <Background color="rgba(114,214,227,0.12)" gap={24} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
