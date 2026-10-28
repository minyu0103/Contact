import type { Prisma } from "@prisma/client";
import { ActionForm } from "@/components/ActionForm";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { authorInclude, authorView } from "@/lib/community";
import { formatKst } from "@/lib/time";
import { CharacterName } from "./CharacterName";
import { addCommentAction, deleteCommentAction } from "@/app/(game)/community/actions";

export const commentInclude = { include: { author: authorInclude } } satisfies Prisma.CommentDefaultArgs;
type CommentRow = Prisma.CommentGetPayload<typeof commentInclude>;

/** 댓글 목록과 작성 양식 (타임라인·게시판·조직 게시판 공용) */
export function Comments({ postId, comments, viewerId, viewerIsAdmin, allowAnonymous, minLength, compact = false }: {
  postId: string; comments: CommentRow[]; viewerId: string; viewerIsAdmin: boolean; allowAnonymous: boolean; minLength: number; compact?: boolean;
}) {
  return (
    <div className={`flex flex-col gap-2 ${compact ? "" : "mt-2"}`}>
      {comments.map((c) => {
        const a = authorView(c.author, c.isAnonymous, viewerIsAdmin);
        return (
          <div key={c.id} className="flex gap-2 border-l-2 border-line pl-3 text-sm">
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 text-xs">
                <CharacterName a={a} />
                <span className="mono text-fg-mute">{formatKst(c.createdAt)}</span>
                {c.erosionApplied && <span className="tag tag-ok" title="RP 댓글로 인정되어 침식률이 감소함">RP</span>}
              </p>
              <p className="whitespace-pre-wrap leading-relaxed text-fg-dim">{c.body}</p>
            </div>
            {(c.authorId === viewerId || viewerIsAdmin) && (
              <form action={deleteCommentAction}><input type="hidden" name="commentId" value={c.id} /><ConfirmSubmit message="댓글을 삭제할까요?" className="btn btn-ghost btn-sm text-fg-mute">×</ConfirmSubmit></form>
            )}
          </div>
        );
      })}
      <ActionForm action={addCommentAction} submitLabel="댓글" submitClassName="btn btn-sm" className="flex flex-col gap-2">
        <input type="hidden" name="postId" value={postId} />
        <textarea name="body" className="textarea min-h-[3.5rem] text-sm" placeholder={`캐릭터로서 대화해 보세요. ${minLength}자 이상 남의 글에 단 댓글은 침식률 감소로 인정됩니다.`} maxLength={2000} required />
        {allowAnonymous && <label className="flex items-center gap-2 text-xs"><input type="checkbox" name="isAnonymous" className="accent-[var(--accent)]" /> 익명으로 (RP 인정 안 됨)</label>}
      </ActionForm>
    </div>
  );
}
