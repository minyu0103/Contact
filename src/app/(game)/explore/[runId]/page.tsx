import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireCharacterUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRunView } from "@/lib/engine/engine";
import { MiniMap } from "@/components/MiniMap";
import { EROSION_STAGE_LABEL } from "@/lib/rules";
import { RunConsole } from "./RunConsole";
import { RunSummaryView } from "./RunSummaryView";

export default async function ExplorePage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const { user, character } = await requireCharacterUser();
  const run = await db.run.findUnique({ where: { id: runId } });
  if (!run) notFound();
  if (run.characterId !== character.id && user.role !== "ADMIN") redirect("/home");
  const view = await getRunView(runId);

  if (view.status !== "ACTIVE") {
    return <RunSummaryView view={view} />;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="hud-label">탐사 중</span>
          <span className="font-semibold">{view.realm.name}</span>
          {view.isTest && (
            <span className="tag tag-warn">테스트 플레이{view.forceResult ? ` · 판정 강제 ${view.forceResult === "SUCCESS" ? "성공" : "실패"}` : ""}</span>
          )}
          {view.isTest && <Link href={`/admin/realms/${view.realm.id}`} className="btn btn-sm ml-auto">편집기로</Link>}
        </div>
        <RunConsole view={view} />
      </div>
      <aside className="flex flex-col gap-4">
        <section className="panel">
          <div className="panel-title">이계 지도<span className="code">MAP</span></div>
          <div className="p-2"><MiniMap nodes={view.minimap.nodes} edges={view.minimap.edges} /></div>
        </section>
        {view.isTest && (
          <section className="panel">
            <div className="panel-title">테스트 수치 (실제 캐릭터에 영향 없음)</div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 p-4 text-sm">
              <dt className="hud-label">체력</dt><dd className="mono">{view.state.hp}/{view.state.maxHp}</dd>
              <dt className="hud-label">정신력</dt><dd className="mono">{view.state.mp}/{view.state.maxMp}</dd>
              <dt className="hud-label">침식률</dt><dd className="mono">{view.state.erosion} · {EROSION_STAGE_LABEL[view.stage]}</dd>
              <dt className="hud-label">P</dt><dd className="mono">{view.state.points}</dd>
            </dl>
          </section>
        )}
        {view.clues.length > 0 && (
          <section className="panel">
            <div className="panel-title">이번 런 단서<span className="code">{view.clues.length}</span></div>
            <ul className="divide-y divide-line text-sm">{view.clues.map((c, i) => <li key={i} className="px-4 py-2 text-fg-dim">{c.text}</li>)}</ul>
          </section>
        )}
      </aside>
    </div>
  );
}
