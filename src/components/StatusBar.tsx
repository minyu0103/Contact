import Link from "next/link";
import type { Character } from "@prisma/client";
import type { GameConfig } from "@/lib/game-config";
import { EROSION_STAGE_LABEL, erosionStage } from "@/lib/rules";
import { nextResetAt } from "@/lib/time";
import { ResetCountdown } from "./ResetCountdown";
import { ProgramMark } from "./ProgramMark";

const STAGE_CLASS = {
  STABLE: "text-ok border-ok/50",
  ACTIVE: "text-accent border-accent/60",
  WARNING: "text-warn border-warn/60",
  DANGER: "text-danger border-danger/70",
} as const;

function Gauge({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className="gauge w-16 sm:w-24">
      <div style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

/** 모든 게임 화면 위쪽에 늘 보이는 상태 표시줄 */
export function StatusBar({ character, cfg, isAdmin }: { character: Character; cfg: GameConfig; isAdmin: boolean }) {
  const stage = erosionStage(character.erosion, cfg);
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2 sm:px-4">
        <Link href="/home" className="mr-auto">
          <ProgramMark name={cfg["program.name"]} tagline={cfg["program.tagline"]} version={cfg["program.version"]} size="sm" />
        </Link>
        <div className="flex items-center gap-2">
          {character.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={character.imageUrl} alt="" className="h-7 w-7 border border-line object-cover" />
          ) : (
            <span className="inline-flex h-7 w-7 items-center justify-center border border-line bg-bg-3 text-[0.6rem] text-fg-mute">ID</span>
          )}
          <Link href="/character" className="text-sm font-semibold hover:text-accent">{character.name}</Link>
          {isAdmin && (
            <Link href="/admin" className="tag tag-warn hover:bg-warn/10">관리자</Link>
          )}
        </div>
        <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:w-auto">
          <div className="flex items-center gap-1.5">
            <span className="hud-label">체력</span>
            <Gauge value={character.hp} max={character.maxHp} color="var(--hp)" />
            <span className="mono">{character.hp}/{character.maxHp}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="hud-label">정신</span>
            <Gauge value={character.mp} max={character.maxMp} color="var(--mp)" />
            <span className="mono">{character.mp}/{character.maxMp}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="hud-label">침식</span>
            <span className={`tag ${STAGE_CLASS[stage]}`}>{EROSION_STAGE_LABEL[stage]}</span>
            <span className="mono">{character.erosion}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="hud-label">행동력</span>
            <span className="mono">
              {Array.from({ length: cfg["char.dailyAp"] }).map((_, i) => (
                <span key={i} className={i < character.ap ? "text-accent" : "text-fg-mute"}>▮</span>
              ))}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="hud-label">P</span>
            <span className="mono text-warn">{character.points.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="hud-label">초기화</span>
            <ResetCountdown nextResetIso={nextResetAt().toISOString()} />
          </div>
        </div>
      </div>
    </header>
  );
}
