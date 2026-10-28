import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireCharacterUser } from "@/lib/auth";
import { getConfig } from "@/lib/game-config";
import { ActionForm } from "@/components/ActionForm";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { CharacterName } from "@/components/community/CharacterName";
import { Comments, commentInclude } from "@/components/community/Comments";
import { authorInclude, authorView } from "@/lib/community";
import { formatKst } from "@/lib/time";
import { CATEGORY_LABEL } from "@/lib/rules";
import { applyToOrgAction, createPostAction, decideInviteAction, deletePostAction, disbandOrgAction, inviteToOrgAction, kickMemberAction, leaveOrgAction, toggleBadgeAction, updateOrgAction } from "../../actions";

export default async function OrgPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const { user, character } = await requireCharacterUser();
  const cfg = await getConfig();
  const org = await db.organization.findUnique({ where: { id: orgId }, include: { leader: true, members: { include: { character: true }, orderBy: { joinedAt: "asc" } } } });
  if (!org) notFound();
  const isAdmin = user.role === "ADMIN";
  const myMembership = org.members.find((m) => m.characterId === character.id);
  const isMember = !!myMembership;
  const isLeader = org.leaderId === character.id;
  if (!org.isPublic && !isMember && !isAdmin) notFound();

  const [posts, applies, myApply, myOrg] = await Promise.all([
    isMember || isAdmin ? db.post.findMany({ where: { kind: "ORG", orgId }, orderBy: { createdAt: "desc" }, take: 30, include: { author: authorInclude, comments: { ...commentInclude, orderBy: { createdAt: "asc" } } } }) : Promise.resolve([]),
    isLeader ? db.orgInvite.findMany({ where: { orgId, kind: "APPLY", status: "PENDING" }, include: { character: true } }) : Promise.resolve([]),
    db.orgInvite.findFirst({ where: { orgId, characterId: character.id, status: "PENDING" } }),
    db.orgMember.findUnique({ where: { characterId: character.id } }),
  ]);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
      <div className="flex flex-col gap-4">
        <section className="panel">
          <div className="panel-title">{org.name}{!org.isPublic && <span className="tag ml-2">비밀 조직</span>}<span className="code">{org.members.length} / {cfg["org.maxMembers"]}</span></div>
          <div className="flex flex-col gap-3 p-4 text-sm">
            <p className="whitespace-pre-wrap leading-relaxed text-fg-dim">{org.description || "소개가 없습니다."}</p>
            <ul className="flex flex-wrap gap-2">
              {org.members.map((m) => (
                <li key={m.characterId} className="flex items-center gap-2 border border-line px-2 py-1 text-xs">
                  <span className="font-semibold">{m.character.name}</span><span className="text-fg-mute">{CATEGORY_LABEL[m.character.category]}</span>
                  {m.characterId === org.leaderId && <span className="tag tag-warn">수장</span>}
                  {isLeader && m.characterId !== character.id && (
                    <form action={kickMemberAction}><input type="hidden" name="orgId" value={org.id} /><input type="hidden" name="characterId" value={m.characterId} /><ConfirmSubmit message={`${m.character.name}을(를) 퇴출할까요?`} className="btn btn-ghost btn-sm text-danger">퇴출</ConfirmSubmit></form>
                  )}
                </li>
              ))}
            </ul>
            {!isMember && !myOrg && org.isPublic && (
              myApply ? <span className="tag tag-warn self-start">가입 신청 중</span> : (
                <ActionForm action={applyToOrgAction} submitLabel="가입 신청" submitClassName="btn btn-primary btn-sm" className="flex flex-wrap items-center gap-2">
                  <input type="hidden" name="orgId" value={org.id} /><input name="message" className="input w-48 py-1 text-xs" placeholder="한마디 (선택)" maxLength={300} />
                </ActionForm>
              )
            )}
            {isMember && (
              <div className="flex flex-wrap items-center gap-2">
                <form action={toggleBadgeAction}><button className="btn btn-sm" type="submit">이름 옆 조직 표시: {myMembership.showBadge ? "켜짐" : "꺼짐"}</button></form>
                <form action={leaveOrgAction}><input type="hidden" name="orgId" value={org.id} /><ConfirmSubmit message={isLeader ? (org.members.length > 1 ? "수장 자리를 다음 조직원에게 넘기고 나갈까요?" : "혼자인 조직입니다. 나가면 조직이 해산됩니다.") : "조직에서 나갈까요?"} className="btn btn-sm">탈퇴</ConfirmSubmit></form>
                {isLeader && <form action={disbandOrgAction}><input type="hidden" name="orgId" value={org.id} /><ConfirmSubmit message="조직을 해산할까요? 조직 게시판 글도 모두 사라집니다.">해산</ConfirmSubmit></form>}
              </div>
            )}
          </div>
        </section>

        {(isMember || isAdmin) && (
          <section className="panel">
            <div className="panel-title">조직 게시판<span className="code">조직원만</span></div>
            <div className="flex flex-col gap-4 p-4">
              {isMember && (
                <ActionForm action={createPostAction} submitLabel="올리기" submitClassName="btn btn-primary btn-sm">
                  <input type="hidden" name="kind" value="ORG" /><input type="hidden" name="orgId" value={org.id} />
                  <input name="title" className="input" placeholder="제목" maxLength={100} required />
                  <textarea name="body" className="textarea min-h-[4rem]" placeholder="내용" maxLength={10000} required />
                </ActionForm>
              )}
              {posts.length === 0 && <p className="help">글이 없습니다.</p>}
              {posts.map((p) => (
                <article key={p.id} className="border border-line p-3">
                  <div className="flex flex-wrap items-center gap-2 text-sm"><b>{p.title}</b><CharacterName a={authorView(p.author, false, isAdmin)} /><span className="mono text-xs text-fg-mute">{formatKst(p.createdAt)}</span>
                    {(p.authorId === character.id || isAdmin) && <form action={deletePostAction} className="ml-auto"><input type="hidden" name="postId" value={p.id} /><ConfirmSubmit message="글을 삭제할까요?" className="btn btn-ghost btn-sm text-fg-mute">삭제</ConfirmSubmit></form>}
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{p.body}</p>
                  {isMember && <Comments postId={p.id} comments={p.comments} viewerId={character.id} viewerIsAdmin={isAdmin} allowAnonymous={false} minLength={cfg["rp.minLength"]} />}
                </article>
              ))}
            </div>
          </section>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {isLeader && (
          <>
            <section className="panel">
              <div className="panel-title">영입 신청 보내기</div>
              <div className="p-4">
                <ActionForm action={inviteToOrgAction} submitLabel="영입 신청" submitClassName="btn btn-sm">
                  <input type="hidden" name="orgId" value={org.id} />
                  <input name="name" className="input" placeholder="유저 이름" required />
                  <input name="message" className="input" placeholder="한마디 (선택)" maxLength={300} />
                </ActionForm>
              </div>
            </section>
            {applies.length > 0 && (
              <section className="panel">
                <div className="panel-title">받은 가입 신청<span className="code">{applies.length}</span></div>
                <ul className="divide-y divide-line text-sm">
                  {applies.map((a) => (
                    <li key={a.id} className="flex flex-wrap items-center gap-2 px-4 py-2">
                      <span><b>{a.character.name}</b> <span className="text-xs text-fg-dim">{CATEGORY_LABEL[a.character.category]}</span>{a.message && <span className="block text-xs text-fg-dim">“{a.message}”</span>}</span>
                      <form action={decideInviteAction} className="ml-auto flex gap-1.5"><input type="hidden" name="inviteId" value={a.id} /><button className="btn btn-primary btn-sm" name="decision" value="accept">수락</button><button className="btn btn-sm" name="decision" value="decline">거절</button></form>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <section className="panel">
              <div className="panel-title">조직 설정</div>
              <div className="p-4">
                <ActionForm action={updateOrgAction} submitLabel="저장" submitClassName="btn btn-sm">
                  <input type="hidden" name="orgId" value={org.id} />
                  <div className="field"><label>이름</label><input name="name" className="input" defaultValue={org.name} maxLength={20} required /></div>
                  <div className="field"><label>소개</label><textarea name="description" className="textarea" defaultValue={org.description} maxLength={2000} /></div>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isPublic" defaultChecked={org.isPublic} className="accent-[var(--accent)]" /> 목록에 홍보</label>
                </ActionForm>
              </div>
            </section>
          </>
        )}
        <Link href="/community/org" className="btn btn-ghost btn-sm self-start">← 조직 목록</Link>
      </div>
    </div>
  );
}
