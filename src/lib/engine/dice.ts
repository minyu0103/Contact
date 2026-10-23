import { randomInt } from "crypto";

/** n면 주사위를 count개 굴린다 (서버 전용, 암호학적 난수) */
export function rollDice(count: number, sides: number): number[] {
  return Array.from({ length: Math.max(0, count) }, () => randomInt(1, sides + 1));
}

/** 가중치 목록에서 하나를 고른다. 반환은 인덱스. 합이 0이면 -1 */
export function weightedPick(weights: number[]): number {
  const total = weights.reduce((s, w) => s + Math.max(0, w), 0);
  if (total <= 0) return -1;
  let r = randomInt(0, total);
  for (let i = 0; i < weights.length; i++) {
    r -= Math.max(0, weights[i]);
    if (r < 0) return i;
  }
  return weights.length - 1;
}

export function chance(percent: number): boolean {
  if (percent >= 100) return true;
  if (percent <= 0) return false;
  return randomInt(0, 100) < percent;
}
