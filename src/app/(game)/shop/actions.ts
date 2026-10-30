"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireCharacterUser } from "@/lib/auth";
import { getConfig } from "@/lib/game-config";
import { audit } from "@/lib/audit";
import type { FormState } from "@/components/ActionForm";

export async function buyItemAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { character } = await requireCharacterUser();
  const itemId = String(formData.get("itemId") ?? "");
  const qty = Math.max(1, Math.min(99, Math.trunc(Number(formData.get("qty")) || 1)));
  const cfg = await getConfig();
  const result = await db.$transaction(async (tx) => {
    const [c, item, inv] = await Promise.all([
      tx.character.findUnique({ where: { id: character.id } }),
      tx.item.findUnique({ where: { id: itemId } }),
      tx.inventoryItem.findMany({ where: { characterId: character.id } }),
    ]);
    if (!c || !item || !item.shopEnabled) return { error: "판매하지 않는 품목입니다." };
    if (c.level < item.minLevel) return { error: `레벨 ${item.minLevel} 이상만 구매할 수 있습니다.` };
    if (c.escapeCount < item.minEscapes) return { error: `탈출 성공 ${item.minEscapes}회 이상만 구매할 수 있습니다.` };
    const cost = item.price * qty;
    if (c.points < cost) return { error: `P가 부족합니다. 필요 ${cost}P, 보유 ${c.points}P.` };
    const existing = inv.find((i) => i.itemId === itemId);
    if (!existing && inv.length >= cfg["char.inventorySlots"]) return { error: "보관함이 가득 찼습니다." };
    if ((existing?.qty ?? 0) + qty > item.stackLimit) return { error: `이 아이템은 ${item.stackLimit}개까지만 가질 수 있습니다.` };
    await tx.character.update({ where: { id: c.id }, data: { points: { decrement: cost } } });
    if (existing) await tx.inventoryItem.update({ where: { id: existing.id }, data: { qty: { increment: qty } } });
    else await tx.inventoryItem.create({ data: { characterId: c.id, itemId, qty } });
    return { success: `${item.name} ×${qty} 구매. −${cost}P` };
  });
  revalidatePath("/", "layout");
  return result;
}

export async function sellItemAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { user, character } = await requireCharacterUser();
  const itemId = String(formData.get("itemId") ?? "");
  const qty = Math.max(1, Math.trunc(Number(formData.get("qty")) || 1));
  const result = await db.$transaction(async (tx) => {
    const [item, inv] = await Promise.all([tx.item.findUnique({ where: { id: itemId } }), tx.inventoryItem.findUnique({ where: { characterId_itemId: { characterId: character.id, itemId } } })]);
    if (!item || item.sellPrice <= 0) return { error: "프로그램이 회수하지 않는 물품입니다." };
    if (!inv || inv.qty < qty) return { error: "보유 수량이 부족합니다." };
    const gain = item.sellPrice * qty;
    if (inv.qty === qty) { await tx.inventoryItem.delete({ where: { id: inv.id } }); await tx.equippedItem.deleteMany({ where: { characterId: character.id, itemId } }); } else await tx.inventoryItem.update({ where: { id: inv.id }, data: { qty: { decrement: qty } } });
    await tx.character.update({ where: { id: character.id }, data: { points: { increment: gain } } });
    await audit(user.id, "shop.sell", { type: "character", id: character.id }, { item: item.name, qty, gain });
    return { success: `${item.name} ×${qty} 회수. +${gain}P` };
  });
  revalidatePath("/", "layout");
  return result;
}
