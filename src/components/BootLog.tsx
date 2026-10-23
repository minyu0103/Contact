"use client";

import { useEffect, useState } from "react";

const LINES = [
  "기기 호환성 확인 ... 통과",
  "생체 신호 스캔 ... 인자 반응 감지",
  "접근 권한 검증 ... 사용자 의지 확인",
  "주변 이계 신호 탐색 ... 3건 감지",
  "자동 설치 준비 완료. 초대 코드를 입력하십시오.",
];

/** 설치 화면의 부팅 로그 연출. 순수 장식이며 게임 로직에는 관여하지 않는다. */
export function BootLog() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (count >= LINES.length) return;
    const t = setTimeout(() => setCount((c) => c + 1), 350);
    return () => clearTimeout(t);
  }, [count]);
  return (
    <div className="mb-5 min-h-[7rem] border border-line bg-bg/70 p-3 text-[0.74rem] leading-6 text-fg-dim">
      {LINES.slice(0, count).map((l, i) => (
        <div key={i} className="flex gap-2">
          <span className="mono text-fg-mute">{String(i + 1).padStart(2, "0")}</span>
          <span>{l}</span>
        </div>
      ))}
      {count < LINES.length && <span className="cursor-blink" />}
    </div>
  );
}
