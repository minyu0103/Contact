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
import { acceptListingAction, cancelListingAction, deliverAction } from "../actions";

const KIND = { SELL: "판매", BARTER: "물물교환", REQUEST: "주문 제작 의뢰" } as const;
const ST = { OPEN: { l: "진행 중", c: "tag-ok" }, DONE: { l: "성사", c: "tag-accent" }, CANCELLED: { l: "취소", c: "" } } as const;

export default async function TradeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, character } = await requireCharacterUser();
  const cfg = await getConfig();
  const l = await db.tradeListing.findUnique({ where: { id }, include: { author: authorInclude, offerItem: true, askItem: true, counterparty: true, post: { include: { comments: { ...commentInclude, orderBy: { createdAt: "asc" } } } } } });
  if (!l) notFound();
  const isAdmin = user.role === "ADMIN";
  const mine = l.authorId === character.id;
  const inventory = l.kind === "REQUEST" && !mine ? await db.inventoryItem.findMany({ where: { characterId: character.id }, include: { item: true } }) : [];
  const delivered = l.deliveredItemId ? await db.item.findUnique({ where: { id: l.deliveredItemId } }) : null;
  return (
    <article className="panel">
      <div className="panel-title"><span className="tag mr-2">{KIND[l.kind]}</span>{l.title}<span className={`tag ${ST[l.status].c} ml-auto`}>{ST[l.status].l}</span></div>
      <div className="flex flex-col gap-4 p-4 text-sm">
        <div className="flex flex-wrap items-center gap-2"><CharacterName a={authorView(l.author, false, isAdmin)} size="md" /><span className="mono text-xs text-fg-mute">{formatKst(l.createdAt)}</span></div>
        <div className="grid gap-2 border border-line p-3 sm:grid-cols-2">
          <div><p className="hud-label">내놓는 것</p><p>{l.kind === "REQUEST" ? <span className="text-warn">보수 {l.askPoints}P (보관 중)</span> : `${l.offerItem?.name} ×${l.offerQty}`}</p></div>
          <div><p className="hud-label">원하는 것</p><p>{l.kind === "SELL" ? <span className="text-warn">{l.askPoints}P</span> : l.kind === "BARTER" ? `${l.askItem?.name} ×${l.askQty}` : "설명에 적힌 물건 (납품하면 보수 지급)"}</p></div>
        </div>
        {l.body && <p className="whitespace-pre-wrap leading-relaxed text-fg-dim">{l.body}</p>}
        {l.status === "DONE" && <p className="success">{l.counterparty?.name}와(과) 성사{delivered ? ` · 납품: ${delivered.name}` : ""} · {l.closedAt ? formatKst(l.closedAt) : ""}</p>}
        {l.status === "OPEN" && (mine || isAdmin) && (
          <form action={cancelListingAction}><input type="hidden" name="id" value={l.id} /><ConfirmSubmit message="거래를 취소할까요? 보관된 아이템·P는 돌려받습니다.">거래 취소</ConfirmSubmit></form>
        )}
        {l.status === "OPEN" && !mine && l.kind !== "REQUEST" && (
          <ActionForm action={acceptListingAction} submitLabel={l.kind === "SELL" ? `${l.askPoints}P에 구매 (성사)` : "교환 (성사)"} className="flex flex-col gap-2">
            <input type="hidden" name="id" value={l.id} />
            <p className="help">{l.kind === "SELL" ? "누르면 P가 빠지고 아이템이 보관함으로 들어옵니다." : `${l.askItem?.name} ×${l.askQty}을(를) 내주고 ${l.offerItem?.name} ×${l.offerQty}을(를) 받습니다.`}</p>
          </ActionForm>
        )}
        {l.status === "OPEN" && !mine && l.kind === "REQUEST" && (
          <ActionForm action={deliverAction} submitLabel="납품하고 보수 받기" className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="id" value={l.id} />
            <div className="field flex-1"><label>납품할 아이템</label><select name="itemId" className="select">{inventory.map((i) => <option key={i.itemId} value={i.itemId}>{i.item.name} (보유 {i.qty})</option>)}</select></div>
            <div className="field w-20"><label>수량</label><input name="qty" type="number" min={1} className="input mono" defaultValue={1} /></div>
          </ActionForm>
        )}
        <div className="divider-label">흥정 · 댓글</div>
        <Comments postId={l.postId} comments={l.post.comments} viewerId={character.id} viewerIsAdmin={isAdmin} allowAnonymous={false} minLength={cfg["rp.minLength"]} />
        <Link href="/community/trade" className="btn btn-sm self-start">← 거래</Link>
      </div>
    </article>
  );
}
