import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireCharacterUser } from "@/lib/auth";
import { ActionForm } from "@/components/ActionForm";
import { describeItemEffect, type ItemEffect } from "@/lib/content-types";
import { formatKst } from "@/lib/time";
import { settleAuctions } from "@/lib/trade";
import { bidAction } from "../../actions";

export default async function AuctionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { character } = await requireCharacterUser();
  await settleAuctions();
  const a = await db.auction.findUnique({ where: { id }, include: { item: true, winner: true, bids: { orderBy: [{ amount: "desc" }, { createdAt: "asc" }], include: { character: true } } } });
  if (!a) notFound();
  const top = a.bids[0];
  const min = top ? top.amount + a.minIncrement : a.startPrice;
  const open = a.status === "OPEN" && a.endsAt > new Date();
  return (
    <article className="panel mx-auto max-w-2xl">
      <div className="panel-title"><span className="tag tag-warn mr-2">경매</span>{a.title}<span className="code">{a.status === "OPEN" ? (open ? "진행 중" : "정산 중") : a.status === "CLOSED" ? "마감" : "취소"}</span></div>
      <div className="flex flex-col gap-4 p-4 text-sm">
        <div className="border border-line p-3"><p className="font-semibold">{a.item.name} ×{a.qty}</p><p className="help">{a.item.description}</p><p className="text-xs text-accent">{(a.item.effects as ItemEffect[]).map(describeItemEffect).join(" · ")}</p></div>
        {a.body && <p className="whitespace-pre-wrap text-fg-dim">{a.body}</p>}
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1"><dt className="hud-label">시작가</dt><dd className="mono">{a.startPrice}P</dd><dt className="hud-label">최소 증가</dt><dd className="mono">{a.minIncrement}P</dd><dt className="hud-label">마감</dt><dd className="mono">{formatKst(a.endsAt)}</dd><dt className="hud-label">현재 최고</dt><dd className="mono text-warn">{top ? `${top.amount}P (${top.character.name})` : "입찰 없음"}</dd></dl>
        {a.status === "CLOSED" && <p className="success">{a.winner ? `${a.winner.name}이(가) ${a.finalPrice}P에 낙찰` : "입찰자가 없어 유찰"}</p>}
        {open && (
          <ActionForm action={bidAction} submitLabel="입찰" submitClassName="btn btn-primary btn-sm" className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="auctionId" value={a.id} />
            <div className="field"><label>입찰가 (최소 {min}P)</label><input name="amount" type="number" min={min} className="input mono" defaultValue={min} /></div>
            <p className="help">입찰하면 P가 먼저 빠지고, 더 높은 입찰이 들어오면 돌려받습니다. 보유 {character.points}P.</p>
          </ActionForm>
        )}
        <ul className="divide-y divide-line text-xs">{a.bids.slice(0, 10).map((b) => <li key={b.id} className="flex gap-3 py-1"><span className="mono">{b.amount}P</span><span>{b.character.name}</span><span className="mono ml-auto text-fg-mute">{formatKst(b.createdAt)}</span></li>)}</ul>
        <Link href="/community/trade" className="btn btn-sm self-start">← 거래</Link>
      </div>
    </article>
  );
}
