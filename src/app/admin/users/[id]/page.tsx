import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getConfig } from "@/lib/game-config";
import { PageHeader } from "@/components/admin/PageHeader";
import { ActionForm } from "@/components/ActionForm";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { CATEGORY_LABEL } from "@/lib/rules";
import { describeAbilityEffect } from "@/lib/content-types";
import { formatKst } from "@/lib/time";
import { adjustStatsAction, forceEndRunAction, grantItemAction, resetPasswordAction, toggleRoleAction } from "../actions";

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [c, items, cfg] = await Promise.all([
    db.character.findUnique({
      where: { id },
      include: {
        user: true,
        effects: { orderBy: { sortOrder: "asc" } },
        tags: { include: { tag: true } },
        inventory: { include: { item: true }, orderBy: { item: { sortOrder: "asc" } } },
        runs: { orderBy: { startedAt: "desc" }, take: 10, include: { realm: true } },
      },
    }),
    db.item.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
    getConfig(),
  ]);
  if (!c) notFound();
  const activeRun = c.runs.find((r) => r.status === "ACTIVE");
  const num = (name: string, label: string, value: number, extra: Record<string, number> = {}) => (
    <div className="field" key={name}><label htmlFor={name}>{label}</label><input id={name} name={name} type="number" className="input mono" defaultValue={value} {...extra} /></div>
  );
  return (
    <div>
      <PageHeader title={`유저: ${c.name}`} description={`${c.user.loginId} · ${CATEGORY_LABEL[c.category]} · ${c.abilityName} · 가입 ${formatKst(c.createdAt)}`} />
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="panel">
          <div className="panel-title">수치 수동 조정</div>
          <div className="p-4">
            <ActionForm action={adjustStatsAction} submitLabel="조정 적용">
              <input type="hidden" name="id" value={c.id} />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {num("hp", "체력", c.hp, { min: 0 })}
                {num("maxHp", "최대 체력", c.maxHp, { min: 1 })}
                {num("mp", "정신력", c.mp, { min: 0 })}
                {num("maxMp", "최대 정신력", c.maxMp, { min: 1 })}
                {num("erosion", "침식률", c.erosion, { min: 0 })}
                {num("ap", `행동력 (하루 ${cfg["char.dailyAp"]})`, c.ap, { min: 0 })}
                {num("points", "P", c.points, { min: 0 })}
                {num("level", "레벨", c.level, { min: 1 })}
                {num("exp", "경험치", c.exp, { min: 0 })}
                {num("statPoints", "스탯 포인트", c.statPoints, { min: 0 })}
                {num("proficiency", "숙련도 (1~5)", c.proficiency, { min: 1, max: 5 })}
                {num("proficiencyExp", "숙련 경험", c.proficiencyExp, { min: 0 })}
                {num("escapeCount", "탈출 성공 횟수", c.escapeCount, { min: 0 })}
              </div>
              <div className="field"><label htmlFor="reason">사유 (변경 기록에 남음)</label><input id="reason" name="reason" className="input" placeholder="예: 공동 탐사 RP 판정으로 침식률 -5" maxLength={200} /></div>
            </ActionForm>
          </div>
        </section>

        <div className="flex flex-col gap-4">
          <section className="panel">
            <div className="panel-title">보관함<span className="code">{c.inventory.length} / {cfg["char.inventorySlots"]}칸</span></div>
            <div className="p-4">
              <ul className="mb-4 flex flex-wrap gap-1.5 text-sm">
                {c.inventory.length === 0 && <li className="help">비어 있음</li>}
                {c.inventory.map((inv) => <li key={inv.id} className="tag">{inv.item.name} <span className="mono ml-1 text-accent">×{inv.qty}</span></li>)}
              </ul>
              <ActionForm action={grantItemAction} submitLabel="지급 / 회수" className="flex flex-wrap items-end gap-2">
                <input type="hidden" name="id" value={c.id} />
                <div className="field flex-1"><label htmlFor="itemId">아이템</label>
                  <select id="itemId" name="itemId" className="select">{items.map((it) => <option key={it.id} value={it.id}>{it.name}</option>)}</select></div>
                <div className="field w-24"><label htmlFor="qty">수량 (음수=회수)</label><input id="qty" name="qty" type="number" className="input mono" defaultValue={1} /></div>
              </ActionForm>
            </div>
          </section>

          <section className="panel">
            <div className="panel-title">능력</div>
            <div className="p-4 text-sm">
              <p className="mb-1"><span className="font-semibold">{c.abilityName}</span> <span className="text-fg-dim">· {CATEGORY_LABEL[c.category]} · 숙련도 {c.proficiency}</span></p>
              <p className="mb-2 flex flex-wrap gap-1">{c.tags.map((t) => <span key={t.tagId} className="tag tag-accent">{t.tag.name}</span>)}</p>
              <ul className="mb-3 list-disc pl-5 text-xs text-fg-dim">{c.effects.map((e) => <li key={e.id}>{describeAbilityEffect(e)}</li>)}{c.effects.length === 0 && <li>등록된 효과 없음</li>}</ul>
              <Link href={`/admin/abilities/${c.id}`} className="btn btn-sm">능력 심사 화면으로</Link>
            </div>
          </section>
        </div>

        <section className="panel">
          <div className="panel-title">런<span className="code">최근 10</span></div>
          <div className="p-4 text-sm">
            {activeRun && (
              <form action={forceEndRunAction} className="mb-3 flex items-center gap-3 border border-accent/40 bg-accent-dim p-3">
                <input type="hidden" name="runId" value={activeRun.id} />
                <span>진행 중: <b>{activeRun.realm.name}</b> ({formatKst(activeRun.startedAt)})</span>
                <ConfirmSubmit message="진행 중인 런을 강제 종료할까요? 이번 런의 공개·보수·획득 아이템은 모두 무효가 됩니다." className="btn btn-danger btn-sm ml-auto">강제 종료</ConfirmSubmit>
              </form>
            )}
            <ul className="divide-y divide-line text-xs">
              {c.runs.map((r) => <li key={r.id} className="flex gap-3 py-1.5"><span className="mono text-fg-mute">{formatKst(r.startedAt)}</span><span>{r.realm.name}</span><span className="ml-auto tag">{r.status}</span></li>)}
              {c.runs.length === 0 && <li className="help">런 기록 없음</li>}
            </ul>
          </div>
        </section>

        <section className="panel">
          <div className="panel-title">계정</div>
          <div className="flex flex-col gap-4 p-4 text-sm">
            <ActionForm action={resetPasswordAction} submitLabel="비밀번호 변경" className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="userId" value={c.userId} />
              <div className="field flex-1"><label htmlFor="password">새 비밀번호</label><input id="password" name="password" type="text" className="input" minLength={6} placeholder="6자 이상. 유저에게 직접 전달" /></div>
            </ActionForm>
            <form action={toggleRoleAction} className="flex items-center gap-3">
              <input type="hidden" name="userId" value={c.userId} />
              <span>권한: {c.user.role === "ADMIN" ? <span className="tag tag-warn">관리자</span> : <span className="tag">일반 유저</span>}</span>
              <ConfirmSubmit message={c.user.role === "ADMIN" ? "관리자 권한을 해제할까요?" : "이 계정에 관리자 권한을 줄까요? 관리자 페이지 전체에 접근할 수 있게 됩니다."} className="btn btn-sm">{c.user.role === "ADMIN" ? "관리자 해제" : "관리자로 지정"}</ConfirmSubmit>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
