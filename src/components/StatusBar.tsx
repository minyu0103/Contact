import Link from "next/link";
import type { Character } from "@prisma/client";
import type { GameConfig } from "@/lib/game-config";
import { EROSION_STAGE_LABEL, erosionStage } from "@/lib/rules";
import { nextResetAt } from "@/lib/time";
import { ResetCountdown } from "./ResetCountdown";
import { ProgramMark } from "./ProgramMark";

const STAGE_TAG = {
  STABLE: "tag-ok",
  ACTIVE: "tag-accent",
  WARNING: "tag-warn",
  DANGER: "tag-danger",
} as const;

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="hud-label">{label}</span>
      {children}
    </div>
  );
}

function Gauge({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className="gauge w-14 sm:w-20">
      <div style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

/** 모든 게임 화면 위쪽에 늘 보이는 상태 표시줄 */
export function StatusBar({ character, cfg, isAdmin, npcReturn }: { character: Character; cfg: GameConfig; isAdmin: boolean; npcReturn?: React.ReactNode }) {
  const stage = erosionStage(character.erosion, cfg);
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-3 py-2.5 sm:px-5">
        <Link href="/home" className="mr-auto">
          <ProgramMark name={cfg["program.name"]} version={cfg["program.version"]} size="sm" />
        </Link>
        <Link href="/character" className="flex items-center gap-2 hover:text-accent">
          {character.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={character.imageUrl} alt="" className="h-6 w-6 border border-line-2 object-cover" />
          ) : (
            <span className="inline-block h-6 w-6 border border-line-2 bg-bg-3" />
          )}
          <span className="text-sm font-semibold">{character.name}</span>
        </Link>
        {isAdmin && <Link href="/admin" className="tag tag-warn hover:bg-warn/15">관리자</Link>}
        {npcReturn}
        <div className="flex w-full flex-wrap items-center gap-x-5 gap-y-1.5 text-xs sm:w-auto">
          <Stat label="체력">
            <Gauge value={character.hp} max={character.maxHp} color="var(--hp)" />
            <span className="mono">{character.hp}/{character.maxHp}</span>
          </Stat>
          <Stat label="정신력">
            <Gauge value={character.mp} max={character.maxMp} color="var(--mp)" />
            <span className="mono">{character.mp}/{character.maxMp}</span>
          </Stat>
          <Stat label="침식률">
            <span className={`tag ${STAGE_TAG[stage]}`}>{EROSION_STAGE_LABEL[stage]}</span>
            <span className="mono">{character.erosion}</span>
          </Stat>
          <Stat label="행동력">
            <span className="flex gap-0.5">
              {Array.from({ length: cfg["char.dailyAp"] }).map((_, i) => (
                <span key={i} className={`inline-block h-3 w-1.5 ${i < character.ap ? "bg-accent shadow-[0_0_6px_rgba(114,214,227,0.7)]" : "bg-fg-mute/30"}`} />
              ))}
            </span>
          </Stat>
          <Stat label="P">
            <span className="mono text-warn">{character.points.toLocaleString()}</span>
          </Stat>
          <Stat label="초기화">
            <ResetCountdown nextResetIso={nextResetAt().toISOString()} />
          </Stat>
        </div>
      </div>
    </header>
  );
}
