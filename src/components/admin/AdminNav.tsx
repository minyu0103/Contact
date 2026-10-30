"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/admin", label: "대시보드", exact: true },
  { href: "/admin/realms", label: "이계" },
  { href: "/admin/items", label: "아이템" },
  { href: "/admin/drop-tables", label: "드랍 테이블" },
  { href: "/admin/users", label: "유저" },
  { href: "/admin/community", label: "커뮤니티" },
  { href: "/admin/logs", label: "로그 심사" },
  { href: "/admin/archive", label: "도감" },
  { href: "/admin/craft", label: "생산" },
  { href: "/admin/abilities", label: "능력 심사" },
  { href: "/admin/tags", label: "능력 태그" },
  { href: "/admin/invites", label: "초대 코드" },
  { href: "/admin/notices", label: "공지" },
  { href: "/admin/settings", label: "게임 설정" },
  { href: "/admin/audit", label: "변경 기록" },
];

export function AdminNav({ pendingAbilities }: { pendingAbilities: number }) {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto sm:w-44 sm:flex-col sm:overflow-visible">
      {ITEMS.map((it) => {
        const active = it.exact ? pathname === it.href : pathname.startsWith(it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            className={`flex shrink-0 items-center gap-2 border-b-2 px-3 py-2 text-sm transition-colors sm:border-b-0 sm:border-l-2 ${
              active ? "border-warn bg-warn/8 text-warn" : "border-transparent text-fg-dim hover:text-fg"
            }`}
          >
            {it.label}
            {it.href === "/admin/abilities" && pendingAbilities > 0 && (
              <span className="tag tag-warn ml-auto">{pendingAbilities}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
