"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireCharacterUser } from "@/lib/auth";
import { getConfig } from "@/lib/game-config";
import { TradeError, giveToInventory, takeFromInventory, takePoints } from "@/lib/trade";
import type { FormState } from "@/components/ActionForm";

const wrap = async (fn: () => Promise<FormState>): Promise<FormState> => { try { return await fn(); } catch (e) { if (e instanceof TradeError) return { error: e.message }; throw e; } };

export async function createListingAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { character } = await requireCharacterUser();
  const cfg = await getConfig();
  const kind = String(formData.get("kind") ?? "");
  const title = String(formData.get("title") ?? "").trim().slice(0, 80);
  const body = String(formData.get("body") ?? "").trim().slice(0, 3000);
  const offerItemId = String(formData.get("offerItemId") ?? "") || null;
  const offerQty = Math.max(1, Math.trunc(Number(formData.get("offerQty")) || 1));
  const askPoints = Math.max(0, Math.trunc(Number(formData.get("askPoints")) || 0));
  const askItemId = String(formData.get("askItemId") ?? "") || null;
  const askQty = Math.max(1, Math.trunc(Number(formData.get("askQty")) || 1));
  if (!title) return { error: "제목을 입력하세요." };
  if (kind !== "SELL" && kind !== "BARTER" && kind !== "REQUEST") return { error: "거래 종류를 고르세요." };
  if ((kind === "SELL" || kind === "BARTER") && !offerItemId) return { error: "내놓을 아이템을 고르세요." };
  if (kind === "SELL" && askPoints <= 0) return { error: "가격(P)을 입력하세요." };
  if (kind === "BARTER" && !askItemId) return { error: "받고 싶은 아이템을 고르세요." };
  if (kind === "REQUEST" && askPoints <= 0) return { error: "제작 보수(P)를 입력하세요." };
  if ((await db.tradeListing.count({ where: { authorId: character.id, status: "OPEN" } })) >= cfg["trade.maxOpenListings"]) return { error: `거래 글은 동시에 ${cfg["trade.maxOpenListings"]}개까지 올릴 수 있습니다.` };
  if (await db.run.findFirst({ where: { characterId: character.id, status: "ACTIVE", isTest: false } })) return { error: "탐사 중에는 거래 글을 올릴 수 없습니다." };
  return wrap(async () => {
    const id = await db.$transaction(async (tx) => {
      if (kind === "REQUEST") await takePoints(tx, character.id, askPoints);
      else await takeFromInventory(tx, character.id, offerItemId!, offerQty);
      const post = await tx.post.create({ data: { kind: "TRADE", authorId: character.id, title, body: "" } });
      const l = await tx.tradeListing.create({ data: { kind, authorId: character.id, title, body, offerItemId: kind === "REQUEST" ? null : offerItemId, offerQty, askPoints: kind === "BARTER" ? 0 : askPoints, askItemId: kind === "BARTER" ? askItemId : null, askQty, postId: post.id } });
      return l.id;
    });
    revalidatePath("/", "layout");
    redirect(`/community/trade/${id}`);
  });
}

export async function cancelListingAction(formData: FormData) {
  const { user, character } = await requireCharacterUser();
  const id = String(formData.get("id") ?? "");
  const l = await db.tradeListing.findUnique({ where: { id } });
  if (!l || l.status !== "OPEN" || (l.authorId !== character.id && user.role !== "ADMIN")) return;
  await db.$transaction(async (tx) => {
    if (l.kind === "REQUEST") await tx.character.update({ where: { id: l.authorId }, data: { points: { increment: l.askPoints } } });
    else if (l.offerItemId) await giveToInventory(tx, l.authorId, l.offerItemId, l.offerQty);
    await tx.tradeListing.update({ where: { id }, data: { status: "CANCELLED", closedAt: new Date() } });
  }).catch(() => {});
  revalidatePath("/", "layout");
}

/** SELL: 구매 / BARTER: 교환 */
export async function acceptListingAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { character } = await requireCharacterUser();
  const id = String(formData.get("id") ?? "");
  return wrap(async () => {
    await db.$transaction(async (tx) => {
      const l = await tx.tradeListing.findUnique({ where: { id } });
      if (!l || l.status !== "OPEN") throw new TradeError("이미 끝난 거래입니다.");
      if (l.authorId === character.id) throw new TradeError("자기 거래는 성사시킬 수 없습니다.");
      if (l.kind === "REQUEST") throw new TradeError("의뢰는 납품으로 응답하세요.");
      if (l.kind === "SELL") { await takePoints(tx, character.id, l.askPoints); await tx.character.update({ where: { id: l.authorId }, data: { points: { increment: l.askPoints } } }); }
      else { await takeFromInventory(tx, character.id, l.askItemId!, l.askQty); await giveToInventory(tx, l.authorId, l.askItemId!, l.askQty); }
      await giveToInventory(tx, character.id, l.offerItemId!, l.offerQty);
      await tx.tradeListing.update({ where: { id }, data: { status: "DONE", counterpartyId: character.id, closedAt: new Date() } });
    });
    revalidatePath("/", "layout");
    return { success: "거래가 성사되었습니다." };
  });
}

/** REQUEST: 납품 */
export async function deliverAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { character } = await requireCharacterUser();
  const id = String(formData.get("id") ?? "");
  const itemId = String(formData.get("itemId") ?? "");
  const qty = Math.max(1, Math.trunc(Number(formData.get("qty")) || 1));
  return wrap(async () => {
    await db.$transaction(async (tx) => {
      const l = await tx.tradeListing.findUnique({ where: { id } });
      if (!l || l.status !== "OPEN" || l.kind !== "REQUEST") throw new TradeError("납품할 수 없는 의뢰입니다.");
      if (l.authorId === character.id) throw new TradeError("자기 의뢰에는 납품할 수 없습니다.");
      await takeFromInventory(tx, character.id, itemId, qty);
      await giveToInventory(tx, l.authorId, itemId, qty);
      await tx.character.update({ where: { id: character.id }, data: { points: { increment: l.askPoints } } });
      await tx.tradeListing.update({ where: { id }, data: { status: "DONE", counterpartyId: character.id, deliveredItemId: itemId, closedAt: new Date() } });
    });
    revalidatePath("/", "layout");
    return { success: "납품했습니다. 보수를 받았습니다." };
  });
}

export async function bidAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { character } = await requireCharacterUser();
  const id = String(formData.get("auctionId") ?? "");
  const amount = Math.trunc(Number(formData.get("amount")) || 0);
  return wrap(async () => {
    await db.$transaction(async (tx) => {
      const a = await tx.auction.findUnique({ where: { id }, include: { bids: { orderBy: [{ amount: "desc" }, { createdAt: "asc" }], take: 1 } } });
      if (!a || a.status !== "OPEN" || a.endsAt <= new Date()) throw new TradeError("마감된 경매입니다.");
      const top = a.bids[0];
      const min = top ? top.amount + a.minIncrement : a.startPrice;
      if (amount < min) throw new TradeError(`최소 입찰가는 ${min}P입니다.`);
      if (top && top.characterId === character.id) throw new TradeError("이미 최고 입찰자입니다.");
      await takePoints(tx, character.id, amount);
      if (top) await tx.character.update({ where: { id: top.characterId }, data: { points: { increment: top.amount } } });
      await tx.bid.create({ data: { auctionId: id, characterId: character.id, amount } });
    });
    revalidatePath("/", "layout");
    return { success: `${amount}P로 입찰했습니다. 더 높은 입찰이 들어오면 돌려받습니다.` };
  });
}
