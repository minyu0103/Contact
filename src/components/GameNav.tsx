"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/home", label: "홈", code: "01" },
  { href: "/map", label: "지도", code: "02" },
  { href: "/community", label: "교류", code: "03" },
  { href: "/shop", label: "상점", code: "04" },
  { href: "/character", label: "유저", code: "05" },
  { href: "/records", label: "기록", code: "06" },
];

/** 데스크톱에서는 왼쪽 세로 메뉴, 휴대폰에서는 아래쪽 탭 바 */
export function GameNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/92 pb-[env(safe-area-inset-bottom)] backdrop-blur-md sm:static sm:w-40 sm:border-0 sm:bg-transparent sm:pb-0">
      <ul className="flex justify-around sm:flex-col sm:gap-0.5">
        {ITEMS.map((it) => {
          const active = pathname === it.href || pathname.startsWith(it.href + "/");
          return (
            <li key={it.href} className="flex-1 sm:flex-none">
              <Link
                href={it.href}
                className={`flex flex-col items-center gap-0.5 px-2 py-2.5 text-[0.7rem] font-medium transition-colors sm:flex-row sm:gap-3 sm:border-l-2 sm:px-3 sm:py-2 sm:text-sm ${
                  active ? "text-accent sm:border-accent sm:bg-accent-dim" : "text-fg-dim hover:text-fg sm:border-transparent"
                }`}
              >
                <span className="mono text-[0.6rem] opacity-70">{it.code}</span>
                <span>{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
