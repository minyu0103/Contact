import "server-only";
import { db } from "./db";
import { getConfig, type GameConfig } from "./game-config";
import { gameDayKey } from "./time";
import type { Character } from "@prisma/client";

/**
 * 일일 초기화(04:00 KST)를 요청 시점에 늦게 적용한다.
 * 별도 크론 없이, 마지막 초기화 게임일 키가 오늘과 다르면 초기화한다.
 */
export async function applyDailyReset(character: Character, cfg?: GameConfig): Promise<Character> {
  const today = gameDayKey();
  if (character.lastDailyResetKey === today) return character;
  const config = cfg ?? (await getConfig());
  const data: Partial<Character> = {
    ap: config["char.dailyAp"],
    autoSuccessUsedToday: 0,
    teleportUsedToday: 0,
    rpCountToday: 0,
    lastDailyResetKey: today,
  };
  if (config["char.dailyFullHeal"]) {
    data.hp = character.maxHp;
    data.mp = character.maxMp;
  }
  return db.character.update({ where: { id: character.id }, data });
}

/** 캐릭터를 최신 상태(일일 초기화 반영)로 가져온다. */
export async function loadCharacter(characterId: string, cfg?: GameConfig) {
  const c = await db.character.findUnique({ where: { id: characterId } });
  if (!c) return null;
  return applyDailyReset(c, cfg);
}
