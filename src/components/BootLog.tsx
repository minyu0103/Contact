"use client";

import { useEffect, useState } from "react";

const LINES = [
  "기기 호환성 확인... 통과",
  "생체 신호 스캔... 인자 반응 감지",
  "접근 권한 검증... 사용자 의지 확인 중",
  "주변 이계 신호 탐색... 3건 감지",
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
    <pre className="mono mb-4 min-h-[6.5rem] whitespace-pre-wrap border border-line bg-bg p-3 text-[0.7rem] leading-5 text-fg-dim">
      {LINES.slice(0, count).map((l, i) => (
        <div key={i}>
          <span className="text-accent-2">▸</span> {l}
        </div>
      ))}
      {count < LINES.length && <span className="cursor-blink" />}
    </pre>
  );
}
