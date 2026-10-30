import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/PageHeader";
import { ActionForm } from "@/components/ActionForm";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { ItemEffectsEditor } from "@/components/admin/ItemEffectsEditor";
import { describeItemEffect, type ItemEffect } from "@/lib/content-types";
import { CHECK_TARGET_HELP } from "@/lib/content-types";
import { deleteRecipeAction, deleteTraitAction, saveRecipeAction, saveTraitAction } from "./actions";

export default async function AdminCraftPage() {
  const [traits, recipes, items, infectedTags] = await Promise.all([
    db.factorTrait.findMany({ orderBy: { tag: "asc" } }),
    db.recipe.findMany({ orderBy: { sortOrder: "asc" }, include: { baseItem: true, resultItem: true } }),
    db.item.findMany({ where: { isCrafted: false }, orderBy: [{ category: "asc" }, { sortOrder: "asc" }] }),
    db.item.findMany({ where: { category: "INFECTED", traitTag: { not: "" } }, select: { traitTag: true }, distinct: ["traitTag"] }),
  ]);
  const equipment = items.filter((i) => i.category === "EQUIPMENT");
  const bases = items.filter((i) => i.category !== "EQUIPMENT" && i.category !== "FACTOR");
  const missing = infectedTags.map((t) => t.traitTag).filter((t) => !traits.some((x) => x.tag === t));
  return (
    <div>
      <PageHeader title="생산" description="감염물의 이계 특성 태그(아이템 편집기)에 보너스를 정하고, 기본 아이템 + 인자 → 장비 레시피를 등록합니다. 인자 추출 도구는 아이템 효과 '인자 추출 도구'를 가진 아이템이며 구매 조건은 그 아이템의 상점 설정(최소 탈출 횟수)으로 정합니다." />
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="panel">
          <div className="panel-title">이계 특성 태그와 보너스<span className="code">{traits.length}</span></div>
          <div className="flex flex-col gap-4 p-4">
            {missing.length > 0 && <p className="help">감염물에 붙어 있지만 보너스가 없는 태그: {missing.join(", ")}</p>}
            {traits.map((t) => (
              <ActionForm key={t.id} action={saveTraitAction} submitLabel="저장" submitClassName="btn btn-sm" extraButtons={<ConfirmSubmit formAction={deleteTraitAction} message={`태그 "${t.tag}"의 보너스를 삭제할까요?`}>삭제</ConfirmSubmit>} className="flex flex-col gap-2 border border-line p-3">
                <input type="hidden" name="id" value={t.id} />
                <div className="grid grid-cols-2 gap-2"><input name="tag" className="input" defaultValue={t.tag} maxLength={30} required /><input name="description" className="input" defaultValue={t.description} placeholder="설명 (장비 설명에 붙음)" maxLength={300} /></div>
                <ItemEffectsEditor name="effects" initial={t.bonusEffects as ItemEffect[]} />
              </ActionForm>
            ))}
            <ActionForm action={saveTraitAction} submitLabel="+ 태그 추가" submitClassName="btn btn-sm" className="flex flex-col gap-2 border border-dashed border-line p-3">
              <div className="grid grid-cols-2 gap-2"><input name="tag" className="input" placeholder="태그 (예: 역류하는 시간)" maxLength={30} required list="tagsuggest" /><input name="description" className="input" placeholder="설명" maxLength={300} /></div>
              <datalist id="tagsuggest">{missing.map((m) => <option key={m} value={m} />)}</datalist>
              <ItemEffectsEditor name="effects" initial={[{ type: "run_check_bonus", checkType: "ALL", value: 1 }]} />
              <p className="help">보너스는 판정 보정, 다이스 추가, 서술만 됩니다. 조합된 장비에 더해집니다.</p>
            </ActionForm>
          </div>
        </section>
        <section className="panel">
          <div className="panel-title">레시피<span className="code">{recipes.length}</span></div>
          <div className="flex flex-col gap-4 p-4">
            {equipment.length === 0 && <p className="error">분류가 “장비”인 아이템이 없습니다. 아이템 메뉴에서 결과 장비(이름, 기본 효과, 회수가)를 먼저 만드세요. 조합된 장비는 그 효과에 인자 특성 보너스가 더해진 새 아이템으로 생깁니다.</p>}
            {recipes.map((r) => (
              <ActionForm key={r.id} action={saveRecipeAction} submitLabel="저장" submitClassName="btn btn-sm" extraButtons={<ConfirmSubmit formAction={deleteRecipeAction} message={`레시피 "${r.name}"을(를) 삭제할까요?`}>삭제</ConfirmSubmit>} className="flex flex-col gap-2 border border-line p-3">
                <input type="hidden" name="id" value={r.id} />
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <input name="name" className="input" defaultValue={r.name} maxLength={40} required />
                  <select name="baseItemId" className="select" defaultValue={r.baseItemId}>{bases.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</select>
                  <select name="resultItemId" className="select" defaultValue={r.resultItemId}>{equipment.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</select>
                  <input name="checkTarget" type="number" min={2} max={30} className="input mono" defaultValue={r.checkTarget} />
                </div>
                <p className="help">{r.baseItem.name} + 인자 → {r.resultItem.name} ({(r.resultItem.effects as ItemEffect[]).map(describeItemEffect).join(", ") || "효과 없음"})</p>
              </ActionForm>
            ))}
            {equipment.length > 0 && (
              <ActionForm action={saveRecipeAction} submitLabel="+ 레시피 추가" submitClassName="btn btn-sm" className="flex flex-col gap-2 border border-dashed border-line p-3">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <input name="name" className="input" placeholder="레시피 이름" maxLength={40} required />
                  <select name="baseItemId" className="select">{bases.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</select>
                  <select name="resultItemId" className="select">{equipment.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</select>
                  <input name="checkTarget" type="number" min={2} max={30} className="input mono" defaultValue={7} placeholder="목표치" />
                </div>
                <p className="help">제작 판정 목표치: {CHECK_TARGET_HELP.map((h) => `${h.target}=${h.label}`).join(" · ")}</p>
              </ActionForm>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
