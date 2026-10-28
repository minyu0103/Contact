import Link from "next/link";
import type { RunView } from "@/lib/engine/engine";

const TITLE = { ESCAPED: "탈출 성공", FALLEN: "쓰러짐", ABORTED: "강제 종료", ACTIVE: "" } as const;

/** 런 종료 화면 */
export function RunSummaryView({ view }: { view: RunView }) {
  const s = view.summary;
  const status = (s?.status ?? view.status) as keyof typeof TITLE;
  const ok = status === "ESCAPED";
  return (
    <div className="mx-auto max-w-2xl">
      <section className="panel">
        <div className="panel-title">탐사 종료<span className="code">{view.realm.name}</span></div>
        <div className="flex flex-col gap-5 p-5">
          <div>
            <p className={`text-3xl font-bold ${ok ? "text-ok" : status === "FALLEN" ? "text-danger" : "text-fg-dim"}`}>{TITLE[status]}</p>
            <p className="help mt-1">
              {ok && "이계에서 빠져나왔다. 이번 런에서 밝힌 구역이 모든 유저에게 공유되었다."}
              {status === "FALLEN" && "의식을 잃었다. 정신을 차리니 이계 밖이었다. 밝힌 구역은 공유되지 않았고, 획득물 일부를 잃었다."}
              {status === "ABORTED" && "운영자에 의해 종료되었다."}
            </p>
            {s?.isTest && <p className="tag tag-warn mt-2">테스트 플레이 · 실제 캐릭터와 서버에는 반영되지 않음</p>}
          </div>
          {s && (
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
              <dt className="hud-label self-center">새로 밝힌 구역</dt><dd>{s.newNodes.length ? s.newNodes.join(", ") : "-"}</dd>
              <dt className="hud-label self-center">방문한 구역</dt><dd className="text-fg-dim">{s.visited.join(" → ")}</dd>
              {s.sealed && (<><dt className="hud-label self-center">봉합</dt><dd><span className="tag tag-accent">이계 봉합 성공 · 봉합 보수 {s.sealReward}P 포함</span></dd></>)}
              <dt className="hud-label self-center">보수</dt><dd className="mono text-warn">{s.reward} P</dd>
              <dt className="hud-label self-center">경험치</dt><dd className="mono">+{s.exp}{s.levelUps > 0 && <span className="tag tag-accent ml-2">레벨 업 ×{s.levelUps}</span>}</dd>
              {s.proficiencyAfter !== s.proficiencyBefore && (<><dt className="hud-label self-center">숙련도</dt><dd className="mono">{s.proficiencyBefore} → {s.proficiencyAfter}</dd></>)}
              <dt className="hud-label self-center">얻은 아이템</dt><dd>{s.gained.length ? s.gained.map((g) => `${g.name} ×${g.qty}`).join(", ") : "-"}</dd>
              {s.lost.length > 0 && (<><dt className="hud-label self-center text-danger">잃은 아이템</dt><dd className="text-danger">{s.lost.map((g) => `${g.name} ×${g.qty}`).join(", ")}</dd></>)}
              {s.discarded.length > 0 && (<><dt className="hud-label self-center text-warn">보관함 부족</dt><dd className="text-warn">{s.discarded.map((g) => `${g.name} ×${g.qty}`).join(", ")} (칸이 모자라 버려짐)</dd></>)}
              {s.clues.length > 0 && (<><dt className="hud-label">단서</dt><dd><ul className="list-disc pl-4 text-fg-dim">{s.clues.map((c, i) => <li key={i}>{c.text}</li>)}</ul></dd></>)}
            </dl>
          )}
          <div className="flex gap-2">
            <Link href={s?.isTest ? `/admin/realms/${view.realm.id}` : "/home"} className="btn btn-primary">{s?.isTest ? "편집기로" : "홈으로"}</Link>
            {!s?.isTest && <Link href={`/records/${view.runId}`} className="btn">탐사기록 보기</Link>}
          </div>
        </div>
      </section>
    </div>
  );
}
