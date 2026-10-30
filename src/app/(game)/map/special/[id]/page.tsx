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
import { toggleReactionAction } from "@/app/(game)/community/actions";
import { withdrawSpecialAction } from "../actions";

const ST = { PENDING: { l: "심사 중", c: "tag-warn" }, APPROVED: { l: "승인", c: "tag-ok" }, REJECTED: { l: "반려", c: "tag-danger" } } as const;

export default async function SpecialReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, character } = await requireCharacterUser();
  const cfg = await getConfig();
  const a = await db.specialApplication.findUnique({ where: { id }, include: { character: authorInclude, realm: true, post: { include: { comments: { ...commentInclude, orderBy: { createdAt: "asc" } }, reactions: true } } } });
  if (!a) notFound();
  const isAdmin = user.role === "ADMIN";
  const mine = a.characterId === character.id;
  if (!a.isReportPublic && !mine && !isAdmin) notFound();
  const liked = a.post.reactions.some((r) => r.characterId === character.id);
  return (
    <article className="panel mx-auto max-w-3xl">
      <div className="panel-title">{a.isWinner && <span className="tag tag-accent mr-2">정식 공략 루트</span>}{a.title}<span className={`tag ${ST[a.status].c} ml-auto`}>{ST[a.status].l}</span></div>
      <div className="flex flex-col gap-4 p-5 text-sm">
        <div className="flex flex-wrap items-center gap-2"><CharacterName a={authorView(a.character, false, isAdmin)} size="md" /><span className="mono text-xs text-fg-mute">{formatKst(a.createdAt)}</span>{a.rewardPaid > 0 && <span className="tag tag-ok">보수 {a.rewardPaid}P</span>}{!a.isReportPublic && <span className="tag">비공개 (본인·운영자만)</span>}</div>
        {a.adminComment && <p className="border-l-2 border-warn pl-3 text-xs text-fg-dim">운영자: {a.adminComment}</p>}
        {a.realm && (a.realm.isPublished ? <Link href={`/map/${a.realm.id}`} className="btn btn-primary btn-sm self-start">{a.realm.applicantId ? "내 이계로 이동" : "이계로 이동 (모두 입장 가능)"}</Link> : mine && <p className="help">운영자가 이계를 만드는 중입니다. 완성되면 여기에 입장 버튼이 생깁니다.</p>)}
        <Section t="분위기" b={a.atmosphere} /><Section t="주인" b={a.master} /><Section t="이상현상" b={a.anomalies} /><Section t="기타" b={a.extra} />
        {a.isReportPublic && (
          <div className="flex items-center gap-3 text-xs"><form action={toggleReactionAction}><input type="hidden" name="postId" value={a.postId} /><button className={`btn btn-sm ${liked ? "border-accent text-accent" : ""}`} type="submit">◆ 공감 {a.post.reactions.length}</button></form></div>
        )}
        {mine && a.status === "PENDING" && <form action={withdrawSpecialAction}><input type="hidden" name="id" value={a.id} /><ConfirmSubmit message="신청을 철회할까요?">신청 철회</ConfirmSubmit></form>}
        {a.isReportPublic && (<><div className="divider-label">댓글</div><Comments postId={a.postId} comments={a.post.comments} viewerId={character.id} viewerIsAdmin={isAdmin} allowAnonymous={false} minLength={cfg["rp.minLength"]} /></>)}
        <Link href="/map/special" className="btn btn-sm self-start">← 특수형 이계</Link>
      </div>
    </article>
  );
}

function Section({ t, b }: { t: string; b: string }) { return b ? <div><p className="hud-label mb-1">{t}</p><p className="whitespace-pre-wrap leading-relaxed">{b}</p></div> : null; }
