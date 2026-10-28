import Link from "next/link";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/PageHeader";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { formatKst } from "@/lib/time";
import { adminDeleteOrgAction, adminDeletePostAction } from "./actions";

const KIND = { TIMELINE: "타임라인", BOARD: "게시판", ORG: "조직", LOG: "로그" } as const;

async function rpCountLast24h() {
  const since = new Date(Date.now() - 24 * 3600 * 1000);
  return db.comment.count({ where: { erosionApplied: true, createdAt: { gte: since } } });
}

export default async function AdminCommunityPage() {
  const [posts, orgs, rpToday] = await Promise.all([
    db.post.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { author: true, org: true, _count: { select: { comments: true } } } }),
    db.organization.findMany({ orderBy: { createdAt: "asc" }, include: { leader: true, _count: { select: { members: true, posts: true } } } }),
    rpCountLast24h(),
  ]);
  return (
    <div>
      <PageHeader title="커뮤니티" description={`익명 글의 실제 작성자를 확인하고, 글을 삭제하거나 조직을 해산할 수 있습니다. 최근 24시간 RP 인정 댓글 ${rpToday}건.`} />
      <div className="grid gap-4 lg:grid-cols-[1fr_24rem]">
        <section className="panel overflow-x-auto">
          <div className="panel-title">최근 글<span className="code">{posts.length}</span></div>
          <table className="table">
            <thead><tr><th>종류</th><th>제목 / 내용</th><th>작성자</th><th>댓글</th><th>시각</th><th></th></tr></thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id}>
                  <td className="text-xs">{KIND[p.kind]}{p.org && <span className="text-fg-mute"> · {p.org.name}</span>}</td>
                  <td className="max-w-md truncate">{p.kind === "BOARD" ? <Link href={`/community/board/${p.id}`} className="hover:text-accent">{p.title}</Link> : p.kind === "LOG" ? <span className="text-fg-dim">[로그] {p.title}</span> : p.body.slice(0, 60)}</td>
                  <td className="text-xs">{p.author.name}{p.isAnonymous && <span className="tag tag-warn ml-1">익명</span>}</td>
                  <td className="mono text-xs">{p._count.comments}</td>
                  <td className="mono text-xs text-fg-mute">{formatKst(p.createdAt)}</td>
                  <td><form action={adminDeletePostAction}><input type="hidden" name="postId" value={p.id} /><ConfirmSubmit message="이 글을 삭제할까요?">삭제</ConfirmSubmit></form></td>
                </tr>
              ))}
              {posts.length === 0 && <tr><td colSpan={6} className="help text-center">글이 없습니다.</td></tr>}
            </tbody>
          </table>
        </section>
        <section className="panel">
          <div className="panel-title">조직<span className="code">{orgs.length}</span></div>
          <ul className="divide-y divide-line text-sm">
            {orgs.length === 0 && <li className="help p-4">조직이 없습니다.</li>}
            {orgs.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5">
                <Link href={`/community/org/${o.id}`} className="font-semibold hover:text-accent">{o.name}</Link>
                {!o.isPublic && <span className="tag">비밀</span>}
                <span className="text-xs text-fg-dim">수장 {o.leader.name} · {o._count.members}명 · 글 {o._count.posts}</span>
                <form action={adminDeleteOrgAction} className="ml-auto"><input type="hidden" name="orgId" value={o.id} /><ConfirmSubmit message={`"${o.name}" 조직을 해산할까요?`}>해산</ConfirmSubmit></form>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
