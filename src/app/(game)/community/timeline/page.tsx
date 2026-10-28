import { db } from "@/lib/db";
import { requireCharacterUser } from "@/lib/auth";
import { getConfig } from "@/lib/game-config";
import { ActionForm } from "@/components/ActionForm";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { CharacterName } from "@/components/community/CharacterName";
import { Comments, commentInclude } from "@/components/community/Comments";
import { authorInclude, authorView } from "@/lib/community";
import { formatKst } from "@/lib/time";
import { createPostAction, deletePostAction, toggleReactionAction } from "../actions";

export default async function TimelinePage() {
  const { user, character } = await requireCharacterUser();
  const cfg = await getConfig();
  const posts = await db.post.findMany({ where: { kind: "TIMELINE" }, orderBy: { createdAt: "desc" }, take: 50, include: { author: authorInclude, comments: { ...commentInclude, orderBy: { createdAt: "asc" } }, reactions: true } });
  const isAdmin = user.role === "ADMIN";
  return (
    <div className="flex flex-col gap-4">
      <section className="panel">
        <div className="panel-title">새 글<span className="code">{cfg["post.timelineMaxLength"]}자</span></div>
        <div className="p-4">
          <ActionForm action={createPostAction} submitLabel="올리기" submitClassName="btn btn-primary btn-sm">
            <input type="hidden" name="kind" value="TIMELINE" />
            <textarea name="body" className="textarea min-h-[4rem]" placeholder="지금 무슨 일이 있나요? 캐릭터로서 적어 보세요." maxLength={cfg["post.timelineMaxLength"]} required />
          </ActionForm>
        </div>
      </section>
      {posts.length === 0 && <p className="help">아직 글이 없습니다. 첫 글을 올려 보세요.</p>}
      {posts.map((p) => {
        const a = authorView(p.author, false, isAdmin);
        const liked = p.reactions.some((r) => r.characterId === character.id);
        return (
          <article key={p.id} className="panel">
            <div className="flex flex-col gap-3 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <CharacterName a={a} size="md" />
                <span className="mono text-xs text-fg-mute">{formatKst(p.createdAt)}</span>
                {(p.authorId === character.id || isAdmin) && (
                  <form action={deletePostAction} className="ml-auto"><input type="hidden" name="postId" value={p.id} /><ConfirmSubmit message="글을 삭제할까요?" className="btn btn-ghost btn-sm text-fg-mute">삭제</ConfirmSubmit></form>
                )}
              </div>
              <p className="whitespace-pre-wrap leading-relaxed">{p.body}</p>
              <div className="flex items-center gap-3 text-xs">
                <form action={toggleReactionAction}><input type="hidden" name="postId" value={p.id} /><button className={`btn btn-sm ${liked ? "border-accent text-accent" : ""}`} type="submit">◆ 공감 {p.reactions.length}</button></form>
                <span className="text-fg-mute">댓글 {p.comments.length}</span>
              </div>
              <Comments postId={p.id} comments={p.comments} viewerId={character.id} viewerIsAdmin={isAdmin} allowAnonymous={false} minLength={cfg["rp.minLength"]} compact />
            </div>
          </article>
        );
      })}
    </div>
  );
}
