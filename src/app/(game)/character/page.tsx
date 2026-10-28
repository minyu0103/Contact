import { db } from "@/lib/db";
import { requireCharacterUser } from "@/lib/auth";
import { loadCharacter } from "@/lib/character";
import { getConfig } from "@/lib/game-config";
import { ActionForm } from "@/components/ActionForm";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { CATEGORY_LABEL, CHECK_TYPE_LABEL, EROSION_STAGE_LABEL, erosionStage, levelUpRequirement, proficiencyCheckTypeFor } from "@/lib/rules";
import { describeAbilityEffect, describeItemEffect, ITEM_CATEGORY_OPTIONS, type ItemEffect } from "@/lib/content-types";
import { allocateStatAction, changePasswordAction, discardItemAction, resubmitAbilityAction, updateProfileAction, useItemAction } from "./actions";

const ABILITY_LABEL = { PENDING: { label: "심사 중", cls: "tag-warn" }, ACTIVE: { label: "활성", cls: "tag-ok" }, RETURNED: { label: "반려", cls: "tag-danger" } } as const;

export default async function CharacterPage() {
  const { user, character: raw } = await requireCharacterUser();
  const cfg = await getConfig();
  const character = (await loadCharacter(raw.id, cfg)) ?? raw;
  const [full, inventory, activeRun] = await Promise.all([
    db.character.findUnique({ where: { id: character.id }, include: { effects: { orderBy: { sortOrder: "asc" } }, tags: { include: { tag: true } } } }),
    db.inventoryItem.findMany({ where: { characterId: character.id }, include: { item: true }, orderBy: { item: { sortOrder: "asc" } } }),
    db.run.findFirst({ where: { characterId: character.id, status: "ACTIVE", isTest: false } }),
  ]);
  const stage = erosionStage(character.erosion, cfg);
  const need = levelUpRequirement(character.level, cfg);
  const own = proficiencyCheckTypeFor(character.category, character.proficiencyCheckType);
  const st = ABILITY_LABEL[character.abilityStatus];
  const catLabel = (v: string) => ITEM_CATEGORY_OPTIONS.find((o) => o.value === v)?.label ?? v;
  const canUse = (it: typeof inventory[number]["item"]) => it.usableIn !== "RUN" && (it.effects as ItemEffect[]).some((e) => e.type === "hp" || e.type === "mp" || e.type === "erosion");

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="panel">
        <div className="panel-title">유저 정보<span className="code">{user.loginId}</span></div>
        <div className="flex flex-col gap-4 p-4">
          <div className="flex gap-4">
            {character.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={character.imageUrl} alt="" className="h-24 w-24 border border-line-2 object-cover" />
            ) : <div className="flex h-24 w-24 items-center justify-center border border-line-2 bg-bg text-[0.65rem] text-fg-mute">NO IMAGE</div>}
            <div className="text-sm">
              <p className="text-xl font-bold">{character.name}</p>
              <p className="text-fg-dim">{CATEGORY_LABEL[character.category]}</p>
              <p className="mono mt-2 text-xs text-fg-mute">Lv.{character.level} · EXP {character.exp}/{need} · 탈출 성공 {character.escapeCount}회</p>
            </div>
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2 text-sm">
            <dt className="hud-label self-center">체력</dt><dd className="mono">{character.hp} / {character.maxHp}</dd>
            <dt className="hud-label self-center">정신력</dt><dd className="mono">{character.mp} / {character.maxMp}</dd>
            <dt className="hud-label self-center">침식률</dt><dd className="mono">{character.erosion} · {EROSION_STAGE_LABEL[stage]}</dd>
            <dt className="hud-label self-center">행동력</dt><dd className="mono">{character.ap} / {cfg["char.dailyAp"]}</dd>
            <dt className="hud-label self-center">P</dt><dd className="mono text-warn">{character.points.toLocaleString()}</dd>
          </dl>
          <div className="border border-line p-3">
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold">스탯 배분 <span className={`tag ${character.statPoints > 0 ? "tag-accent" : ""}`}>남은 포인트 {character.statPoints}</span></p>
            <div className="flex gap-2">
              <ActionForm action={allocateStatAction} submitLabel="최대 체력 +1" submitClassName="btn btn-sm" submitName="stat" submitValue="hp" className="flex flex-col gap-1"><></></ActionForm>
              <ActionForm action={allocateStatAction} submitLabel="최대 정신력 +1" submitClassName="btn btn-sm" submitName="stat" submitValue="mp" className="flex flex-col gap-1"><></></ActionForm>
            </div>
            <p className="help mt-2">레벨업마다 포인트 {cfg["char.statPointPerLevel"]}을 얻습니다. 배분은 되돌릴 수 없습니다.</p>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-title">능력<span className={`tag ${st.cls}`}>{st.label}</span></div>
        <div className="flex flex-col gap-3 p-4 text-sm">
          <p className="text-lg font-semibold">{character.abilityName}</p>
          <p className="whitespace-pre-wrap leading-relaxed text-fg-dim">{character.abilityDesc}</p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-1.5">
            <dt className="hud-label self-center">숙련도</dt><dd className="mono">{character.proficiency} / 5 <span className="text-xs text-fg-mute">(숙련 경험 {character.proficiencyExp})</span></dd>
            <dt className="hud-label self-center">숙련 판정</dt><dd>{own ? `${CHECK_TYPE_LABEL[own]} 판정 +${Math.max(0, character.proficiency - cfg["check.proficiencyBonusOffset"])}` : "없음"}</dd>
            <dt className="hud-label">효과</dt>
            <dd>{character.abilityStatus === "ACTIVE" && full?.effects.length ? <ul className="list-disc pl-4">{full.effects.map((e) => <li key={e.id}>{describeAbilityEffect(e)}</li>)}</ul> : <span className="help">{character.abilityStatus === "ACTIVE" ? "등록된 효과 없음" : "심사 후 적용"}</span>}</dd>
            {full && full.tags.length > 0 && (<><dt className="hud-label self-center">태그</dt><dd className="flex flex-wrap gap-1">{full.tags.map((t) => <span key={t.tagId} className="tag tag-accent">{t.tag.name}</span>)}</dd></>)}
          </dl>
          {character.abilityStatus === "RETURNED" && (
            <div className="border border-danger/40 p-3">
              <p className="mb-1 text-xs font-semibold text-danger">운영자 코멘트</p>
              <p className="mb-3 whitespace-pre-wrap text-xs text-fg-dim">{character.abilityComment || "(코멘트 없음)"}</p>
              <ActionForm action={resubmitAbilityAction} submitLabel="수정해서 다시 제출">
                <div className="field"><label htmlFor="abilityName">능력 이름</label><input id="abilityName" name="abilityName" className="input" defaultValue={character.abilityName} maxLength={40} required /></div>
                <div className="field"><label htmlFor="abilityDesc">능력 서술</label><textarea id="abilityDesc" name="abilityDesc" className="textarea" defaultValue={character.abilityDesc} maxLength={3000} required /></div>
              </ActionForm>
            </div>
          )}
          {character.abilityStatus === "ACTIVE" && character.abilityComment && <p className="help">운영자 메모: {character.abilityComment}</p>}
        </div>
      </section>

      <section className="panel lg:col-span-2">
        <div className="panel-title">보관함<span className="code">{inventory.length} / {cfg["char.inventorySlots"]}칸</span></div>
        <div className="p-4">
          {activeRun && <p className="help mb-3">탐사 중입니다. 소모품은 탐사 화면에서 사용하세요.</p>}
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {inventory.length === 0 && <li className="help">비어 있음</li>}
            {inventory.map((inv) => (
              <li key={inv.id} className="flex gap-3 border border-line p-3">
                {inv.item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={inv.item.imageUrl} alt="" className="h-12 w-12 shrink-0 border border-line-2 object-cover" />
                ) : <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-line-2 bg-bg text-[0.6rem] text-fg-mute">{catLabel(inv.item.category).slice(0, 2)}</div>}
                <div className="min-w-0 flex-1 text-sm">
                  <p className="flex items-center gap-2 font-semibold">{inv.item.name}<span className="mono text-xs text-accent">×{inv.qty}</span></p>
                  <p className="help line-clamp-2">{inv.item.description}</p>
                  <p className="text-xs text-accent">{(inv.item.effects as ItemEffect[]).map(describeItemEffect).join(" · ")}</p>
                  <div className="mt-2 flex items-center gap-1.5">
                    {canUse(inv.item) && !activeRun && (
                      <ActionForm action={useItemAction} submitLabel="사용" submitClassName="btn btn-primary btn-sm" className="flex flex-col gap-1"><input type="hidden" name="itemId" value={inv.itemId} /></ActionForm>
                    )}
                    <form action={discardItemAction}><input type="hidden" name="itemId" value={inv.itemId} /><ConfirmSubmit message={`${inv.item.name} ×${inv.qty}을(를) 모두 버릴까요?`} className="btn btn-ghost btn-sm text-danger">버리기</ConfirmSubmit></form>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="panel">
        <div className="panel-title">프로필 이미지</div>
        <div className="p-4">
          <ActionForm action={updateProfileAction} submitLabel="이미지 변경" submitClassName="btn btn-sm">
            <input name="image" type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="input text-sm" />
            {character.imageUrl && <label className="flex items-center gap-2 text-xs"><input type="checkbox" name="removeImage" className="accent-[var(--accent)]" /> 이미지 제거</label>}
          </ActionForm>
        </div>
      </section>
      <section className="panel">
        <div className="panel-title">비밀번호 변경</div>
        <div className="p-4">
          <ActionForm action={changePasswordAction} submitLabel="변경" submitClassName="btn btn-sm">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <input name="current" type="password" className="input" placeholder="현재 비밀번호" autoComplete="current-password" required />
              <input name="next" type="password" className="input" placeholder="새 비밀번호 (6자 이상)" autoComplete="new-password" required />
              <input name="confirm" type="password" className="input" placeholder="새 비밀번호 확인" autoComplete="new-password" required />
            </div>
          </ActionForm>
        </div>
      </section>
    </div>
  );
}
