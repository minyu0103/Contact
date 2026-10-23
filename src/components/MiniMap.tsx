import type { MiniEdge, MiniNode } from "@/lib/engine/engine";

/** 이계 내부 지도: 노드를 점, 연결을 선으로. 편집기 좌표를 그대로 쓴다. */
export function MiniMap({ nodes, edges, height = 260 }: { nodes: MiniNode[]; edges: MiniEdge[]; height?: number }) {
  if (nodes.length === 0) return <p className="help p-4">아직 밝혀진 구역이 없습니다.</p>;
  const pad = 60;
  const xs = nodes.map((n) => n.x), ys = nodes.map((n) => n.y);
  const minX = Math.min(...xs) - pad, maxX = Math.max(...xs) + pad + 80;
  const minY = Math.min(...ys) - pad, maxY = Math.max(...ys) + pad;
  const w = Math.max(240, maxX - minX), h = Math.max(160, maxY - minY);
  const pos = (n: MiniNode) => ({ cx: n.x - minX + 40, cy: n.y - minY + 20 });
  const byId = new Map(nodes.map((n) => [n.id, n]));
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="block w-full" style={{ maxHeight: height }} role="img" aria-label="이계 지도">
      {edges.map((e) => {
        const a = byId.get(e.from), b = byId.get(e.to);
        if (!a || !b) return null;
        const pa = pos(a), pb = pos(b);
        const dim = !a.known || !b.known;
        return <line key={e.id} x1={pa.cx} y1={pa.cy} x2={pb.cx} y2={pb.cy} stroke={dim ? "rgba(148,170,196,0.25)" : "rgba(114,214,227,0.5)"} strokeWidth="1.5" strokeDasharray={dim ? "4 4" : undefined} />;
      })}
      {nodes.map((n) => {
        const p = pos(n);
        return (
          <g key={n.id} transform={`translate(${p.cx} ${p.cy})`}>
            {n.current && <circle r="14" fill="none" stroke="#72d6e3" strokeWidth="1.5"><animate attributeName="r" values="10;16;10" dur="2s" repeatCount="indefinite" /></circle>}
            <circle r="6" fill={n.current ? "#72d6e3" : n.known ? (n.visited ? "#3aa3b3" : "#1b242f") : "#0a0d12"} stroke={n.known ? "#72d6e3" : "#5f6e7f"} strokeWidth="1.5" strokeDasharray={n.known ? undefined : "2 2"} />
            {n.isExit && <rect x="-3" y="-3" width="6" height="6" fill="#83d690" />}
            <text x="11" y="4" fontSize="12" fill={n.known ? "#e3e9f0" : "#5f6e7f"} fontWeight={n.current ? 700 : 500}>{n.name}</text>
            {n.known && <text x="11" y="17" fontSize="9" fill="#5f6e7f" fontFamily="monospace">{n.depth}F{n.revealedBy ? ` · ${n.revealedBy}` : ""}</text>}
          </g>
        );
      })}
    </svg>
  );
}
