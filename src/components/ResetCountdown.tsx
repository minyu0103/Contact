"use client";

import { useSyncExternalStore } from "react";

// 1초마다 갱신되는 "현재 시각" 스토어. 서버 렌더링 시에는 null을 주어 hydration 불일치를 피한다.
function subscribe(onChange: () => void) {
  const t = setInterval(onChange, 1000);
  return () => clearInterval(t);
}
const getNow = () => Math.floor(Date.now() / 1000);
const getServerNow = () => null;

/** 다음 04:00 KST 초기화까지 남은 시간 */
export function ResetCountdown({ nextResetIso }: { nextResetIso: string }) {
  const now = useSyncExternalStore(subscribe, getNow, getServerNow);
  if (now === null) return <span className="mono">--:--:--</span>;
  const diff = Math.max(0, Math.floor(new Date(nextResetIso).getTime() / 1000) - now);
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <span className="mono" title="다음 초기화 (04:00 KST)">
      {pad(h)}:{pad(m)}:{pad(s)}
    </span>
  );
}
