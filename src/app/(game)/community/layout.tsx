import { requireCharacterUser } from "@/lib/auth";
import { pendingOrgInviteCount, unreadDmCount } from "@/lib/community";
import { CommunityTabs } from "./CommunityTabs";

export default async function CommunityLayout({ children }: { children: React.ReactNode }) {
  const { character } = await requireCharacterUser();
  const [unread, invites] = await Promise.all([unreadDmCount(character.id), pendingOrgInviteCount(character.id)]);
  return (
    <div className="flex flex-col gap-4">
      <CommunityTabs unread={unread} invites={invites} />
      {children}
    </div>
  );
}
