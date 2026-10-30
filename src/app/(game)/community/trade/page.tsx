import Link from "next/link";
import { db } from "@/lib/db";
import { requireCharacterUser } from "@/lib/auth";
import { ActionForm } from "@/components/ActionForm";
import { formatKst } from "@/lib/time";
import { settleAuctions } from "@/lib/trade";
import { createListingAction } from "./actions";
import { ListingForm } from "./ListingForm";

const KIND = { SELL: "판매", BARTER: "교환", REQUEST: "제작 의뢰" } as const;

export default async function TradePage() {
  const { character } = await requireCharacterUser();
  await settleAuctions();
  const [listings, inventory, items, auctions] = await Promise.all([
    db.tradeListing.findMany({ where: { status: "OPEN" }, orderBy: { createdAt: "desc" }, include: { author: true, offerItem: true, askItem: true, post: { include: { _count: { select: { comments: true } } } } } }),
    db.inventoryItem.findMany({ where: { characterId: character.id }, include: { item: true } }),
    db.item.findMany({ where: { isCrafted: false, category: { not: "FACTOR" } }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.auction.findMany({ where: { status: "OPEN" }, orderBy: { endsAt: "asc" }, include: { item: true, bids: { orderBy: { amount: "desc" }, take: 1 } } }),
  ]);
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
      <div className="flex flex-col gap-4">
        {auctions.length > 0 && (
          <section className="panel">
            <div className="panel-title">경매<span className="code">{auctions.length}</span></div>
            <ul className="divide-y divide-line text-sm">
              {auctions.map((a) => <li key={a.id} className="px-4 py-2.5"><Link href={`/community/trade/auctions/${a.id}`} className="flex flex-wrap items-center gap-2 hover:text-accent"><span className="tag tag-warn">경매</span><b>{a.title}</b><span className="text-xs text-fg-dim">{a.item.name} ×{a.qty}</span><span className="mono ml-auto text-xs">현재 {a.bids[0]?.amount ?? a.startPrice}P · 마감 {formatKst(a.endsAt)}</span></Link></li>)}
            </ul>
          </section>
        )}
        <section className="panel">
          <div className="panel-title">거래 게시판<span className="code">{listings.length}</span></div>
          <ul className="divide-y divide-line text-sm">
            {listings.length === 0 && <li className="help p-4">열린 거래가 없습니다.</li>}
            {listings.map((l) => (
              <li key={l.id} className="px-4 py-2.5">
                <Link href={`/community/trade/${l.id}`} className="flex flex-wrap items-center gap-2 hover:text-accent">
                  <span className="tag">{KIND[l.kind]}</span><b>{l.title}</b>
                  <span className="text-xs text-fg-dim">{l.kind === "SELL" ? `${l.offerItem?.name} ×${l.offerQty} → ${l.askPoints}P` : l.kind === "BARTER" ? `${l.offerItem?.name} ×${l.offerQty} ↔ ${l.askItem?.name} ×${l.askQty}` : `보수 ${l.askPoints}P`}</span>
                  <span className="mono ml-auto text-xs text-fg-mute">{l.author.name} · 댓글 {l.post._count.comments} · {formatKst(l.createdAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <section className="panel self-start">
        <div className="panel-title">거래 올리기</div>
        <div className="p-4">
          <ActionForm action={createListingAction} submitLabel="올리기">
            <ListingForm inventory={inventory.map((i) => ({ itemId: i.itemId, name: i.item.name, qty: i.qty }))} items={items} />
          </ActionForm>
          <p className="help mt-3">판매·교환 글을 올리면 내놓은 아이템이 보관(에스크로)되고, 의뢰 글은 보수 P가 보관됩니다. 취소하면 돌려받습니다. 댓글로 흥정한 뒤 상대가 “성사”를 누르면 시스템이 맞교환합니다.</p>
        </div>
      </section>
    </div>
  );
}
