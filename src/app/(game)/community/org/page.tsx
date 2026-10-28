import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireCharacterUser } from "@/lib/auth";
import { ActionForm } from "@/components/ActionForm";
import { applyToOrgAction, createOrgAction, decideInviteAction } from "../actions";

export default async function OrgHubPage() {
  const { character } = await requireCharacterUser();
  const me = await db.character.findUnique({ where: { id: character.id }, include: { orgMember: true } });
  if (me?.orgMember) redirect(`/community/org/${me.orgMember.orgId}`);
  const [orgs, invites, myApplies] = await Promise.all([
    db.organization.findMany({ where: { isPublic: true }, orderBy: { createdAt: "asc" }, include: { leader: true, _count: { select: { members: true } } } }),
    db.orgInvite.findMany({ where: { characterId: character.id, kind: "INVITE", status: "PENDING" }, include: { org: { include: { leader: true } } } }),
    db.orgInvite.findMany({ where: { characterId: character.id, kind: "APPLY", status: "PENDING" }, include: { org: true } }),
  ]);
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
      <div className="flex flex-col gap-4">
        {invites.length > 0 && (
          <section className="panel">
            <div className="panel-title">받은 영입 신청<span className="code">{invites.length}</span></div>
            <ul className="divide-y divide-line">
              {invites.map((inv) => (
                <li key={inv.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                  <span><b>{inv.org.name}</b> <span className="text-fg-dim">(수장 {inv.org.leader.name})</span>{inv.message && <span className="block text-xs text-fg-dim">“{inv.message}”</span>}</span>
                  <form action={decideInviteAction} className="ml-auto flex gap-1.5"><input type="hidden" name="inviteId" value={inv.id} /><button className="btn btn-primary btn-sm" name="decision" value="accept">수락</button><button className="btn btn-sm" name="decision" value="decline">거절</button></form>
                </li>
              ))}
            </ul>
          </section>
        )}
        <section className="panel">
          <div className="panel-title">조직 목록<span className="code">{orgs.length}</span></div>
          <ul className="divide-y divide-line">
            {orgs.length === 0 && <li className="help p-4">홍보 중인 조직이 없습니다. 직접 만들어 보세요.</li>}
            {orgs.map((o) => {
              const applied = myApplies.some((a) => a.orgId === o.id);
              return (
                <li key={o.id} className="px-4 py-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/community/org/${o.id}`} className="font-semibold hover:text-accent">{o.name}</Link>
                    <span className="text-xs text-fg-dim">수장 {o.leader.name} · {o._count.members}명</span>
                    {applied ? <span className="tag tag-warn ml-auto">신청 중</span> : (
                      <ActionForm action={applyToOrgAction} submitLabel="가입 신청" submitClassName="btn btn-sm" className="ml-auto flex items-center gap-2">
                        <input type="hidden" name="orgId" value={o.id} />
                        <input name="message" className="input w-40 py-1 text-xs" placeholder="한마디 (선택)" maxLength={300} />
                      </ActionForm>
                    )}
                  </div>
                  <p className="help mt-1 line-clamp-2 whitespace-pre-wrap">{o.description}</p>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
      <section className="panel self-start">
        <div className="panel-title">조직 설립</div>
        <div className="p-4">
          <p className="help mb-3">흥신소, 스타트업, 동아리… 형태는 자유입니다. 한 사람은 한 조직에만 속할 수 있습니다.</p>
          <ActionForm action={createOrgAction} submitLabel="설립">
            <div className="field"><label htmlFor="name">조직 이름</label><input id="name" name="name" className="input" maxLength={20} required /></div>
            <div className="field"><label htmlFor="description">소개 (설정)</label><textarea id="description" name="description" className="textarea" maxLength={2000} /></div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isPublic" defaultChecked className="accent-[var(--accent)]" /> 목록에 홍보 (끄면 영입 신청으로만 가입 가능한 비밀 조직)</label>
          </ActionForm>
        </div>
      </section>
    </div>
  );
}
