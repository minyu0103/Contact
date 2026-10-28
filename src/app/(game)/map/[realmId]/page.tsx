import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireCharacterUser } from "@/lib/auth";
import { getConfig } from "@/lib/game-config";
import { erosionStage } from "@/lib/rules";
import { MiniMap } from "@/components/MiniMap";
import { formatKst } from "@/lib/time";
import { EnterForm } from "./EnterForm";

export default async function RealmInfoPage({ params }: { params: Promise<{ realmId: string }> }) {
  const { realmId } = await params;
  const { character } = await requireCharacterUser();
  const cfg = await getConfig();
  const realm = await db.realm.findUnique({ where: { id: realmId }, include: { nodes: { include: { revealedBy: { select: { name: true } } } }, edges: true } });
  if (!realm || !realm.isPublished || realm.isTemplate) notFound();
  const sealed = !!realm.sealedAt;
  const stage = erosionStage(character.erosion, cfg);
  const activeRun = await db.run.findFirst({ where: { characterId: character.id, status: "ACTIVE", isTest: false } });
  const knownIds = new Set(realm.nodes.filter((n) => n.revealedAt).map((n) => n.id));
  const showIds = new Set(knownIds);
  for (const e of realm.edges) { if (knownIds.has(e.fromId)) showIds.add(e.toId); if (knownIds.has(e.toId) && e.bidirectional) showIds.add(e.fromId); }
  const miniNodes = realm.nodes.filter((n) => showIds.has(n.id)).map((n) => ({ id: n.id, name: knownIds.has(n.id) ? n.name : "???", depth: n.depth, x: n.posX, y: n.posY, known: knownIds.has(n.id), current: false, visited: false, isExit: knownIds.has(n.id) && n.isExit, revealedBy: n.revealedBy?.name ?? null }));
  const miniEdges = realm.edges.filter((e) => showIds.has(e.fromId) && showIds.has(e.toId) && (knownIds.has(e.fromId) || knownIds.has(e.toId))).map((e) => ({ id: e.id, from: e.fromId, to: e.toId }));
  const revealed = realm.nodes.filter((n) => n.revealedAt).sort((a, b) => a.revealedAt!.getTime() - b.revealedAt!.getTime());
  const memoRows = await db.explorationLog.findMany({ where: { realmId: realm.id, kind: "DIARY", status: "APPROVED", nodeId: { not: null } }, include: { character: { select: { name: true } }, node: { select: { name: true } }, post: { include: { _count: { select: { reactions: true } } } } } });
  const memos = memoRows.filter((m) => m.post._count.reactions >= cfg["log.memoThreshold"] && m.node && knownIds.has(m.nodeId!));
  const pct = realm.nodes.length ? Math.round((knownIds.size / realm.nodes.length) * 100) : 0;
  const blocked = stage === "DANGER";

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
      <section className="panel">
        <div className="panel-title">{realm.name}<span className="code">진행도 {pct}%</span></div>
        <div className="flex flex-col gap-4 p-4">
          {realm.kind === "INSTANT" && <p className={`border px-3 py-2 text-sm ${sealed ? "border-line text-fg-dim" : "border-warn/40 bg-warn/8 text-warn"}`}>{sealed ? "봉합된 이계입니다. 더 이상 들어갈 수 없습니다." : "인스턴트 이계. 주인을 토벌하고 탈출하면 봉합되어 사라지고 봉합 보수를 받습니다."}</p>}
          <p className="whitespace-pre-wrap leading-relaxed">{realm.intro || "소개문이 없습니다."}</p>
          <div className="border border-line"><MiniMap nodes={miniNodes} edges={miniEdges} height={360} /></div>
          <p className="help">공개된 구역 {knownIds.size} / {realm.nodes.length}. 탈출에 성공해야 밝힌 구역이 모두에게 공유됩니다.</p>
        </div>
      </section>
      <aside className="flex flex-col gap-4">
        <section className="panel">
          <div className="panel-title">입장</div>
          <div className="flex flex-col gap-3 p-4 text-sm">
            <p className="help">입장 시 행동력 1을 소모합니다. 현재 행동력 <span className="mono text-fg">{character.ap}</span>.</p>
            {activeRun ? (
              <Link href={`/explore/${activeRun.id}`} className="btn btn-primary btn-block">진행 중인 탐사로 돌아가기</Link>
            ) : sealed ? (
              <p className="help">봉합되었습니다.</p>
            ) : blocked ? (
              <p className="error">침식률이 위험 단계입니다. 입장이 차단되었습니다.</p>
            ) : (
              <EnterForm realmId={realm.id} disabled={character.ap <= 0} />
            )}
            <Link href="/map" className="btn btn-ghost btn-sm">← 세계 지도</Link>
          </div>
        </section>
        {memos.length > 0 && (
          <section className="panel">
            <div className="panel-title">맵 메모<span className="code">{memos.length}</span></div>
            <ul className="divide-y divide-line text-xs">
              {memos.map((m) => <li key={m.id} className="px-4 py-2"><Link href={`/community/logs/${m.id}`} className="hover:text-accent"><span className="tag mr-1">{m.node!.name}</span><b>{m.title}</b> <span className="text-fg-mute">{m.character.name} · ◆{m.post._count.reactions}</span></Link></li>)}
            </ul>
          </section>
        )}
        <section className="panel">
          <div className="panel-title">최초 공개 기록<span className="code">{revealed.length}</span></div>
          <ul className="divide-y divide-line text-xs">
            {revealed.length === 0 && <li className="help p-4">아직 아무도 밝히지 못했습니다.</li>}
            {revealed.map((n) => <li key={n.id} className="flex gap-2 px-4 py-2"><span className="font-semibold">{n.name}</span><span className="text-fg-dim">{n.revealedBy?.name ?? "-"}</span><span className="mono ml-auto text-fg-mute">{formatKst(n.revealedAt!)}</span></li>)}
          </ul>
        </section>
      </aside>
    </div>
  );
}
