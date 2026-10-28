import Link from "next/link";
import { db } from "@/lib/db";
import { requireCharacterUser } from "@/lib/auth";
import { authorInclude, authorView } from "@/lib/community";
import { formatKst } from "@/lib/time";

export default async function BoardPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { user } = await requireCharacterUser();
  const { page: p } = await searchParams;
  const page = Math.max(1, Number(p) || 1);
  const take = 30;
  const [posts, total] = await Promise.all([
    db.post.findMany({ where: { kind: "BOARD" }, orderBy: { createdAt: "desc" }, skip: (page - 1) * take, take, include: { author: authorInclude, _count: { select: { comments: true, reactions: true } } } }),
    db.post.count({ where: { kind: "BOARD" } }),
  ]);
  return (
    <section className="panel">
      <div className="panel-title">게시판<span className="code">{total}</span></div>
      <div className="flex items-center justify-between px-4 py-2"><p className="help">의뢰, 조직 홍보, 잡담, 익명 글 모두 여기에.</p><Link href="/community/board/new" className="btn btn-primary btn-sm">글쓰기</Link></div>
      <table className="table">
        <thead><tr><th>제목</th><th>작성자</th><th>시각</th></tr></thead>
        <tbody>
          {posts.length === 0 && <tr><td colSpan={3} className="help text-center">글이 없습니다.</td></tr>}
          {posts.map((post) => {
            const a = authorView(post.author, post.isAnonymous, user.role === "ADMIN");
            return (
              <tr key={post.id}>
                <td><Link href={`/community/board/${post.id}`} className="font-semibold hover:text-accent">{post.title}</Link> <span className="mono text-xs text-fg-mute">[{post._count.comments}]</span>{post._count.reactions > 0 && <span className="mono ml-1 text-xs text-accent">◆{post._count.reactions}</span>}</td>
                <td className="text-xs">{a.name}{a.badge && <span className="tag tag-accent ml-1">{a.badge}</span>}{a.realName && <span className="tag tag-warn ml-1">실제: {a.realName}</span>}</td>
                <td className="mono text-xs text-fg-mute">{formatKst(post.createdAt)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {total > take && <div className="flex gap-2 p-3">{page > 1 && <Link className="btn btn-sm" href={`?page=${page - 1}`}>이전</Link>}{page * take < total && <Link className="btn btn-sm" href={`?page=${page + 1}`}>다음</Link>}</div>}
    </section>
  );
}
