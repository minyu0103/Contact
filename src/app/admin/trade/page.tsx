import Link from "next/link";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/PageHeader";
import { ActionForm } from "@/components/ActionForm";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { formatKst } from "@/lib/time";
import { settleAuctions } from "@/lib/trade";
import { cancelListingAction } from "@/app/(game)/community/trade/actions";
import { cancelAuctionAction, createAuctionAction } from "./actions";

const KIND = { SELL: "판매", BARTER: "교환", REQUEST: "의뢰" } as const;

export default async function AdminTradePage() {
  await settleAuctions();
  const [auctions, listings, items] = await Promise.all([
    db.auction.findMany({ orderBy: { createdAt: "desc" }, take: 50, include: { item: true, winner: true, _count: { select: { bids: true } } } }),
    db.tradeListing.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { author: true, counterparty: true, offerItem: true, askItem: true } }),
    db.item.findMany({ where: { isCrafted: false }, orderBy: [{ category: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
  ]);
  return (
    <div>
      <PageHeader title="거래 · 경매" description="희귀 감염물 위주로 가끔 경매를 엽니다. 마감이 지나면 조회 시점에 자동 낙찰됩니다. 거래 글은 취소(보관물 반환)만 할 수 있습니다." />
      <div className="grid gap-4 lg:grid-cols-[22rem_1fr]">
        <section className="panel self-start">
          <div className="panel-title">경매 열기</div>
          <div className="p-4">
            <ActionForm action={createAuctionAction} submitLabel="경매 시작">
              <div className="field"><label>제목</label><input name="title" className="input" maxLength={80} required /></div>
              <div className="field"><label>아이템</label><select name="itemId" className="select">{items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-2"><div className="field"><label>수량</label><input name="qty" type="number" min={1} className="input mono" defaultValue={1} /></div><div className="field"><label>시간 (마감까지)</label><input name="hours" type="number" min={1} className="input mono" defaultValue={24} /></div>
                <div className="field"><label>시작가 (P)</label><input name="startPrice" type="number" min={1} className="input mono" defaultValue={100} /></div><div className="field"><label>최소 증가 (P)</label><input name="minIncrement" type="number" min={1} className="input mono" defaultValue={10} /></div></div>
              <div className="field"><label>설명</label><textarea name="body" className="textarea" maxLength={2000} /></div>
            </ActionForm>
          </div>
        </section>
        <div className="flex flex-col gap-4">
          <section className="panel overflow-x-auto">
            <div className="panel-title">경매<span className="code">{auctions.length}</span></div>
            <table className="table"><thead><tr><th>제목</th><th>아이템</th><th>상태</th><th>입찰</th><th>마감</th><th></th></tr></thead><tbody>
              {auctions.map((a) => <tr key={a.id}><td><Link href={`/community/trade/auctions/${a.id}`} className="hover:text-accent">{a.title}</Link></td><td className="text-xs">{a.item.name} ×{a.qty}</td><td className="text-xs">{a.status}{a.winner && ` · ${a.winner.name} ${a.finalPrice}P`}</td><td className="mono">{a._count.bids}</td><td className="mono text-xs text-fg-mute">{formatKst(a.endsAt)}</td><td>{a.status === "OPEN" && <form action={cancelAuctionAction}><input type="hidden" name="id" value={a.id} /><ConfirmSubmit message="경매를 취소할까요? 최고 입찰금은 돌려줍니다.">취소</ConfirmSubmit></form>}</td></tr>)}
              {auctions.length === 0 && <tr><td colSpan={6} className="help text-center">경매가 없습니다.</td></tr>}
            </tbody></table>
          </section>
          <section className="panel overflow-x-auto">
            <div className="panel-title">거래 글<span className="code">{listings.length}</span></div>
            <table className="table"><thead><tr><th>종류</th><th>제목</th><th>작성자</th><th>내용</th><th>상태</th><th></th></tr></thead><tbody>
              {listings.map((l) => <tr key={l.id}><td className="text-xs">{KIND[l.kind]}</td><td><Link href={`/community/trade/${l.id}`} className="hover:text-accent">{l.title}</Link></td><td className="text-xs">{l.author.name}</td><td className="text-xs text-fg-dim">{l.kind === "REQUEST" ? `보수 ${l.askPoints}P` : `${l.offerItem?.name} ×${l.offerQty} → ${l.kind === "SELL" ? `${l.askPoints}P` : `${l.askItem?.name} ×${l.askQty}`}`}</td><td className="text-xs">{l.status}{l.counterparty && ` · ${l.counterparty.name}`}</td><td>{l.status === "OPEN" && <form action={cancelListingAction}><input type="hidden" name="id" value={l.id} /><ConfirmSubmit message="이 거래를 취소할까요? 보관물은 작성자에게 돌아갑니다.">취소</ConfirmSubmit></form>}</td></tr>)}
              {listings.length === 0 && <tr><td colSpan={6} className="help text-center">거래 글이 없습니다.</td></tr>}
            </tbody></table>
          </section>
        </div>
      </div>
    </div>
  );
}
