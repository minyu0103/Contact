import "server-only";
import { randomInt } from "crypto";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { getConfig } from "./game-config";
import { hpPenalty, proficiencyCheckTypeFor, proficiencyFromExp } from "./rules";
import { rollDice } from "./engine/dice";
import type { ItemEffect } from "./content-types";
import type { CheckResult, Modifier } from "./engine/types";

export class CraftError extends Error {}

async function takeItem(tx: Prisma.TransactionClient, characterId: string, itemId: string, qty = 1) {
  const inv = await tx.inventoryItem.findUnique({ where: { characterId_itemId: { characterId, itemId } } });
  if (!inv || inv.qty < qty) throw new CraftError("재료가 부족합니다.");
  if (inv.qty === qty) { await tx.inventoryItem.delete({ where: { id: inv.id } }); await tx.equippedItem.deleteMany({ where: { characterId, itemId } }); }
  else await tx.inventoryItem.update({ where: { id: inv.id }, data: { qty: inv.qty - qty } });
}

async function giveItem(tx: Prisma.TransactionClient, characterId: string, itemId: string, qty: number, slots: number) {
  const inv = await tx.inventoryItem.findUnique({ where: { characterId_itemId: { characterId, itemId } } });
  if (inv) return tx.inventoryItem.update({ where: { id: inv.id }, data: { qty: inv.qty + qty } });
  const count = await tx.inventoryItem.count({ where: { characterId } });
  if (count >= slots) throw new CraftError("보관함이 가득 찼습니다.");
  return tx.inventoryItem.create({ data: { characterId, itemId, qty } });
}

/** 특성 태그에 해당하는 인자 아이템을 찾거나 만든다 */
async function factorItemFor(tx: Prisma.TransactionClient, tag: string) {
  const existing = await tx.item.findFirst({ where: { category: "FACTOR", traitTag: tag } });
  if (existing) return existing;
  return tx.item.create({ data: { name: `인자: ${tag}`, description: `감염물에서 추출한 현실조작인자. 특성 "${tag}"을(를) 띤다. 기본 아이템과 조합해 장비를 만들 수 있다.`, category: "FACTOR", traitTag: tag, usableIn: "OUTSIDE", stackLimit: 99, sellPrice: 0, sortOrder: 900 } });
}

/** 감염물에서 인자 추출. 성공하면 인자 획득, 실패하면 감염물만 사라진다. */
export async function extractFactor(characterId: string, itemId: string): Promise<{ success: boolean; chance: number; factorName?: string }> {
  const cfg = await getConfig();
  return db.$transaction(async (tx) => {
    const [c, item, tools] = await Promise.all([
      tx.character.findUnique({ where: { id: characterId } }),
      tx.item.findUnique({ where: { id: itemId } }),
      tx.inventoryItem.findMany({ where: { characterId }, include: { item: true } }),
    ]);
    if (!c || !item) throw new CraftError("대상을 찾을 수 없습니다.");
    if (!tools.some((i) => (i.item.effects as ItemEffect[]).some((e) => e.type === "extractor"))) throw new CraftError("인자 추출 도구가 필요합니다. 상점에서 구매 조건을 확인하세요.");
    if (item.category !== "INFECTED") throw new CraftError("감염물만 추출할 수 있습니다.");
    if (!item.traitTag) throw new CraftError("이 감염물에는 추출할 수 있는 특성이 없습니다.");
    await takeItem(tx, characterId, itemId, 1);
    const chance = Math.min(100, cfg["craft.extractChance"] + (c.category === "PRODUCTION" ? cfg["craft.productionExtractBonus"] : 0));
    const success = randomInt(0, 100) < chance;
    if (!success) return { success: false, chance };
    const factor = await factorItemFor(tx, item.traitTag);
    await giveItem(tx, characterId, factor.id, 1, cfg["char.inventorySlots"]);
    return { success: true, chance, factorName: factor.name };
  }, { timeout: 15000 });
}

/** 제작 판정 (엔진의 보정 규칙과 같은 방식, 런 밖) */
function craftCheck(c: { category: "COMBAT" | "SEARCH" | "PRODUCTION" | "SPECIAL"; proficiencyCheckType: "COMBAT" | "SEARCH" | "CRAFT" | "GENERAL" | null; proficiency: number; hp: number; maxHp: number; abilityStatus: string }, effects: { type: string; checkType: string | null; value: number }[], equipMods: { type: string; checkType: string; value: number; label: string }[], target: number, cfg: Awaited<ReturnType<typeof getConfig>>): CheckResult {
  const own = proficiencyCheckTypeFor(c.category, c.proficiencyCheckType);
  const modifiers: Modifier[] = [];
  if (own === "CRAFT") modifiers.push({ label: `숙련도 ${c.proficiency}`, value: c.proficiency - cfg["check.proficiencyBonusOffset"] });
  if (c.abilityStatus === "ACTIVE") for (const e of effects) if (e.type === "CHECK_BONUS" && (!e.checkType || e.checkType === "CRAFT") && e.value) modifiers.push({ label: "능력 효과", value: e.value });
  for (const m of equipMods) if (m.type === "run_check_bonus" && (m.checkType === "ALL" || m.checkType === "CRAFT" || (m.checkType === "OWN" && own === "CRAFT"))) modifiers.push({ label: m.label, value: m.value });
  const pen = hpPenalty(c.hp, c.maxHp, cfg); if (pen) modifiers.push({ label: "체력 저하", value: pen });
  let extra = 0;
  if (c.abilityStatus === "ACTIVE") for (const e of effects) if (e.type === "EXTRA_DICE" && (!e.checkType || e.checkType === "CRAFT")) extra += e.value;
  for (const m of equipMods) if (m.type === "run_extra_dice" && (m.checkType === "ALL" || m.checkType === "CRAFT" || (m.checkType === "OWN" && own === "CRAFT"))) extra += m.value;
  const count = cfg["check.diceCount"];
  const dice = rollDice(count + extra, cfg["check.diceSides"]);
  const kept = [...dice].sort((a, b) => b - a).slice(0, count);
  const total = kept.reduce((s, d) => s + d, 0) + modifiers.reduce((s, m) => s + m.value, 0);
  return { checkType: "CRAFT", target, dice, kept, modifiers, total, success: total >= target, auto: false };
}

/** 레시피 조합: 기본 아이템 + 인자(1개, 생산형은 여러 개) → 새 장비. 제작 판정 실패 시 인자만 잃는다. */
export async function craftItem(characterId: string, recipeId: string, factorItemIds: string[]): Promise<{ check: CheckResult; resultName?: string; count?: number }> {
  const cfg = await getConfig();
  return db.$transaction(async (tx) => {
    const [c, recipe] = await Promise.all([
      tx.character.findUnique({ where: { id: characterId }, include: { effects: true, equipment: { include: { item: true } } } }),
      tx.recipe.findUnique({ where: { id: recipeId }, include: { baseItem: true, resultItem: true } }),
    ]);
    if (!c || !recipe) throw new CraftError("레시피를 찾을 수 없습니다.");
    const uniq = [...new Set(factorItemIds)];
    if (uniq.length === 0) throw new CraftError("인자를 하나 이상 골라야 합니다.");
    const maxFactors = c.category === "PRODUCTION" ? cfg["craft.productionMaxFactors"] : 1;
    if (uniq.length > maxFactors) throw new CraftError(c.category === "PRODUCTION" ? `인자는 ${maxFactors}개까지 섞을 수 있습니다.` : "인자 두 개 이상 혼합은 생산형만 할 수 있습니다.");
    const factors = await tx.item.findMany({ where: { id: { in: uniq }, category: "FACTOR" } });
    if (factors.length !== uniq.length) throw new CraftError("인자가 아닌 아이템이 섞여 있습니다.");
    const traits = await tx.factorTrait.findMany({ where: { tag: { in: factors.map((f) => f.traitTag) } } });
    // 재료 소모 (인자는 판정과 관계없이 소모, 기본 아이템은 성공 시에만)
    for (const f of factors) await takeItem(tx, characterId, f.id, 1);
    const equipMods = c.equipment.flatMap((eq) => (eq.item.effects as ItemEffect[]).flatMap((e) => e.type === "run_check_bonus" || e.type === "run_extra_dice" ? [{ type: e.type, checkType: e.checkType, value: e.value, label: eq.item.name }] : []));
    const check = craftCheck(c, c.effects, equipMods, recipe.checkTarget, cfg);
    if (!check.success) return { check };
    await takeItem(tx, characterId, recipe.baseItemId, 1);
    // 결과 장비: 레시피 결과 아이템의 효과 + 특성 보너스
    const bonus = traits.flatMap((t) => (Array.isArray(t.bonusEffects) ? (t.bonusEffects as ItemEffect[]) : []));
    const traitNames = factors.map((f) => f.traitTag).join(" · ");
    const name = `${recipe.resultItem.name} (${traitNames})`;
    const existing = await tx.item.findFirst({ where: { isCrafted: true, name, crafterId: null } });
    const crafted = existing ?? await tx.item.create({ data: {
      name, description: `${recipe.resultItem.description}\n특성: ${traitNames}${traits.length ? " — " + traits.map((t) => t.description).filter(Boolean).join(" / ") : ""}`,
      category: "EQUIPMENT", effects: [...(recipe.resultItem.effects as ItemEffect[]), ...bonus] as unknown as Prisma.InputJsonValue, usableIn: "OUTSIDE", stackLimit: 99, sellPrice: recipe.resultItem.sellPrice, isCrafted: true, sortOrder: 800, imageUrl: recipe.resultItem.imageUrl, traitTag: traitNames,
    } });
    const count = c.abilityStatus === "ACTIVE" && c.effects.some((e) => e.type === "CRAFT_DOUBLE") ? 2 : 1;
    await giveItem(tx, characterId, crafted.id, count, cfg["char.inventorySlots"]);
    if (proficiencyCheckTypeFor(c.category, c.proficiencyCheckType) === "CRAFT") {
      const exp = c.proficiencyExp + 1;
      await tx.character.update({ where: { id: characterId }, data: { proficiencyExp: exp, proficiency: Math.max(c.proficiency, proficiencyFromExp(exp, cfg)) } });
    }
    return { check, resultName: crafted.name, count };
  }, { timeout: 15000 });
}

export async function equipItem(characterId: string, itemId: string, slot: number) {
  const cfg = await getConfig();
  if (slot < 1 || slot > cfg["craft.equipSlots"]) throw new CraftError("잘못된 슬롯입니다.");
  const [inv, item] = await Promise.all([db.inventoryItem.findUnique({ where: { characterId_itemId: { characterId, itemId } } }), db.item.findUnique({ where: { id: itemId } })]);
  if (!inv || !item || item.category !== "EQUIPMENT") throw new CraftError("착용할 수 있는 장비가 아닙니다.");
  const already = await db.equippedItem.findMany({ where: { characterId, itemId } });
  if (already.length >= inv.qty) throw new CraftError("같은 장비를 더 착용할 수 없습니다.");
  await db.equippedItem.upsert({ where: { characterId_slot: { characterId, slot } }, update: { itemId }, create: { characterId, slot, itemId } });
}

export async function unequipSlot(characterId: string, slot: number) {
  await db.equippedItem.deleteMany({ where: { characterId, slot } });
}
