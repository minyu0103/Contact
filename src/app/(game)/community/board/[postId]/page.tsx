import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireCharacterUser } from "@/lib/auth";
import { getConfig } from "@/lib/game-config";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { CharacterName } from "@/components/community/CharacterName";
import { Comments, commentInclude } from "@/components/community/Comments";
import { authorInclude, authorView } from "@/lib/community";
import { formatKst } from "@/lib/time";
import { deletePostAction, toggleReactionAction } from "../../actions";

export default async function BoardPostPage({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  const { user, character } = await requireCharacterUser();
  const cfg = await getConfig();
  const post = await db.post.findUnique({ where: { id: postId }, include: { author: authorInclude, comments: { ...commentInclude, orderBy: { createdAt: "asc" } }, reactions: true } });
  if (!post || post.kind !== "BOARD") notFound();
  const isAdmin = user.role === "ADMIN";
  const a = authorView(post.author, post.isAnonymous, isAdmin);
  const liked = post.reactions.some((r) => r.characterId === character.id);
  return (
    <article className="panel">
      <div className="panel-title">{post.title}</div>
      <div className="flex flex-col gap-4 p-4">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <CharacterName a={a} size="md" /><span className="mono text-xs text-fg-mute">{formatKst(post.createdAt)}</span>
          {(post.authorId === character.id || isAdmin) && (
            <form action={deletePostAction} className="ml-auto"><input type="hidden" name="postId" value={post.id} /><ConfirmSubmit message="글을 삭제할까요?" className="btn btn-ghost btn-sm text-fg-mute">삭제</ConfirmSubmit></form>
          )}
        </div>
        <p className="whitespace-pre-wrap leading-relaxed">{post.body}</p>
        <div className="flex items-center gap-3 text-xs">
          <form action={toggleReactionAction}><input type="hidden" name="postId" value={post.id} /><button className={`btn btn-sm ${liked ? "border-accent text-accent" : ""}`} type="submit">◆ 공감 {post.reactions.length}</button></form>
          <span className="text-fg-mute">댓글 {post.comments.length}</span>
        </div>
        <div className="divider-label">댓글</div>
        <Comments postId={post.id} comments={post.comments} viewerId={character.id} viewerIsAdmin={isAdmin} allowAnonymous={!post.isAnonymous} minLength={cfg["rp.minLength"]} />
        <Link href="/community/board" className="btn btn-sm self-start">← 목록</Link>
      </div>
    </article>
  );
}
