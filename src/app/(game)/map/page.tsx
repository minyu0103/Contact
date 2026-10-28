import Link from "next/link";
import { db } from "@/lib/db";
import { requireCharacterUser } from "@/lib/auth";
import { getConfig } from "@/lib/game-config";
import { erosionStage } from "@/lib/rules";
import { MapClient } from "./MapClient";
import { ensureInstantSpawns } from "@/lib/instant";

export default async function MapPage() {
  const { character } = await requireCharacterUser();
  const cfg = await getConfig();
  const stage = erosionStage(character.erosion, cfg);
  await ensureInstantSpawns();
  const realms = await db.realm.findMany({ where: { isPublished: true, isTemplate: false, sealedAt: null }, orderBy: { createdAt: "asc" }, include: { _count: { select: { nodes: true } }, nodes: { where: { revealedAt: { not: null } }, select: { id: true } } } });
  const markers = realms.map((r) => ({ id: r.id, x: r.mapX, y: r.mapY, label: r.name, progress: r._count.nodes ? Math.round((r.nodes.length / r._count.nodes) * 100) : 0, active: r.kind === "INSTANT" }));
  const activeRun = await db.run.findFirst({ where: { characterId: character.id, status: "ACTIVE", isTest: false } });
  return (
    <div className="flex flex-col gap-4">
      {stage === "WARNING" && <p className="border border-warn/40 bg-warn/8 px-4 py-2 text-sm text-warn">경고 단계: 일부 이계 정보가 차단됩니다.</p>}
      {stage === "DANGER" && <p className="border border-danger/50 bg-danger/8 px-4 py-2 text-sm text-danger">위험 단계: 이계 입장이 차단됩니다.</p>}
      <section className="panel">
        <div className="panel-title">세계 지도 · 이계 신호<span className="code">{realms.length} DETECTED</span></div>
        <div className="p-2"><MapClient markers={markers} /></div>
      </section>
      <section className="panel">
        <div className="panel-title">감지된 이계</div>
        <ul className="divide-y divide-line">
          {realms.length === 0 && <li className="help p-4">감지된 이계가 없습니다.</li>}
          {realms.map((r) => {
            const pct = r._count.nodes ? Math.round((r.nodes.length / r._count.nodes) * 100) : 0;
            return (
              <li key={r.id} className="flex items-center gap-4 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <Link href={`/map/${r.id}`} className="font-semibold hover:text-accent">{r.name}</Link>{r.kind === "INSTANT" && <span className="tag tag-warn ml-2">인스턴트 · 봉합 가능</span>}
                  <p className="help line-clamp-1">{r.intro}</p>
                  <div className="mt-1.5 flex items-center gap-2"><div className="gauge w-40"><div style={{ width: `${pct}%`, background: "var(--accent)" }} /></div><span className="mono text-xs text-fg-dim">탐사 진행도 {pct}%</span></div>
                </div>
                {activeRun?.realmId === r.id ? <Link href={`/explore/${activeRun.id}`} className="btn btn-primary btn-sm">이어서 탐사</Link> : <Link href={`/map/${r.id}`} className="btn btn-sm">정보</Link>}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

