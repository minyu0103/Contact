import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireCharacterUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRunView } from "@/lib/engine/engine";
import { MiniMap } from "@/components/MiniMap";
import { EROSION_STAGE_LABEL } from "@/lib/rules";
import { canAccessRun } from "@/lib/party";
import { RunConsole } from "./RunConsole";
import { RunSummaryView } from "./RunSummaryView";

export default async function ExplorePage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const { user, character } = await requireCharacterUser();
  const run = await canAccessRun(runId, character.id, user.role === "ADMIN");
  if (!run) { if (await db.run.findUnique({ where: { id: runId } })) redirect("/home"); notFound(); }
  const myMembership = run.party?.members.find((m) => m.characterId === character.id);
  if (run.party && run.status === "ACTIVE" && myMembership && myMembership.status !== "JOINED") {
    return (
      <section className="panel mx-auto max-w-xl"><div className="panel-title">공동 탐사</div><div className="flex flex-col gap-3 p-5 text-sm"><p>{myMembership.status === "FALLEN" ? "당신은 쓰러져 이계 밖으로 튕겨 나왔습니다. 파티는 탐사를 계속하고 있습니다." : "이 파티에서 나갔습니다."}</p><Link href="/home" className="btn btn-sm self-start">홈으로</Link></div></section>
    );
  }
  const view = await getRunView(runId, run.party ? character.id : undefined);

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
        {view.party && (
          <section className="panel">
            <div className="panel-title">파티<span className="code">{view.party.members.filter((m) => m.status === "JOINED").length}명</span></div>
            <ul className="divide-y divide-line text-xs">
              {view.party.members.filter((m) => m.status !== "LEFT" && m.status !== "INVITED").map((m) => (
                <li key={m.id} className={`flex items-center gap-2 px-4 py-2 ${m.status === "FALLEN" ? "opacity-50" : ""}`}>
                  <span className="font-semibold">{m.name}</span>{m.isLeader && <span className="tag tag-warn">장</span>}{m.status === "FALLEN" && <span className="tag tag-danger">이탈</span>}
                  <span className="mono ml-auto">체력 {m.hp}/{m.maxHp} · 정신 {m.mp}/{m.maxMp} · 침식 {m.erosion}</span>
                </li>
              ))}
            </ul>
            <p className="help px-4 pb-3">누구나 행동할 수 있습니다. 판정과 피해는 행동한 사람에게 적용됩니다.</p>
          </section>
        )}
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
        {view.memos.length > 0 && (
          <section className="panel">
            <div className="panel-title">이 구역의 메모<span className="code">{view.memos.length}</span></div>
            <ul className="divide-y divide-line text-sm">
              {view.memos.map((m) => <li key={m.id} className="px-4 py-2"><p className="font-semibold">{m.title} <span className="text-xs font-normal text-fg-mute">— {m.author} · ◆{m.reactions}</span></p><p className="line-clamp-4 whitespace-pre-wrap text-xs text-fg-dim">{m.body}</p></li>)}
            </ul>
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
