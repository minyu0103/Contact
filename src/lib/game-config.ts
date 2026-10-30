// 게임 설정: SPEC.md의 모든 "기본값" 수치를 한곳에 모은다.
// 관리자 페이지의 "게임 설정" 메뉴는 이 목록을 그대로 양식으로 보여 주고, 값은 Setting 테이블에 저장한다.
// 코드 어디에서도 수치를 직접 쓰지 않고 getConfig()를 통해 읽는다.

import { cache } from "react";
import { db } from "./db";

export type SettingDef = {
  key: string;
  label: string;
  group: string;
  type: "number" | "string" | "boolean";
  default: number | string | boolean;
  help?: string;
  min?: number;
  max?: number;
  step?: number;
};

export const SETTING_DEFS = [
  // 프로그램
  { key: "program.name", label: "프로그램 이름", group: "프로그램", type: "string", default: "CONTACT", help: "화면 상단과 설치 화면에 표시되는 프로그램 이름" },
  { key: "program.tagline", label: "프로그램 설명 문구", group: "프로그램", type: "string", default: "이능 감지 · 자동 접촉 프로그램", help: "로고 아래에 작게 표시" },
  { key: "program.version", label: "표시용 버전", group: "프로그램", type: "string", default: "2.6.0" },

  // 캐릭터 시작 수치
  { key: "char.startMaxHp", label: "시작 최대 체력", group: "캐릭터", type: "number", default: 10, min: 1 },
  { key: "char.startMaxMp", label: "시작 최대 정신력", group: "캐릭터", type: "number", default: 10, min: 1 },
  { key: "char.startPoints", label: "시작 P", group: "캐릭터", type: "number", default: 100, min: 0 },
  { key: "char.dailyAp", label: "하루 행동력", group: "캐릭터", type: "number", default: 3, min: 0 },
  { key: "char.dailyFullHeal", label: "매일 04:00 체력·정신력 전량 회복", group: "캐릭터", type: "boolean", default: true },
  { key: "char.inventorySlots", label: "인벤토리 칸 수", group: "캐릭터", type: "number", default: 20, min: 1 },
  { key: "char.statPointPerLevel", label: "레벨업당 스탯 포인트", group: "캐릭터", type: "number", default: 1, min: 0 },

  // 체력·정신력 효과
  { key: "hp.penalty50", label: "체력 50% 이하 판정 페널티", group: "체력·정신력", type: "number", default: -1, max: 0, help: "음수로 입력" },
  { key: "hp.penalty25", label: "체력 25% 이하 판정 페널티", group: "체력·정신력", type: "number", default: -2, max: 0 },
  { key: "mp.erosionMult50", label: "정신력 25%초과~50%이하 침식 배율", group: "체력·정신력", type: "number", default: 1.5, min: 1, step: 0.1 },
  { key: "mp.erosionMult25", label: "정신력 25% 이하 침식 배율", group: "체력·정신력", type: "number", default: 2, min: 1, step: 0.1 },

  // 침식률
  { key: "erosion.activeFrom", label: "활성 단계 시작", group: "침식률", type: "number", default: 40, min: 1 },
  { key: "erosion.warningFrom", label: "경고 단계 시작", group: "침식률", type: "number", default: 80, min: 1 },
  { key: "erosion.dangerFrom", label: "위험 단계 시작", group: "침식률", type: "number", default: 100, min: 1 },
  { key: "erosion.activeBonus", label: "활성 단계 자기 카테고리 판정 보정", group: "침식률", type: "number", default: 1 },
  { key: "erosion.entryUsesDepth", label: "노드 진입 침식률 기본값 = 층 수", group: "침식률", type: "boolean", default: true, help: "끄면 아래 고정값을 사용" },
  { key: "erosion.entryFixed", label: "노드 진입 침식률 고정값", group: "침식률", type: "number", default: 1, min: 0 },

  // 판정
  { key: "check.diceCount", label: "기본 주사위 개수", group: "판정", type: "number", default: 2, min: 1 },
  { key: "check.diceSides", label: "주사위 면 수", group: "판정", type: "number", default: 6, min: 2 },
  { key: "check.proficiencyBonusOffset", label: "숙련도 보정 = 숙련도 − n", group: "판정", type: "number", default: 1, help: "1이면 숙련도 1에서 +0, 5에서 +4" },

  // 성장
  { key: "exp.newNode", label: "새 노드 공개 경험치", group: "성장", type: "number", default: 3, min: 0 },
  { key: "exp.knownNode", label: "공개된 노드 진입 경험치", group: "성장", type: "number", default: 1, min: 0 },
  { key: "exp.escape", label: "탈출 성공 경험치", group: "성장", type: "number", default: 5, min: 0 },
  { key: "exp.fallenRatio", label: "쓰러짐 시 경험치 비율", group: "성장", type: "number", default: 0.5, min: 0, max: 1, step: 0.1 },
  { key: "exp.levelUpBase", label: "레벨업 필요 경험치 = 현재 레벨 × n", group: "성장", type: "number", default: 20, min: 1 },
  { key: "prof.threshold2", label: "숙련도 2 도달 숙련 경험", group: "성장", type: "number", default: 10, min: 1 },
  { key: "prof.threshold3", label: "숙련도 3 도달 숙련 경험", group: "성장", type: "number", default: 20, min: 1 },
  { key: "prof.threshold4", label: "숙련도 4 도달 숙련 경험", group: "성장", type: "number", default: 40, min: 1 },
  { key: "prof.threshold5", label: "숙련도 5 도달 숙련 경험", group: "성장", type: "number", default: 80, min: 1 },

  // 탐사 보수
  { key: "reward.newNode", label: "새 노드 공개 보수 (P)", group: "탐사 보수", type: "number", default: 30, min: 0 },
  { key: "reward.knownNode", label: "공개된 노드 진입 보수 (P)", group: "탐사 보수", type: "number", default: 5, min: 0 },
  { key: "reward.escapeBonus", label: "탈출 성공 보너스 (P)", group: "탐사 보수", type: "number", default: 10, min: 0 },

  // 쓰러짐
  { key: "fallen.returnHp", label: "쓰러짐 귀환 체력", group: "쓰러짐", type: "number", default: 1, min: 0 },
  { key: "fallen.returnMp", label: "쓰러짐 귀환 정신력", group: "쓰러짐", type: "number", default: 1, min: 0 },
  { key: "fallen.lootLossRatio", label: "이번 런 획득 아이템 상실 비율", group: "쓰러짐", type: "number", default: 0.5, min: 0, max: 1, step: 0.1, help: "홀수면 내림" },

  // 교류 (2차)
  { key: "rp.erosionPerComment", label: "RP 댓글 1회당 침식률 감소", group: "교류", type: "number", default: 1, min: 0 },
  { key: "rp.dailyLimit", label: "하루 인정 횟수", group: "교류", type: "number", default: 10, min: 0, help: "04:00 초기화" },
  { key: "rp.minLength", label: "인정되는 댓글 최소 글자 수", group: "교류", type: "number", default: 20, min: 1 },
  { key: "post.timelineMaxLength", label: "타임라인 글 최대 글자 수", group: "교류", type: "number", default: 280, min: 20 },
  { key: "org.maxMembers", label: "조직 최대 인원", group: "교류", type: "number", default: 10, min: 1 },

  // 로그 (2차)
  { key: "log.diaryReward", label: "일기 로그 보수 (P)", group: "로그", type: "number", default: 15, min: 0 },
  { key: "log.diaryMaxLength", label: "일기 로그 최대 글자 수", group: "로그", type: "number", default: 1000, min: 50 },
  { key: "log.memoThreshold", label: "맵 메모가 되는 공감 수", group: "로그", type: "number", default: 3, min: 1, help: "일기 로그의 공감이 이 수 이상이면 해당 구역에 메모로 표시" },

  // 인스턴트 이계 (2차)
  { key: "instant.sealReward", label: "봉합 보수 (P)", group: "인스턴트 이계", type: "number", default: 100, min: 0 },
  { key: "instant.autoSpawn", label: "자동 생성 켜기", group: "인스턴트 이계", type: "boolean", default: true, help: "끄면 운영자가 '지금 생성'으로만 만든다" },

  // 생산 (2차)
  { key: "craft.equipSlots", label: "장비 슬롯 수", group: "생산", type: "number", default: 2, min: 1, max: 6 },
  { key: "craft.extractChance", label: "인자 추출 성공률 (%)", group: "생산", type: "number", default: 70, min: 0, max: 100 },
  { key: "craft.productionExtractBonus", label: "생산형 추출 성공률 보너스 (%p)", group: "생산", type: "number", default: 20, min: 0, max: 100 },
  { key: "craft.productionMaxFactors", label: "생산형이 섞을 수 있는 인자 수", group: "생산", type: "number", default: 2, min: 1, max: 4 },

  // 거래 (2차)
  { key: "trade.maxOpenListings", label: "한 사람이 동시에 올릴 수 있는 거래 글", group: "거래", type: "number", default: 5, min: 1 },

  // 특수형 이계 (2차)
  { key: "special.maxPending", label: "한 사람의 동시 심사 중 신청 수", group: "특수형 이계", type: "number", default: 1, min: 1 },
  { key: "special.defaultReward", label: "승인 시 기본 보수 (P, 심사 화면 기본값)", group: "특수형 이계", type: "number", default: 300, min: 0 },

  // 공동 탐사 (2차)
  { key: "coop.maxMembers", label: "파티 최대 인원", group: "공동 탐사", type: "number", default: 4, min: 2, max: 8 },
  { key: "coop.erosionReduce", label: "공동 탐사 탈출 성공 시 전원 침식률 감소", group: "공동 탐사", type: "number", default: 5, min: 0 },

  // 능력
  { key: "ability.allowExploreWhilePending", label: "능력 심사 중에도 탐사 가능", group: "능력", type: "boolean", default: true },
] as const satisfies readonly SettingDef[];

export type SettingKey = (typeof SETTING_DEFS)[number]["key"];

type DefaultOf<K extends SettingKey> = Extract<(typeof SETTING_DEFS)[number], { key: K }>["default"];
export type GameConfig = { [K in SettingKey]: DefaultOf<K> extends number ? number : DefaultOf<K> extends boolean ? boolean : string };

export const DEFAULT_CONFIG = Object.fromEntries(SETTING_DEFS.map((d) => [d.key, d.default])) as GameConfig;

export const SETTING_GROUPS = Array.from(new Set(SETTING_DEFS.map((d) => d.group)));

/** DB 저장값을 기본값 위에 덮어 쓴 설정 전체. 한 요청 안에서는 한 번만 읽는다. */
export const getConfig = cache(async (): Promise<GameConfig> => {
  const rows = await db.setting.findMany();
  const cfg: Record<string, unknown> = { ...DEFAULT_CONFIG };
  for (const row of rows) {
    if (row.key in cfg) cfg[row.key] = row.value;
  }
  return cfg as GameConfig;
});

export function coerceSettingValue(def: SettingDef, raw: string | null): number | string | boolean {
  if (def.type === "boolean") return raw === "on" || raw === "true";
  if (def.type === "number") {
    const n = Number(raw);
    if (!Number.isFinite(n)) return def.default;
    let v = n;
    if (def.min !== undefined) v = Math.max(def.min, v);
    if (def.max !== undefined) v = Math.min(def.max, v);
    return v;
  }
  return raw ?? String(def.default);
}
