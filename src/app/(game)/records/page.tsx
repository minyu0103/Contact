import Link from "next/link";
import { db } from "@/lib/db";
import { requireCharacterUser } from "@/lib/auth";
import { formatKst } from "@/lib/time";
import type { RunSummary } from "@/lib/engine/types";

const STATUS = { ACTIVE: { label: "진행 중", cls: "tag-accent" }, ESCAPED: { label: "탈출", cls: "tag-ok" }, FALLEN: { label: "쓰러짐", cls: "tag-danger" }, ABORTED: { label: "강제 종료", cls: "" } } as const;

export default async function RecordsPage() {
  const { character } = await requireCharacterUser();
  const runs = await db.run.findMany({ where: { isTest: false, OR: [{ characterId: character.id }, { party: { members: { some: { characterId: character.id, status: { in: ["JOINED", "FALLEN"] } } } } }] }, orderBy: { startedAt: "desc" }, include: { realm: true, _count: { select: { logs: true } } } });
  return (
    <section className="panel">
      <div className="panel-title">내 탐사기록<span className="code">{runs.length} RUNS</span></div>
      <ul className="divide-y divide-line">
        {runs.length === 0 && <li className="help p-4">아직 탐사 기록이 없습니다.</li>}
        {runs.map((r) => {
          const s = r.summary as RunSummary | null;
          const st = STATUS[r.status];
          return (
            <li key={r.id} className="px-4 py-3">
              <Link href={r.status === "ACTIVE" ? `/explore/${r.id}` : `/records/${r.id}`} className="flex flex-wrap items-center gap-3 hover:text-accent">
                <span className={`tag ${st.cls}`}>{st.label}</span>
                <span className="font-semibold">{r.realm.name}</span>
                <span className="mono text-xs text-fg-mute">{formatKst(r.startedAt)}{r.endedAt ? ` ~ ${formatKst(r.endedAt).slice(11)}` : ""}</span>
                {s && <span className="ml-auto text-xs text-fg-dim">구역 {s.visited.length} · 새 공개 {s.newNodes.length} · <span className="text-warn">{s.reward}P</span> · EXP {s.exp} · 단서 {s.clues.length}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
