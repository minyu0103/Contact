// 조건·효과 목록의 서버 검증 스키마 (관리자 양식이 만든 JSON을 검사)
import { z } from "zod";

const conditionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("category"), value: z.enum(["COMBAT", "SEARCH", "PRODUCTION", "SPECIAL"]) }),
  z.object({ type: z.literal("ability_effect"), value: z.enum(["CHECK_BONUS", "EXTRA_DICE", "AUTO_SUCCESS", "TELEPORT", "CRAFT_DOUBLE", "NARRATIVE"]) }),
  z.object({ type: z.literal("tag"), tagId: z.string().min(1, "태그를 고르세요.") }),
  z.object({ type: z.literal("item"), itemId: z.string().min(1, "아이템을 고르세요.") }),
  z.object({ type: z.literal("erosion_stage_at_least"), value: z.enum(["STABLE", "ACTIVE", "WARNING", "DANGER"]) }),
  z.object({ type: z.literal("flag"), flag: z.string().trim().min(1, "플래그 이름을 입력하세요.").max(40) }),
  z.object({ type: z.literal("not_flag"), flag: z.string().trim().min(1, "플래그 이름을 입력하세요.").max(40) }),
]);
const effectSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("hp"), value: z.number().int() }),
  z.object({ type: z.literal("mp"), value: z.number().int() }),
  z.object({ type: z.literal("erosion"), value: z.number().int() }),
  z.object({ type: z.literal("points"), value: z.number().int() }),
  z.object({ type: z.literal("item_gain"), itemId: z.string().min(1, "아이템을 고르세요."), qty: z.number().int().min(1) }),
  z.object({ type: z.literal("item_lose"), itemId: z.string().min(1, "아이템을 고르세요."), qty: z.number().int().min(1) }),
  z.object({ type: z.literal("item_drop"), tableId: z.string().min(1, "드랍 테이블을 고르세요."), rolls: z.number().int().min(1) }),
  z.object({ type: z.literal("clue"), text: z.string().max(500), flag: z.string().max(40) }),
  z.object({ type: z.literal("set_flag"), flag: z.string().trim().min(1, "플래그 이름을 입력하세요.").max(40) }),
  z.object({ type: z.literal("goto_scene"), sceneId: z.string().min(1, "장면을 고르세요.") }),
  z.object({ type: z.literal("move"), nodeId: z.string().min(1, "노드를 고르세요.") }),
  z.object({ type: z.literal("move_back") }),
  z.object({ type: z.literal("reveal"), nodeId: z.string().min(1, "노드를 고르세요.") }),
  z.object({ type: z.literal("escape") }),
  z.object({ type: z.literal("seal") }),
]);
export const conditionListSchema = z.array(conditionSchema);
export const effectListSchema = z.array(effectSchema);

