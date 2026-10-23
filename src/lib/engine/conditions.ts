import type { Condition } from "@/lib/content-types";
import { EROSION_STAGE_ORDER, type ErosionStage } from "@/lib/rules";
import type { EngineCtx } from "./types";

export type ConditionCtx = EngineCtx & {
  flags: Set<string>;
  hasItem: (itemId: string) => boolean;
};

/** 조건 목록을 모두 충족하는지 */
export function evalConditions(conds: Condition[], ctx: ConditionCtx): boolean {
  return conds.every((c) => evalCondition(c, ctx));
}

export function evalCondition(c: Condition, ctx: ConditionCtx): boolean {
  switch (c.type) {
    case "category": return ctx.category === c.value;
    case "ability_effect": return ctx.abilityActive && ctx.effects.some((e) => e.type === c.value);
    case "tag": return ctx.tagIds.has(c.tagId);
    case "item": return ctx.hasItem(c.itemId);
    case "erosion_stage_at_least": return EROSION_STAGE_ORDER.indexOf(ctx.stage) >= EROSION_STAGE_ORDER.indexOf(c.value as ErosionStage);
    case "flag": return ctx.flags.has(c.flag);
    case "not_flag": return !ctx.flags.has(c.flag);
    default: return false;
  }
}

/** 조건을 유저에게 보여 줄 짧은 설명 (잠긴 선택지용) */
export function describeCondition(c: Condition, names: { items: Map<string, string>; tags: Map<string, string> }): string {
  const CAT: Record<string, string> = { COMBAT: "전투형", SEARCH: "탐색형", PRODUCTION: "생산형", SPECIAL: "특수형" };
  const STAGE: Record<string, string> = { STABLE: "안정", ACTIVE: "활성", WARNING: "경고", DANGER: "위험" };
  switch (c.type) {
    case "category": return `${CAT[c.value]} 전용`;
    case "ability_effect": return "특정 능력 효과 필요";
    case "tag": return `능력 태그 "${names.tags.get(c.tagId) ?? "?"}" 필요`;
    case "item": return `"${names.items.get(c.itemId) ?? "?"}" 필요`;
    case "erosion_stage_at_least": return `침식률 ${STAGE[c.value]} 단계 이상`;
    case "flag": case "not_flag": return "지금은 할 수 없다";
  }
}
