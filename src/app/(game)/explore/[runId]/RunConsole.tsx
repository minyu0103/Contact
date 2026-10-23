"use client";

import { useActionState } from "react";
import type { RunView } from "@/lib/engine/engine";
import { runCommandAction } from "../actions";

function Deltas({ deltas }: { deltas: { label: string; value?: number; text?: string }[] }) {
  if (deltas.length === 0) return null;
  const color = (d: { label: string; value?: number }) => {
    if (d.value === undefined) return "tag-accent";
    const bad = d.label === "침식률" ? d.value > 0 : d.value < 0;
    return bad ? "tag-danger" : "tag-ok";
  };
  return (
    <ul className="flex flex-wrap gap-1.5">
      {deltas.map((d, i) => (
        <li key={i} className={`tag ${color(d)}`}>{d.label} {d.value !== undefined ? (d.value > 0 ? `+${d.value}` : d.value) : d.text}</li>
      ))}
    </ul>
  );
}

/** 탐사 화면의 조작부: 결과 패널, 장면·선택지·이동, 아이템 사용. 모든 버튼은 같은 폼의 cmd로 제출된다. */
export function RunConsole({ view }: { view: RunView }) {
  const [state, action, pending] = useActionState(runCommandAction, undefined);
  const r = view.lastResult;
  const busy = pending;

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="runId" value={view.runId} />

      {r ? (
        <section className="panel">
          <div className="panel-title">{r.check ? "판정 결과" : "결과"}<span className="code">{r.kind.toUpperCase()}</span></div>
          <div className="flex flex-col gap-4 p-4">
            <p className="text-sm text-fg-dim">▸ {r.title}</p>
            {r.check && (
              <div className={`border p-3 ${r.check.success ? "border-ok/40 bg-ok/5" : "border-danger/40 bg-danger/5"}`}>
                <div className="mb-2 flex flex-wrap items-center gap-3">
                  <span className={`text-lg font-bold ${r.check.success ? "text-ok" : "text-danger"}`}>{r.check.success ? "성공" : "실패"}</span>
                  <span className="text-sm text-fg-dim">{{ COMBAT: "전투", SEARCH: "탐색", CRAFT: "제작", GENERAL: "일반" }[r.check.checkType]} 판정 · 목표치 <span className="mono text-fg">{r.check.target}</span></span>
                  {r.check.auto && <span className="tag tag-accent">자동 성공</span>}
                  {r.check.forced && <span className="tag tag-warn">테스트 강제 {r.check.forced === "SUCCESS" ? "성공" : "실패"}</span>}
                </div>
                {!r.check.auto && (
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="flex gap-1">
                      {r.check.dice.map((d, i) => {
                        const keptIdx = r.check!.kept.indexOf(d);
                        const used = keptIdx >= 0 && r.check!.dice.slice(0, i).filter((x) => x === d).length < r.check!.kept.filter((x) => x === d).length;
                        return <span key={i} className={`mono inline-flex h-8 w-8 items-center justify-center border text-base font-bold ${used ? "border-accent text-fg" : "border-line text-fg-mute line-through"}`}>{d}</span>;
                      })}
                    </span>
                    {r.check.modifiers.map((m, i) => (
                      <span key={i} className="mono text-fg-dim">{m.value >= 0 ? "+" : "−"}{Math.abs(m.value)} <span className="text-xs">({m.label})</span></span>
                    ))}
                    <span className="mono ml-auto text-base">= <b className="text-fg">{r.check.total}</b> <span className="text-fg-mute">vs {r.check.target}</span></span>
                  </div>
                )}
              </div>
            )}
            {r.text && <p className="whitespace-pre-wrap leading-relaxed">{r.text}</p>}
            <Deltas deltas={r.deltas} />
            <div><button className="btn btn-primary" name="cmd" value="ack" disabled={busy}>계속</button></div>
          </div>
        </section>
      ) : (
        <section className="panel">
          <div className="panel-title">{view.node.name}<span className="code">{view.node.depth}F{view.node.isExit ? " · EXIT" : ""}</span></div>
          <div className="flex flex-col gap-4 p-4">
            <p className="whitespace-pre-wrap leading-relaxed text-fg">{view.node.description}</p>
            {view.scene?.text && (
              <div className={`border-l-2 pl-3 ${view.inEvent ? "border-erosion" : "border-line-2"}`}>
                {view.inEvent && <p className="hud-label mb-1 text-erosion">이상 현상 감지</p>}
                <p className="whitespace-pre-wrap leading-relaxed">{view.scene.text}</p>
              </div>
            )}

            {view.choices.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="divider-label">행동</p>
                {view.choices.map((c) => (
                  <div key={c.id} className="flex flex-wrap items-stretch gap-1.5">
                    <button className={`btn flex-1 justify-between text-left ${c.locked || c.used ? "opacity-50" : ""}`} name="cmd" value={`choice:${c.id}`} disabled={busy || c.locked || c.used} title={c.lockReasons.join(", ")}>
                      <span>{c.text}</span>
                      <span className="mono ml-3 text-xs text-fg-dim">
                        {c.used ? "완료" : c.locked ? `잠김 · ${c.lockReasons.join(", ")}` : c.check ? `${c.check.label} ${c.check.target}` : ""}
                      </span>
                    </button>
                    {c.check && !c.locked && !c.used && c.autoRemaining > 0 && (
                      <button className="btn btn-sm border-accent/60 text-accent" name="cmd" value={`choice-auto:${c.id}`} disabled={busy} title="능력으로 판정 없이 성공">자동 성공 ({c.autoRemaining})</button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {view.canContinue && <div><button className="btn btn-primary" name="cmd" value="continue" disabled={busy}>계속</button></div>}

            {!view.inEvent && (
              <div className="flex flex-col gap-2">
                <p className="divider-label">이동</p>
                <div className="flex flex-wrap gap-2">
                  {view.moves.map((m) => (
                    <button key={m.edgeId} className={`btn ${m.locked ? "opacity-50" : ""}`} name="cmd" value={`move:${m.edgeId}`} disabled={busy}>
                      → {m.label}
                      {m.check && <span className="mono text-xs text-fg-dim">{m.check.label} {m.check.target}</span>}
                      {m.locked && <span className="text-xs text-warn">잠김</span>}
                    </button>
                  ))}
                  {view.canEscape && <button className="btn btn-primary" name="cmd" value="escape" disabled={busy}>이계에서 탈출한다</button>}
                </div>
              </div>
            )}

            {!view.inEvent && view.teleportRemaining > 0 && view.teleportTargets.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="divider-label">공간 이동 (오늘 {view.teleportRemaining}회 남음)</p>
                <div className="flex flex-wrap gap-2">
                  {view.teleportTargets.map((t) => <button key={t.id} className="btn btn-sm" name="cmd" value={`teleport:${t.id}`} disabled={busy}>⇝ {t.name}</button>)}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {state?.error && <p className="error">{state.error}</p>}

      <section className="panel">
        <div className="panel-title">소지품<span className="code">이번 런 획득 {view.loot.length}</span></div>
        <div className="flex flex-col gap-3 p-4 text-sm">
          {view.loot.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {view.loot.map((l) => (
                <li key={l.itemId} className="tag tag-accent gap-2">{l.name} ×{l.qty}
                  <button type="submit" className="text-fg-mute hover:text-danger" name="cmd" value={`discard:${l.itemId}`} title="버리기" disabled={busy}>×</button>
                </li>
              ))}
            </ul>
          )}
          {view.usableItems.length === 0 ? <p className="help">지금 쓸 수 있는 소모품이 없습니다.</p> : (
            <div className="flex flex-wrap gap-2">
              {view.usableItems.map((it) => (
                <button key={`${it.itemId}-${it.fromLoot}`} className="btn btn-sm" name="cmd" value={`item:${it.itemId}`} disabled={busy} title={it.description}>
                  {it.name} 사용 <span className="mono text-fg-dim">×{it.qty}{it.fromLoot ? " (획득)" : ""}</span>
                </button>
              ))}
            </div>
          )}
          {view.modifiers.length > 0 && <p className="help">이번 런 보정: {view.modifiers.map((m) => `${m.label} ${m.type === "run_extra_dice" ? `다이스 +${m.value}` : (m.value >= 0 ? "+" : "") + m.value}`).join(", ")}</p>}
        </div>
      </section>
    </form>
  );
}
