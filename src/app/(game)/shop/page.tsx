import { db } from "@/lib/db";
import { requireCharacterUser } from "@/lib/auth";
import { loadCharacter } from "@/lib/character";
import { getConfig } from "@/lib/game-config";
import { ActionForm } from "@/components/ActionForm";
import { describeItemEffect, ITEM_CATEGORY_OPTIONS, type ItemEffect } from "@/lib/content-types";
import { buyItemAction, sellItemAction } from "./actions";

export default async function ShopPage() {
  const { character: raw } = await requireCharacterUser();
  const cfg = await getConfig();
  const character = (await loadCharacter(raw.id, cfg)) ?? raw;
  const [items, inventory] = await Promise.all([
    db.item.findMany({ where: { shopEnabled: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    db.inventoryItem.findMany({ where: { characterId: character.id }, include: { item: true }, orderBy: { item: { sortOrder: "asc" } } }),
  ]);
  const sellable = inventory.filter((i) => i.item.sellPrice > 0);
  const catLabel = (v: string) => ITEM_CATEGORY_OPTIONS.find((o) => o.value === v)?.label ?? v;
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
      <section className="panel">
        <div className="panel-title">프로그램 상점<span className="code">보유 {character.points.toLocaleString()} P</span></div>
        <ul className="divide-y divide-line">
          {items.length === 0 && <li className="help p-4">판매 중인 물품이 없습니다.</li>}
          {items.map((it) => {
            const reasons: string[] = [];
            if (character.level < it.minLevel) reasons.push(`레벨 ${it.minLevel} 이상`);
            if (character.escapeCount < it.minEscapes) reasons.push(`탈출 성공 ${it.minEscapes}회 이상`);
            const locked = reasons.length > 0;
            const have = inventory.find((i) => i.itemId === it.id)?.qty ?? 0;
            return (
              <li key={it.id} className={`flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center ${locked ? "opacity-60" : ""}`}>
                {it.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.imageUrl} alt="" className="h-12 w-12 shrink-0 border border-line-2 object-cover" />
                ) : <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-line-2 bg-bg text-[0.6rem] text-fg-mute">{catLabel(it.category).slice(0, 2)}</div>}
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-semibold">{it.name}<span className="tag">{catLabel(it.category)}</span>{have > 0 && <span className="mono text-xs text-fg-dim">보유 {have}</span>}</p>
                  <p className="help">{it.description}</p>
                  <p className="mt-1 text-xs text-accent">{(it.effects as ItemEffect[]).map(describeItemEffect).join(" · ")}</p>
                  {locked && <p className="mt-1 text-xs text-warn">잠김: {reasons.join(", ")}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="mono text-warn">{it.price}P</span>
                  {!locked && (
                    <ActionForm action={buyItemAction} submitLabel="구매" submitClassName="btn btn-primary btn-sm" className="flex items-center gap-2">
                      <input type="hidden" name="itemId" value={it.id} />
                      <input name="qty" type="number" min={1} max={99} defaultValue={1} className="input mono w-16 py-1 text-sm" aria-label="수량" />
                    </ActionForm>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
      <section className="panel">
        <div className="panel-title">회수 판매<span className="code">SELL</span></div>
        <div className="p-4 text-sm">
          <p className="help mb-3">프로그램은 감염물과 일부 물품을 회수합니다. 회수가는 품목마다 다릅니다.</p>
          <ul className="flex flex-col gap-2">
            {sellable.length === 0 && <li className="help">회수 가능한 물품이 없습니다.</li>}
            {sellable.map((inv) => (
              <li key={inv.id} className="border border-line p-2">
                <ActionForm action={sellItemAction} submitLabel="회수" submitClassName="btn btn-sm" className="flex flex-wrap items-center gap-2">
                  <input type="hidden" name="itemId" value={inv.itemId} />
                  <span className="flex-1 font-semibold">{inv.item.name} <span className="mono text-xs text-fg-dim">×{inv.qty}</span></span>
                  <span className="mono text-xs text-warn">{inv.item.sellPrice}P/개</span>
                  <input name="qty" type="number" min={1} max={inv.qty} defaultValue={1} className="input mono w-14 py-1 text-xs" aria-label="수량" />
                </ActionForm>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
