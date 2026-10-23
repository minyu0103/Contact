// 운영자가 양식에서 고르는 효과·조건 타입 정의.
// 새 타입을 추가할 때는 여기(정의)와 엔진(처리 함수)만 고치면 된다.
// 클라이언트 컴포넌트에서도 쓰므로 서버 전용 코드를 넣지 않는다.

/** 판정 종류 선택지 (효과·조건에서 쓰는 확장형). OWN = 자기 카테고리, ALL = 모든 판정 */
export const CHECK_TARGET_OPTIONS = [
  { value: "OWN", label: "자기 카테고리 판정" },
  { value: "ALL", label: "모든 판정" },
  { value: "COMBAT", label: "전투" },
  { value: "SEARCH", label: "탐색" },
  { value: "CRAFT", label: "제작 (2차)" },
  { value: "GENERAL", label: "일반" },
] as const;
export type CheckTarget = (typeof CHECK_TARGET_OPTIONS)[number]["value"];

export const CHECK_TYPE_OPTIONS = [
  { value: "COMBAT", label: "전투" },
  { value: "SEARCH", label: "탐색" },
  { value: "GENERAL", label: "일반" },
  { value: "CRAFT", label: "제작 (2차)" },
] as const;

export const CATEGORY_OPTIONS = [
  { value: "COMBAT", label: "전투형" },
  { value: "SEARCH", label: "탐색형" },
  { value: "PRODUCTION", label: "생산형" },
  { value: "SPECIAL", label: "특수형" },
] as const;

export const ITEM_CATEGORY_OPTIONS = [
  { value: "CONSUMABLE", label: "소모품" },
  { value: "INFECTED", label: "감염물" },
  { value: "MATERIAL", label: "재료" },
  { value: "KEY", label: "중요 물품" },
  { value: "EQUIPMENT", label: "장비 (2차)" },
] as const;

export const USABLE_IN_OPTIONS = [
  { value: "BOTH", label: "런 중 · 런 밖 모두" },
  { value: "RUN", label: "런 중에만" },
  { value: "OUTSIDE", label: "런 밖에서만" },
] as const;

// ───────────── 아이템 효과 ─────────────

export type ItemEffect =
  | { type: "hp"; value: number }
  | { type: "mp"; value: number }
  | { type: "erosion"; value: number }
  | { type: "run_check_bonus"; checkType: CheckTarget; value: number }
  | { type: "run_extra_dice"; checkType: CheckTarget; value: number }
  | { type: "escape" }
  | { type: "narrative"; text: string };

export const ITEM_EFFECT_DEFS: { type: ItemEffect["type"]; label: string; fields: ("value" | "checkType" | "text")[]; help?: string }[] = [
  { type: "hp", label: "체력 ±n", fields: ["value"] },
  { type: "mp", label: "정신력 ±n", fields: ["value"] },
  { type: "erosion", label: "침식률 ±n", fields: ["value"], help: "음수면 감소. 양수면 정신력 배율이 적용됨" },
  { type: "run_check_bonus", label: "이번 런 판정 보정", fields: ["checkType", "value"] },
  { type: "run_extra_dice", label: "이번 런 다이스 추가", fields: ["checkType", "value"], help: "추가 개수" },
  { type: "escape", label: "즉시 탈출", fields: [] },
  { type: "narrative", label: "서술 전용", fields: ["text"], help: "시스템 효과 없이 설명만" },
];

export function describeItemEffect(e: ItemEffect): string {
  const ct = (v: string) => CHECK_TARGET_OPTIONS.find((o) => o.value === v)?.label ?? v;
  const sign = (n: number) => (n >= 0 ? `+${n}` : `${n}`);
  switch (e.type) {
    case "hp": return `체력 ${sign(e.value)}`;
    case "mp": return `정신력 ${sign(e.value)}`;
    case "erosion": return `침식률 ${sign(e.value)}`;
    case "run_check_bonus": return `이번 런 ${ct(e.checkType)} ${sign(e.value)}`;
    case "run_extra_dice": return `이번 런 ${ct(e.checkType)} 다이스 +${e.value}`;
    case "escape": return "즉시 탈출";
    case "narrative": return e.text || "서술 전용";
  }
}

// ───────────── 능력 효과 ─────────────

export const ABILITY_EFFECT_DEFS = [
  { type: "CHECK_BONUS", label: "판정 보정", fields: ["checkType", "value"], help: "대상 판정 종류에 +n" },
  { type: "EXTRA_DICE", label: "다이스 추가", fields: ["checkType", "value"], help: "대상 판정에 주사위 +n개" },
  { type: "AUTO_SUCCESS", label: "자동 성공", fields: ["checkType", "perDay"], help: "하루 n회, 굴리지 않고 성공" },
  { type: "TELEPORT", label: "공간 이동", fields: ["perDay"], help: "하루 n회, 런 중 공개된 노드로 즉시 이동" },
  { type: "CRAFT_DOUBLE", label: "제작 2배 (2차)", fields: [] },
  { type: "NARRATIVE", label: "서술 전용", fields: ["note"] },
] as const;

export type AbilityEffectInput = {
  type: (typeof ABILITY_EFFECT_DEFS)[number]["type"];
  checkType: "COMBAT" | "SEARCH" | "CRAFT" | "GENERAL" | null; // null = 모든 판정
  value: number;
  perDay: number;
  note: string;
};

export function describeAbilityEffect(e: { type: string; checkType: string | null; value: number; perDay: number; note: string }): string {
  const ct = e.checkType ? (CHECK_TYPE_OPTIONS.find((o) => o.value === e.checkType)?.label ?? e.checkType) : "모든";
  switch (e.type) {
    case "CHECK_BONUS": return `${ct} 판정 ${e.value >= 0 ? "+" : ""}${e.value}`;
    case "EXTRA_DICE": return `${ct} 판정 다이스 +${e.value}`;
    case "AUTO_SUCCESS": return `${ct} 판정 자동 성공 하루 ${e.perDay}회`;
    case "TELEPORT": return `공간 이동 하루 ${e.perDay}회`;
    case "CRAFT_DOUBLE": return "제작 2배";
    case "NARRATIVE": return e.note || "서술 전용";
    default: return e.type;
  }
}
