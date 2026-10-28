import type { AbilityCategory, CheckType } from "@prisma/client";
import type { ErosionStage } from "@/lib/rules";

/** 런 중 조작 대상이 되는 캐릭터 수치. 실제 캐릭터 또는 테스트 스냅샷. */
export type CharState = {
  hp: number; maxHp: number; mp: number; maxMp: number; erosion: number; points: number;
  exp: number; level: number; statPoints: number; proficiency: number; proficiencyExp: number;
  escapeCount: number; autoSuccessUsedToday: number; teleportUsedToday: number;
};

export type Modifier = { label: string; value: number };

export type CheckResult = {
  checkType: CheckType;
  target: number;
  dice: number[];      // 굴린 모든 눈
  kept: number[];      // 합산에 쓴 눈 (높은 2개)
  modifiers: Modifier[];
  total: number;
  success: boolean;
  auto: boolean;       // 자동 성공 사용
  forced?: "SUCCESS" | "FAIL";
};

export type Delta = { label: string; value?: number; text?: string };

export type LastResult = {
  kind: "choice" | "move" | "item" | "teleport" | "info";
  title: string;                // 고른 선택지 문구 등
  check?: CheckResult | null;
  text: string;                 // 결과 텍스트
  deltas: Delta[];
  sceneText?: string | null;    // 이동 후 새 노드의 이벤트 텍스트 등 (참고용)
};

export type RunSummary = {
  status: "ESCAPED" | "FALLEN" | "ABORTED";
  realmName: string;
  newNodes: string[];           // 새로 밝힌 노드 이름
  visited: string[];
  reward: number;
  exp: number;
  levelUps: number;
  gained: { name: string; qty: number }[];
  lost: { name: string; qty: number }[];
  discarded: { name: string; qty: number }[]; // 보관함이 가득 차 버린 것
  clues: { text: string; flag: string }[];
  proficiencyBefore: number;
  proficiencyAfter: number;
  isTest: boolean;
  sealed?: boolean;
  sealReward?: number;
};

export type EngineCtx = {
  category: AbilityCategory;
  ownCheckType: CheckType | null;
  abilityActive: boolean;
  effects: { type: string; checkType: CheckType | null; value: number; perDay: number }[];
  tagIds: Set<string>;
  stage: ErosionStage;
};
