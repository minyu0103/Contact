"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import type { FormState } from "@/components/ActionForm";

export async function createAuctionAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const title = String(formData.get("title") ?? "").trim().slice(0, 80);
  const body = String(formData.get("body") ?? "").trim().slice(0, 2000);
  const itemId = String(formData.get("itemId") ?? "");
  const qty = Math.max(1, Math.trunc(Number(formData.get("qty")) || 1));
  const startPrice = Math.max(1, Math.trunc(Number(formData.get("startPrice")) || 100));
  const minIncrement = Math.max(1, Math.trunc(Number(formData.get("minIncrement")) || 10));
  const hours = Math.max(1, Number(formData.get("hours")) || 24);
  if (!title || !itemId) return { error: "제목과 아이템을 입력하세요." };
  const a = await db.auction.create({ data: { title, body, itemId, qty, startPrice, minIncrement, endsAt: new Date(Date.now() + hours * 3600 * 1000), createdById: admin.id } });
  await audit(admin.id, "auction.create", { type: "auction", id: a.id }, { title, itemId, qty, startPrice });
  revalidatePath("/", "layout");
  return { success: "경매를 열었습니다." };
}

export async function cancelAuctionAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const a = await db.auction.findUnique({ where: { id }, include: { bids: { orderBy: [{ amount: "desc" }, { createdAt: "asc" }], take: 1 } } });
  if (!a || a.status !== "OPEN") return;
  await db.$transaction(async (tx) => {
    if (a.bids[0]) await tx.character.update({ where: { id: a.bids[0].characterId }, data: { points: { increment: a.bids[0].amount } } });
    await tx.auction.update({ where: { id }, data: { status: "CANCELLED" } });
  });
  await audit(admin.id, "auction.cancel", { type: "auction", id }, { title: a.title });
  revalidatePath("/", "layout");
}
