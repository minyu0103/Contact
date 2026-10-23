"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/home", label: "홈", code: "HOME" },
  { href: "/map", label: "지도", code: "MAP" },
  { href: "/inventory", label: "보관함", code: "INV" },
  { href: "/shop", label: "상점", code: "SHOP" },
  { href: "/character", label: "유저", code: "USER" },
  { href: "/records", label: "기록", code: "LOG" },
];

/** 데스크톱에서는 왼쪽 세로 메뉴, 휴대폰에서는 아래쪽 탭 바 */
export function GameNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/95 backdrop-blur sm:static sm:w-44 sm:border-0 sm:bg-transparent">
      <ul className="flex justify-around sm:flex-col sm:gap-1">
        {ITEMS.map((it) => {
          const active = pathname === it.href || pathname.startsWith(it.href + "/");
          return (
            <li key={it.href} className="flex-1 sm:flex-none">
              <Link
                href={it.href}
                className={`flex flex-col items-center gap-0.5 px-2 py-2 text-[0.7rem] sm:flex-row sm:gap-3 sm:border-l-2 sm:px-3 sm:py-2 sm:text-sm ${
                  active ? "text-accent sm:border-accent sm:bg-accent-dim" : "text-fg-dim hover:text-fg sm:border-transparent"
                }`}
              >
                <span className="mono text-[0.6rem] tracking-widest">{it.code}</span>
                <span>{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
