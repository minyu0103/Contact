// 규칙 계산 모음. 운영자가 플레이하며 조정할 규칙은 가능한 한 여기와 game-config에 모은다.
import type { GameConfig } from "./game-config";
import type { AbilityCategory, CheckType } from "@prisma/client";

export type ErosionStage = "STABLE" | "ACTIVE" | "WARNING" | "DANGER";

export const EROSION_STAGE_LABEL: Record<ErosionStage, string> = {
  STABLE: "안정",
  ACTIVE: "활성",
  WARNING: "경고",
  DANGER: "위험",
};

export const EROSION_STAGE_ORDER: ErosionStage[] = ["STABLE", "ACTIVE", "WARNING", "DANGER"];

export function erosionStage(erosion: number, cfg: GameConfig): ErosionStage {
  if (erosion >= cfg["erosion.dangerFrom"]) return "DANGER";
  if (erosion >= cfg["erosion.warningFrom"]) return "WARNING";
  if (erosion >= cfg["erosion.activeFrom"]) return "ACTIVE";
  return "STABLE";
}

/** 정신력에 따른 침식률 상승 배율 */
export function erosionMultiplier(mp: number, maxMp: number, cfg: GameConfig): number {
  if (maxMp <= 0) return 1;
  const ratio = mp / maxMp;
  if (ratio <= 0.25) return cfg["mp.erosionMult25"];
  if (ratio <= 0.5) return cfg["mp.erosionMult50"];
  return 1;
}

/** 침식률 상승량에 배율을 곱하고 올림 */
export function applyErosionGain(base: number, mp: number, maxMp: number, cfg: GameConfig): number {
  if (base <= 0) return 0;
  return Math.ceil(base * erosionMultiplier(mp, maxMp, cfg));
}

/** 체력에 따른 판정 페널티 */
export function hpPenalty(hp: number, maxHp: number, cfg: GameConfig): number {
  if (maxHp <= 0) return 0;
  const ratio = hp / maxHp;
  if (ratio <= 0.25) return cfg["hp.penalty25"];
  if (ratio <= 0.5) return cfg["hp.penalty50"];
  return 0;
}

export const CATEGORY_LABEL: Record<AbilityCategory, string> = {
  COMBAT: "전투형",
  SEARCH: "탐색형",
  PRODUCTION: "생산형",
  SPECIAL: "특수형",
};

export const CHECK_TYPE_LABEL: Record<CheckType, string> = {
  COMBAT: "전투",
  SEARCH: "탐색",
  CRAFT: "제작",
  GENERAL: "일반",
};

/** 카테고리로 자동 결정되는 숙련도 판정 종류. 특수형은 운영자 지정(null이면 없음). */
export function proficiencyCheckTypeFor(category: AbilityCategory, special: CheckType | null): CheckType | null {
  switch (category) {
    case "COMBAT":
      return "COMBAT";
    case "SEARCH":
      return "SEARCH";
    case "PRODUCTION":
      return "CRAFT";
    case "SPECIAL":
      return special;
  }
}

export function levelUpRequirement(level: number, cfg: GameConfig): number {
  return level * cfg["exp.levelUpBase"];
}

/** 숙련 경험으로 결정되는 숙련도 (1~5) */
export function proficiencyFromExp(exp: number, cfg: GameConfig): number {
  if (exp >= cfg["prof.threshold5"]) return 5;
  if (exp >= cfg["prof.threshold4"]) return 4;
  if (exp >= cfg["prof.threshold3"]) return 3;
  if (exp >= cfg["prof.threshold2"]) return 2;
  return 1;
}

/** 목표치별 성공 확률(보정 0, 2d6). 관리자 도움말용 */
export function successChance2d6(target: number): number {
  let hit = 0;
  for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if (a + b >= target) hit++;
  return Math.round((hit / 36) * 100);
}
