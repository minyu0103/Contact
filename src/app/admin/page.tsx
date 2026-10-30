import Link from "next/link";
import { db } from "@/lib/db";
import { getConfig } from "@/lib/game-config";
import { PageHeader } from "@/components/admin/PageHeader";
import { CATEGORY_LABEL } from "@/lib/rules";
import { formatKst } from "@/lib/time";

export default async function AdminDashboard() {
  const cfg = await getConfig();
  const [pending, danger, realms, activeRuns, userCount] = await Promise.all([
    db.character.findMany({ where: { abilityStatus: "PENDING", isNpc: false }, orderBy: { createdAt: "asc" }, take: 10 }),
    db.character.findMany({ where: { erosion: { gte: cfg["erosion.dangerFrom"] }, isNpc: false }, orderBy: { erosion: "desc" } }),
    db.realm.findMany({ include: { _count: { select: { nodes: true } }, nodes: { where: { revealedAt: { not: null } }, select: { id: true } } }, orderBy: { createdAt: "asc" } }),
    db.run.findMany({ where: { status: "ACTIVE" }, include: { character: true, realm: true }, orderBy: { startedAt: "desc" } }),
    db.character.count({ where: { isNpc: false } }),
  ]);

  return (
    <div>
      <PageHeader title="대시보드" description={`등록 유저 ${userCount}명`} />
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="panel">
          <div className="panel-title">심사 대기 능력<span className="code">{pending.length}</span></div>
          <ul className="divide-y divide-line text-sm">
            {pending.length === 0 && <li className="help p-4">대기 중인 능력이 없습니다.</li>}
            {pending.map((c) => (
              <li key={c.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="font-semibold">{c.name}</span>
                <span className="text-fg-dim">{CATEGORY_LABEL[c.category]} · {c.abilityName}</span>
                <Link href={`/admin/abilities/${c.id}`} className="btn btn-sm ml-auto">심사</Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel">
          <div className="panel-title">위험 단계 유저<span className="code">{danger.length}</span></div>
          <ul className="divide-y divide-line text-sm">
            {danger.length === 0 && <li className="help p-4">위험 단계(침식률 {cfg["erosion.dangerFrom"]} 이상) 유저가 없습니다.</li>}
            {danger.map((c) => (
              <li key={c.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="font-semibold">{c.name}</span>
                <span className="mono text-danger">침식률 {c.erosion}</span>
                <Link href={`/admin/users/${c.id}`} className="btn btn-sm ml-auto">상세</Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel">
          <div className="panel-title">이계별 진행도<span className="code">{realms.length}</span></div>
          <ul className="divide-y divide-line text-sm">
            {realms.length === 0 && <li className="help p-4">등록된 이계가 없습니다. <Link href="/admin/realms" className="text-accent">이계 메뉴</Link>에서 만드세요.</li>}
            {realms.map((r) => {
              const total = r._count.nodes;
              const revealed = r.nodes.length;
              const pct = total ? Math.round((revealed / total) * 100) : 0;
              return (
                <li key={r.id} className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <Link href={`/admin/realms/${r.id}`} className="font-semibold hover:text-accent">{r.name}</Link>
                    {!r.isPublished && <span className="tag">비공개</span>}
                    <span className="mono ml-auto text-xs text-fg-dim">{revealed}/{total} ({pct}%)</span>
                  </div>
                  <div className="gauge mt-1.5"><div style={{ width: `${pct}%`, background: "var(--accent)" }} /></div>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="panel">
          <div className="panel-title">진행 중인 런<span className="code">{activeRuns.length}</span></div>
          <ul className="divide-y divide-line text-sm">
            {activeRuns.length === 0 && <li className="help p-4">진행 중인 런이 없습니다.</li>}
            {activeRuns.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="font-semibold">{r.character.name}</span>
                <span className="text-fg-dim">{r.realm.name}</span>
                {r.isTest && <span className="tag">테스트</span>}
                <span className="mono ml-auto text-xs text-fg-mute">{formatKst(r.startedAt)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
