import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/PageHeader";
import { ActionForm } from "@/components/ActionForm";
import { AbilityEffectsEditor } from "@/components/admin/AbilityEffectsEditor";
import { CATEGORY_OPTIONS, CHECK_TYPE_OPTIONS } from "@/lib/content-types";
import { CATEGORY_LABEL } from "@/lib/rules";
import { formatKst } from "@/lib/time";
import { reviewAbilityAction } from "../actions";
import { IntentButtons } from "./IntentButtons";

const ABILITY_LABEL = { PENDING: "심사 중", ACTIVE: "활성", RETURNED: "반려" } as const;

export default async function AbilityReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [c, tags] = await Promise.all([
    db.character.findUnique({ where: { id }, include: { user: true, effects: { orderBy: { sortOrder: "asc" } }, tags: true } }),
    db.abilityTag.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!c) notFound();
  const myTags = new Set(c.tags.map((t) => t.tagId));
  return (
    <div>
      <PageHeader title={`능력 심사: ${c.name}`} description={`${c.user.loginId} · 현재 상태 ${ABILITY_LABEL[c.abilityStatus]} · 제출 ${formatKst(c.createdAt)}`} />
      <ActionForm action={reviewAbilityAction} submitLabel="저장만 (상태 유지)" submitClassName="btn" submitName="intent" submitValue="save" extraButtons={<IntentButtons />}>
        <input type="hidden" name="id" value={c.id} />
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="panel">
            <div className="panel-title">유저 제출 내용</div>
            <div className="p-4 text-sm">
              <p className="hud-label">선택한 카테고리</p>
              <p className="mb-3">{CATEGORY_LABEL[c.category]}</p>
              <p className="hud-label">능력 이름</p>
              <p className="mb-3 text-base font-semibold">{c.abilityName}</p>
              <p className="hud-label">능력 서술</p>
              <p className="whitespace-pre-wrap leading-relaxed text-fg-dim">{c.abilityDesc}</p>
            </div>
          </section>

          <div className="flex flex-col gap-4">
            <section className="panel">
              <div className="panel-title">능력 데이터</div>
              <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3">
                <div className="field"><label htmlFor="category">카테고리 (확정)</label>
                  <select id="category" name="category" className="select" defaultValue={c.category}>{CATEGORY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
                <div className="field"><label htmlFor="proficiencyCheckType">숙련도 판정 종류 (특수형만)</label>
                  <select id="proficiencyCheckType" name="proficiencyCheckType" className="select" defaultValue={c.proficiencyCheckType ?? ""}>
                    <option value="">없음 / 카테고리로 자동</option>
                    {CHECK_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select></div>
                <div className="field"><label htmlFor="proficiency">숙련도 (1~5)</label><input id="proficiency" name="proficiency" type="number" min={1} max={5} className="input mono" defaultValue={c.proficiency} /></div>
              </div>
            </section>
            <section className="panel">
              <div className="panel-title">효과 목록</div>
              <div className="p-4"><AbilityEffectsEditor initial={c.effects.map((e) => ({ type: e.type, checkType: e.checkType, value: e.value, perDay: e.perDay, note: e.note }))} /></div>
            </section>
            <section className="panel">
              <div className="panel-title">능력 태그</div>
              <div className="flex flex-wrap gap-2 p-4 text-sm">
                {tags.length === 0 && <p className="help">태그가 없습니다. 능력 태그 메뉴에서 먼저 만드세요.</p>}
                {tags.map((t) => (
                  <label key={t.id} className="flex cursor-pointer items-center gap-1.5 border border-line px-2 py-1 has-[:checked]:border-accent-2 has-[:checked]:bg-accent-dim">
                    <input type="checkbox" name="tagIds" value={t.id} defaultChecked={myTags.has(t.id)} className="accent-[var(--accent)]" />{t.name}
                  </label>
                ))}
              </div>
            </section>
            <section className="panel">
              <div className="panel-title">코멘트 (반려 시 유저에게 표시)</div>
              <div className="p-4"><textarea name="comment" className="textarea" defaultValue={c.abilityComment} maxLength={2000} placeholder="수정이 필요한 점, 또는 승인 메모" /></div>
            </section>
          </div>
        </div>
      </ActionForm>
    </div>
  );
}
