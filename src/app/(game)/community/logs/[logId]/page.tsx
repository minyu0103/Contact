import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireCharacterUser } from "@/lib/auth";
import { getConfig } from "@/lib/game-config";
import { CharacterName } from "@/components/community/CharacterName";
import { Comments, commentInclude } from "@/components/community/Comments";
import { authorInclude, authorView } from "@/lib/community";
import { formatKst } from "@/lib/time";
import { toggleReactionAction } from "../../actions";

export default async function LogDetailPage({ params }: { params: Promise<{ logId: string }> }) {
  const { logId } = await params;
  const { user, character } = await requireCharacterUser();
  const cfg = await getConfig();
  const log = await db.explorationLog.findUnique({ where: { id: logId }, include: { character: authorInclude, realm: true, node: true, run: { select: { id: true } }, post: { include: { comments: { ...commentInclude, orderBy: { createdAt: "asc" } }, reactions: true } } } });
  if (!log) notFound();
  const isAdmin = user.role === "ADMIN";
  if (log.status !== "APPROVED" && log.characterId !== character.id && !isAdmin) notFound();
  const liked = log.post.reactions.some((r) => r.characterId === character.id);
  const isMemo = log.kind === "DIARY" && !!log.nodeId && log.post.reactions.length >= cfg["log.memoThreshold"];
  return (
    <article className="panel">
      <div className="panel-title">{log.title}<span className="code">{log.kind === "DIARY" ? "DIARY" : "CAMERA"}</span></div>
      <div className="flex flex-col gap-4 p-4">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <CharacterName a={authorView(log.character, false, isAdmin)} size="md" />
          <span className="text-xs text-fg-dim">{log.realm.name}{log.node ? ` · ${log.node.name}` : ""}</span>
          <span className="mono text-xs text-fg-mute">{formatKst(log.createdAt)}</span>
          {log.status === "PENDING" && <span className="tag tag-warn">심사 중</span>}
          {log.status === "REJECTED" && <span className="tag tag-danger">반려</span>}
          {log.status === "APPROVED" && log.rewardPaid > 0 && <span className="tag tag-ok">보수 {log.rewardPaid}P</span>}
          {isMemo && <span className="tag tag-accent">맵 메모</span>}
        </div>
        {log.adminComment && <p className="border-l-2 border-warn pl-3 text-xs text-fg-dim">운영자: {log.adminComment}</p>}
        {log.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={log.imageUrl} alt="" className="max-h-[32rem] w-auto max-w-full border border-line-2 object-contain" />
        )}
        <p className="whitespace-pre-wrap leading-relaxed">{log.body}</p>
        <div className="flex items-center gap-3 text-xs">
          <form action={toggleReactionAction}><input type="hidden" name="postId" value={log.postId} /><button className={`btn btn-sm ${liked ? "border-accent text-accent" : ""}`} type="submit">◆ 공감 {log.post.reactions.length}</button></form>
          {log.kind === "DIARY" && log.nodeId && <span className="help">공감 {cfg["log.memoThreshold"]}개 이상이면 {log.node?.name}에 메모로 남습니다.</span>}
          {log.characterId === character.id && <Link href={`/records/${log.run.id}`} className="btn btn-ghost btn-sm ml-auto">탐사기록</Link>}
        </div>
        <div className="divider-label">댓글</div>
        <Comments postId={log.postId} comments={log.post.comments} viewerId={character.id} viewerIsAdmin={isAdmin} allowAnonymous={false} minLength={cfg["rp.minLength"]} />
        <Link href="/community/logs" className="btn btn-sm self-start">← 로그 목록</Link>
      </div>
    </article>
  );
}
