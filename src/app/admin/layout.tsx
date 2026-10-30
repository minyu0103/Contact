import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { getConfig } from "@/lib/game-config";
import { AdminNav } from "@/components/admin/AdminNav";
import { ProgramMark } from "@/components/ProgramMark";
import { logoutAction } from "@/app/(auth)/actions";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  const [cfg, pending] = await Promise.all([getConfig(), db.character.count({ where: { abilityStatus: "PENDING", isNpc: false } })]);
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-warn/30 bg-bg/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-3 py-2.5 sm:px-5">
          <Link href="/admin"><ProgramMark name={cfg["program.name"]} size="sm" /></Link>
          <span className="tag tag-warn">관리자 페이지</span>
          <span className="ml-auto text-xs text-fg-dim">{user.loginId}</span>
          {user.character ? (
            <Link href="/home" className="btn btn-sm">게임 화면</Link>
          ) : (
            <Link href="/create-character" className="btn btn-sm">유저 등록</Link>
          )}
          <form action={logoutAction}><button className="btn btn-ghost btn-sm" type="submit">접속 종료</button></form>
        </div>
      </header>
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-3 py-4 sm:flex-row sm:gap-6 sm:px-5">
        <aside className="shrink-0"><AdminNav pendingAbilities={pending} /></aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
