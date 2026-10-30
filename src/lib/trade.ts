import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { getConfig } from "./game-config";

export class TradeError extends Error {}
type Tx = Prisma.TransactionClient;

export async function takeFromInventory(tx: Tx, characterId: string, itemId: string, qty: number) {
  const inv = await tx.inventoryItem.findUnique({ where: { characterId_itemId: { characterId, itemId } } });
  if (!inv || inv.qty < qty) throw new TradeError("보유 수량이 부족합니다.");
  if (inv.qty === qty) { await tx.inventoryItem.delete({ where: { id: inv.id } }); await tx.equippedItem.deleteMany({ where: { characterId, itemId } }); }
  else await tx.inventoryItem.update({ where: { id: inv.id }, data: { qty: inv.qty - qty } });
}

export async function giveToInventory(tx: Tx, characterId: string, itemId: string, qty: number) {
  const cfg = await getConfig();
  const inv = await tx.inventoryItem.findUnique({ where: { characterId_itemId: { characterId, itemId } } });
  if (inv) return tx.inventoryItem.update({ where: { id: inv.id }, data: { qty: inv.qty + qty } });
  const count = await tx.inventoryItem.count({ where: { characterId } });
  if (count >= cfg["char.inventorySlots"]) throw new TradeError("받는 쪽 보관함이 가득 찼습니다.");
  return tx.inventoryItem.create({ data: { characterId, itemId, qty } });
}

export async function takePoints(tx: Tx, characterId: string, amount: number) {
  const c = await tx.character.findUnique({ where: { id: characterId } });
  if (!c || c.points < amount) throw new TradeError(`P가 부족합니다. 필요 ${amount}P.`);
  await tx.character.update({ where: { id: characterId }, data: { points: { decrement: amount } } });
}

/** 마감 지난 경매를 정산한다 (조회 시점에 늦게 실행) */
export async function settleAuctions() {
  const due = await db.auction.findMany({ where: { status: "OPEN", endsAt: { lte: new Date() } }, include: { bids: { orderBy: [{ amount: "desc" }, { createdAt: "asc" }], take: 1 } } });
  for (const a of due) {
    await db.$transaction(async (tx) => {
      const top = a.bids[0];
      if (!top) { await tx.auction.update({ where: { id: a.id }, data: { status: "CLOSED" } }); return; }
      try { await giveToInventory(tx, top.characterId, a.itemId, a.qty); }
      catch { await tx.character.update({ where: { id: top.characterId }, data: { points: { increment: top.amount } } }); }
      await tx.auction.update({ where: { id: a.id }, data: { status: "CLOSED", winnerId: top.characterId, finalPrice: top.amount } });
    });
  }
}
