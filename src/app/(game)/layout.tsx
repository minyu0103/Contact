import { requireCharacterUser } from "@/lib/auth";
import { loadCharacter } from "@/lib/character";
import { getConfig } from "@/lib/game-config";
import { StatusBar } from "@/components/StatusBar";
import { GameNav } from "@/components/GameNav";
import { logoutAction } from "@/app/(auth)/actions";
import { cookies } from "next/headers";
import { returnToAdminAction } from "@/app/admin/npcs/actions";

export default async function GameLayout({ children }: { children: React.ReactNode }) {
  const { user, character: raw } = await requireCharacterUser();
  const cfg = await getConfig();
  const character = (await loadCharacter(raw.id, cfg)) ?? raw;
  const npcMode = character.isNpc && !!(await cookies()).get("contact_admin_return")?.value;
  return (
    <div className="min-h-dvh pb-20 sm:pb-0">
      <StatusBar character={character} cfg={cfg} isAdmin={user.role === "ADMIN"} npcReturn={npcMode && (
        <form action={returnToAdminAction}><button className="tag tag-warn hover:bg-warn/15" type="submit">NPC 조작 중 · 관리자로 돌아가기</button></form>
      )} />
      <div className="mx-auto flex max-w-6xl gap-6 px-3 py-5 sm:px-5">
        <aside className="hidden sm:block">
          <GameNav />
          <form action={logoutAction} className="mt-6 px-3">
            <button className="hud-label hover:text-fg" type="submit">접속 종료</button>
          </form>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
      <div className="sm:hidden">
        <GameNav />
      </div>
    </div>
  );
}
