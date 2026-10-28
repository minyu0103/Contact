"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function CommunityTabs({ unread, invites }: { unread: number; invites: number }) {
  const pathname = usePathname();
  const tabs = [
    { href: "/community/timeline", label: "타임라인" },
    { href: "/community/board", label: "게시판" },
    { href: "/community/logs", label: "로그" },
    { href: "/community/dm", label: "대화", badge: unread },
    { href: "/community/org", label: "조직", badge: invites },
  ];
  return (
    <nav className="flex gap-1 border-b border-line">
      {tabs.map((t) => {
        const active = pathname.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} className={`-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm ${active ? "border-accent text-accent" : "border-transparent text-fg-dim hover:text-fg"}`}>
            {t.label}{t.badge ? <span className="tag tag-warn">{t.badge}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
