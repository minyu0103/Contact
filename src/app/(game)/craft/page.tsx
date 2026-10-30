import Link from "next/link";
import { db } from "@/lib/db";
import { requireCharacterUser } from "@/lib/auth";
import { getConfig } from "@/lib/game-config";
import { ActionForm } from "@/components/ActionForm";
import { describeItemEffect, type ItemEffect } from "@/lib/content-types";
import { CATEGORY_LABEL } from "@/lib/rules";
import { craftAction, equipAction, extractAction, unequipAction } from "./actions";

export default async function CraftPage() {
  const { character } = await requireCharacterUser();
  const cfg = await getConfig();
  const [inventory, equipment, recipes, traits, activeRun] = await Promise.all([
    db.inventoryItem.findMany({ where: { characterId: character.id }, include: { item: true }, orderBy: { item: { sortOrder: "asc" } } }),
    db.equippedItem.findMany({ where: { characterId: character.id }, include: { item: true } }),
    db.recipe.findMany({ orderBy: { sortOrder: "asc" }, include: { baseItem: true, resultItem: true } }),
    db.factorTrait.findMany({ orderBy: { tag: "asc" } }),
    db.run.findFirst({ where: { characterId: character.id, status: "ACTIVE", isTest: false } }),
  ]);
  const hasExtractor = inventory.some((i) => (i.item.effects as ItemEffect[]).some((e) => e.type === "extractor"));
  const infected = inventory.filter((i) => i.item.category === "INFECTED" && i.item.traitTag);
  const factors = inventory.filter((i) => i.item.category === "FACTOR");
  const gear = inventory.filter((i) => i.item.category === "EQUIPMENT");
  const maxFactors = character.category === "PRODUCTION" ? cfg["craft.productionMaxFactors"] : 1;
  const chance = Math.min(100, cfg["craft.extractChance"] + (character.category === "PRODUCTION" ? cfg["craft.productionExtractBonus"] : 0));
  const slots = Array.from({ length: cfg["craft.equipSlots"] }, (_, i) => i + 1);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {activeRun && <p className="border border-warn/40 bg-warn/8 px-4 py-2 text-sm text-warn lg:col-span-2">탐사 중에는 생산과 장비 교체를 할 수 없습니다.</p>}
      <section className="panel">
        <div className="panel-title">장비<span className="code">{equipment.length} / {cfg["craft.equipSlots"]} 슬롯</span></div>
        <div className="flex flex-col gap-3 p-4 text-sm">
          {slots.map((slot) => {
            const eq = equipment.find((e) => e.slot === slot);
            return (
              <div key={slot} className="flex flex-wrap items-center gap-2 border border-line p-2">
                <span className="hud-label w-12">슬롯 {slot}</span>
                {eq ? (<><span className="font-semibold">{eq.item.name}</span><span className="text-xs text-accent">{(eq.item.effects as ItemEffect[]).map(describeItemEffect).join(" · ")}</span>
                  <form action={unequipAction} className="ml-auto"><input type="hidden" name="slot" value={slot} /><button className="btn btn-sm" type="submit" disabled={!!activeRun}>해제</button></form></>) : <span className="help">비어 있음</span>}
              </div>
            );
          })}
          <div className="divider-label">보유 장비</div>
          {gear.length === 0 && <p className="help">장비가 없습니다. 아래에서 조합하거나 이계에서 구하세요.</p>}
          {gear.map((g) => (
            <ActionForm key={g.id} action={equipAction} submitLabel="착용" submitClassName="btn btn-sm" className="flex flex-wrap items-center gap-2 border border-line p-2">
              <input type="hidden" name="itemId" value={g.itemId} />
              <span className="font-semibold">{g.item.name} <span className="mono text-xs text-fg-dim">×{g.qty}</span></span>
              <span className="text-xs text-accent">{(g.item.effects as ItemEffect[]).map(describeItemEffect).join(" · ")}</span>
              <select name="slot" className="select ml-auto w-auto py-1 text-xs">{slots.map((s) => <option key={s} value={s}>슬롯 {s}</option>)}</select>
            </ActionForm>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-title">인자 추출<span className="code">성공률 {chance}%</span></div>
        <div className="flex flex-col gap-3 p-4 text-sm">
          <p className="help">{CATEGORY_LABEL[character.category]} · 감염물에서 현실조작인자를 뽑아냅니다. 추출하면 감염물은 사라지고, 실패하면 인자도 얻지 못합니다.{character.category === "PRODUCTION" && ` 생산형 보너스 +${cfg["craft.productionExtractBonus"]}%p.`}</p>
          {!hasExtractor && <p className="error">인자 추출 도구가 없습니다. 상점에서 구매 조건(탈출 성공 횟수)을 확인하세요.</p>}
          {infected.length === 0 ? <p className="help">특성이 있는 감염물이 없습니다.</p> : infected.map((i) => (
            <ActionForm key={i.id} action={extractAction} submitLabel="추출" submitClassName="btn btn-primary btn-sm" className="flex flex-wrap items-center gap-2 border border-line p-2">
              <input type="hidden" name="itemId" value={i.itemId} />
              <span className="font-semibold">{i.item.name} <span className="mono text-xs text-fg-dim">×{i.qty}</span></span><span className="tag tag-accent">{i.item.traitTag}</span>
            </ActionForm>
          ))}
          <div className="divider-label">보유 인자</div>
          {factors.length === 0 ? <p className="help">인자가 없습니다.</p> : <ul className="flex flex-wrap gap-1.5">{factors.map((f) => <li key={f.id} className="tag tag-accent">{f.item.traitTag} ×{f.qty}</li>)}</ul>}
          {traits.length > 0 && <p className="help">특성 보너스: {traits.map((t) => `${t.tag} → ${(t.bonusEffects as ItemEffect[]).map(describeItemEffect).join(", ") || "없음"}`).join(" / ")}</p>}
        </div>
      </section>

      <section className="panel lg:col-span-2">
        <div className="panel-title">조합<span className="code">인자 최대 {maxFactors}개</span></div>
        <div className="flex flex-col gap-3 p-4 text-sm">
          <p className="help">기본 아이템과 인자를 조합하면 그 특성을 지닌 장비가 만들어집니다. 제작 판정(2d6 + 보정 ≥ 목표치)에 실패하면 인자만 잃습니다.{character.category === "PRODUCTION" ? " 생산형은 인자를 여러 개 섞어 보너스를 겹칠 수 있습니다." : " 인자 두 개 이상 혼합은 생산형만 가능합니다."}</p>
          {recipes.length === 0 && <p className="help">등록된 레시피가 없습니다.</p>}
          {recipes.map((r) => {
            const haveBase = inventory.find((i) => i.itemId === r.baseItemId);
            return (
              <ActionForm key={r.id} action={craftAction} submitLabel="조합" submitClassName="btn btn-primary btn-sm" className="flex flex-col gap-2 border border-line p-3">
                <input type="hidden" name="recipeId" value={r.id} />
                <p className="font-semibold">{r.name} <span className="mono text-xs text-fg-dim">목표치 {r.checkTarget}</span></p>
                <p className="text-xs text-fg-dim">{r.baseItem.name} {haveBase ? <span className="text-ok">(보유 {haveBase.qty})</span> : <span className="text-danger">(없음)</span>} + 인자 → <b>{r.resultItem.name}</b>: {(r.resultItem.effects as ItemEffect[]).map(describeItemEffect).join(" · ") || "효과 없음"}</p>
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: maxFactors }, (_, i) => (
                    <select key={i} name="factorIds" className="select w-auto text-xs" defaultValue="">
                      <option value="">{i === 0 ? "인자 선택" : "(추가 인자 없음)"}</option>
                      {factors.map((f) => <option key={f.id} value={f.itemId}>{f.item.traitTag} ×{f.qty}</option>)}
                    </select>
                  ))}
                </div>
              </ActionForm>
            );
          })}
        </div>
      </section>
      <Link href="/character" className="btn btn-ghost btn-sm self-start">← 유저</Link>
    </div>
  );
}
