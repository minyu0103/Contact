import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireCharacterUser } from "@/lib/auth";
import { formatKst } from "@/lib/time";
import { canAccessRun } from "@/lib/party";
import type { CheckResult, Delta, RunSummary } from "@/lib/engine/types";
import { CHECK_TYPE_LABEL } from "@/lib/rules";

const TYPE_LABEL: Record<string, string> = { enter: "진입", choice: "선택", move: "이동", teleport: "공간 이동", item: "아이템", end: "종료" };
const STATUS_LABEL = { ESCAPED: "탈출 성공", FALLEN: "쓰러짐", ABORTED: "강제 종료", ACTIVE: "진행 중" } as const;

function DeltaTags({ deltas }: { deltas: Delta[] }) {
  return <span className="flex flex-wrap gap-1">{deltas.map((d, i) => <span key={i} className="tag">{d.label} {d.value !== undefined ? (d.value > 0 ? `+${d.value}` : d.value) : d.text}</span>)}</span>;
}

export default async function RecordDetailPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const { user, character } = await requireCharacterUser();
  const run = await db.run.findUnique({ where: { id: runId }, include: { realm: true, logs: { orderBy: { seq: "asc" }, include: { node: true } }, logs2: true } });
  if (!run) notFound();
  if (!(await canAccessRun(run.id, character.id, user.role === "ADMIN"))) redirect("/records");
  if (run.status === "ACTIVE") redirect(`/explore/${run.id}`);
  const s = run.summary as RunSummary | null;
  const diary = run.logs2.find((l) => l.kind === "DIARY");
  const camera = run.logs2.find((l) => l.kind === "CAMERA");
  const mine = run.characterId === character.id;
  return (
    <div className="flex flex-col gap-4">
      {mine && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="hud-label">로그</span>
          {diary ? <Link href={`/community/logs/${diary.id}`} className="btn btn-sm">일기 로그 보기</Link> : <Link href={`/records/${run.id}/log?kind=diary`} className="btn btn-primary btn-sm">일기 로그 쓰기</Link>}
          {camera ? <Link href={`/community/logs/${camera.id}`} className="btn btn-sm">카메라 로그 보기 ({camera.status === "PENDING" ? "심사 중" : camera.status === "APPROVED" ? "공개" : "반려"})</Link> : run.hadCamera ? <Link href={`/records/${run.id}/log?kind=camera`} className="btn btn-primary btn-sm">카메라 로그 쓰기</Link> : <span className="help">카메라 로그는 비디오 카메라를 지니고 입장한 탐사만 가능</span>}
        </div>
      )}
      <section className="panel">
        <div className="panel-title">{run.realm.name}<span className="code">{STATUS_LABEL[run.status]}</span></div>
        <div className="grid gap-x-6 gap-y-1.5 p-4 text-sm sm:grid-cols-[auto_1fr]">
          <span className="hud-label self-center">시각</span><span className="mono">{formatKst(run.startedAt)} ~ {run.endedAt ? formatKst(run.endedAt) : "-"}</span>
          {s && (<>
            <span className="hud-label self-center">방문</span><span className="text-fg-dim">{s.visited.join(" → ")}</span>
            <span className="hud-label self-center">새 공개</span><span>{s.newNodes.join(", ") || "-"}</span>
            <span className="hud-label self-center">보수 · 경험치</span><span className="mono"><span className="text-warn">{s.reward}P</span> · EXP +{s.exp}{s.levelUps ? ` · 레벨 업 ×${s.levelUps}` : ""}</span>
            <span className="hud-label self-center">얻은 아이템</span><span>{s.gained.map((g) => `${g.name} ×${g.qty}`).join(", ") || "-"}{s.lost.length ? <span className="text-danger"> · 잃음: {s.lost.map((g) => `${g.name} ×${g.qty}`).join(", ")}</span> : null}</span>
            {s.clues.length > 0 && (<><span className="hud-label">단서</span><ul className="list-disc pl-4 text-fg-dim">{s.clues.map((c, i) => <li key={i}>{c.text}</li>)}</ul></>)}
          </>)}
        </div>
      </section>
      <section className="panel">
        <div className="panel-title">상세 기록<span className="code">{run.logs.length} ENTRIES</span></div>
        <ol className="divide-y divide-line">
          {run.logs.map((l) => {
            const check = l.checkDetail as CheckResult | null;
            const deltas = (l.deltas as Delta[] | null) ?? [];
            return (
              <li key={l.id} className="grid gap-x-4 gap-y-1 px-4 py-3 text-sm sm:grid-cols-[3rem_6rem_1fr]">
                <span className="mono text-xs text-fg-mute">{String(l.seq).padStart(3, "0")}</span>
                <span className="text-xs"><span className="tag">{TYPE_LABEL[l.type] ?? l.type}</span>{l.node && <span className="ml-1 text-fg-dim">{l.node.name}</span>}</span>
                <div className="flex flex-col gap-1">
                  {l.choiceText && <p className="font-semibold">▸ {l.choiceText}</p>}
                  {check && (
                    <p className="mono text-xs text-fg-dim">
                      {CHECK_TYPE_LABEL[check.checkType]} 판정 목표 {check.target} · {check.auto ? "자동 성공" : `주사위 [${check.dice.join(", ")}]${check.modifiers.length ? " " + check.modifiers.map((m) => `${m.value >= 0 ? "+" : ""}${m.value}(${m.label})`).join(" ") : ""} = ${check.total}`} → <span className={check.success ? "text-ok" : "text-danger"}>{check.success ? "성공" : "실패"}</span>
                    </p>
                  )}
                  {l.text && <p className="whitespace-pre-wrap text-fg-dim">{l.text}</p>}
                  {deltas.length > 0 && <DeltaTags deltas={deltas} />}
                </div>
              </li>
            );
          })}
        </ol>
      </section>
      <Link href="/records" className="btn btn-sm self-start">← 목록</Link>
    </div>
  );
}
