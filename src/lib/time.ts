// 시간대: 한국 시간(KST, UTC+9). 일일 초기화는 매일 04:00 (확정).
// 서버가 어디서 돌든 결과가 같도록 Date 연산은 전부 UTC 기준으로 하고 9시간을 더한다.

export const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
export const RESET_HOUR_KST = 4;

/** KST 기준 "게임일" 키. 04:00 전은 전날로 센다. 예: "2026-10-23" */
export function gameDayKey(now: Date = new Date()): string {
  const shifted = new Date(now.getTime() + KST_OFFSET_MS - RESET_HOUR_KST * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
}

/** 다음 04:00 KST 시각 */
export function nextResetAt(now: Date = new Date()): Date {
  const kst = new Date(now.getTime() + KST_OFFSET_MS);
  const y = kst.getUTCFullYear();
  const m = kst.getUTCMonth();
  const d = kst.getUTCDate();
  let resetKstMs = Date.UTC(y, m, d, RESET_HOUR_KST, 0, 0);
  if (resetKstMs <= kst.getTime()) resetKstMs += 24 * 60 * 60 * 1000;
  return new Date(resetKstMs - KST_OFFSET_MS);
}

/** KST로 보기 좋게 */
export function formatKst(date: Date, withSeconds = false): string {
  const kst = new Date(date.getTime() + KST_OFFSET_MS);
  const pad = (n: number) => String(n).padStart(2, "0");
  const base = `${kst.getUTCFullYear()}-${pad(kst.getUTCMonth() + 1)}-${pad(kst.getUTCDate())} ${pad(kst.getUTCHours())}:${pad(kst.getUTCMinutes())}`;
  return withSeconds ? `${base}:${pad(kst.getUTCSeconds())}` : base;
}
