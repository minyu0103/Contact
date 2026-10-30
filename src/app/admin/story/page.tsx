import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/PageHeader";
import { ActionForm } from "@/components/ActionForm";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { formatKst } from "@/lib/time";
import { deleteStoryAction, fireNowAction, resetStoryAction, saveStoryAction } from "./actions";
import type { StoryEvent } from "@prisma/client";

const COND = { REALM_PROGRESS: "이계 진행도 ≥ n%", SERVER_ESCAPES: "서버 전체 탈출 ≥ n회", DATE: "지정 시각 이후", MANUAL: "운영자 수동 발동" } as const;

function toLocalInput(d: Date | null) { if (!d) return ""; const k = new Date(d.getTime() + 9 * 3600 * 1000); return k.toISOString().slice(0, 16); }

function StoryForm({ ev, realms, items }: { ev: StoryEvent | null; realms: { id: string; name: string; isPublished: boolean }[]; items: { id: string; name: string }[] }) {
  return (
    <ActionForm action={saveStoryAction} submitLabel={ev ? "저장" : "+ 이벤트 추가"} submitClassName="btn btn-sm" extraButtons={ev && (<>
      {!ev.firedAt && <ConfirmSubmit formAction={fireNowAction} message="지금 발동할까요? 공지·보상·공개가 즉시 적용됩니다." className="btn btn-primary btn-sm">지금 발동</ConfirmSubmit>}
      {ev.firedAt && <ConfirmSubmit formAction={resetStoryAction} message="발동 기록을 지워 다시 발동 가능하게 할까요? (이미 준 보상은 회수되지 않음)" className="btn btn-sm">발동 초기화</ConfirmSubmit>}
      <ConfirmSubmit formAction={deleteStoryAction} message="이벤트를 삭제할까요?">삭제</ConfirmSubmit>
    </>)} className={`flex flex-col gap-3 border p-3 ${ev ? "border-line" : "border-dashed border-line"}`}>
      {ev && <input type="hidden" name="id" value={ev.id} />}
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]"><input name="title" className="input" placeholder="이벤트 제목 (공지 제목)" defaultValue={ev?.title ?? ""} maxLength={80} required /><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isActive" defaultChecked={ev?.isActive ?? true} className="accent-[var(--accent)]" /> 활성</label></div>
      <textarea name="body" className="textarea min-h-[5rem]" placeholder="발동 시 올라갈 공지 본문" defaultValue={ev?.body ?? ""} maxLength={5000} />
      <div className="grid gap-2 sm:grid-cols-[1fr_6rem]"><input name="bannerText" className="input" placeholder="홈 상단 연출 문구 (선택)" defaultValue={ev?.bannerText ?? ""} maxLength={200} /><input name="bannerDays" type="number" min={0} className="input mono" defaultValue={ev?.bannerDays ?? 3} title="표시 일수" /></div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <select name="conditionType" className="select" defaultValue={ev?.conditionType ?? "MANUAL"}>{Object.entries(COND).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        <select name="realmId" className="select" defaultValue={ev?.realmId ?? ""}><option value="">(진행도 조건의 이계)</option>{realms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
        <input name="threshold" type="number" min={0} className="input mono" placeholder="n (% 또는 횟수)" defaultValue={ev?.threshold ?? 50} />
        <input name="triggerAt" type="datetime-local" className="input mono" defaultValue={toLocalInput(ev?.triggerAt ?? null)} title="발동 시각 (KST)" />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <input name="rewardPoints" type="number" min={0} className="input mono" placeholder="전원 보상 P" defaultValue={ev?.rewardPoints ?? 0} title="전원 보상 P" />
        <select name="rewardItemId" className="select" defaultValue={ev?.rewardItemId ?? ""}><option value="">(전원 보상 아이템 없음)</option>{items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</select>
        <input name="rewardQty" type="number" min={1} className="input mono" defaultValue={ev?.rewardQty ?? 1} title="보상 수량" />
        <select name="publishRealmId" className="select" defaultValue={ev?.publishRealmId ?? ""}><option value="">(공개할 이계 없음)</option>{realms.map((r) => <option key={r.id} value={r.id}>{r.name}{r.isPublished ? " (이미 공개)" : ""}</option>)}</select>
      </div>
      {ev?.firedAt && <p className="success">발동됨 {formatKst(ev.firedAt)}</p>}
    </ActionForm>
  );
}

export default async function AdminStoryPage() {
  const [events, realms, items] = await Promise.all([
    db.storyEvent.findMany({ orderBy: [{ firedAt: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }] }),
    db.realm.findMany({ where: { templateId: null }, select: { id: true, name: true, isPublished: true }, orderBy: { name: "asc" } }),
    db.item.findMany({ where: { isCrafted: false }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  return (
    <div>
      <PageHeader title="스토리 연출" description="조건을 만족하면 자동으로 발동됩니다(유저가 홈이나 지도를 열 때 점검). 발동 효과: 고정 공지, 홈 상단 연출 문구, 전원 보상, 이계 공개. 메인 스토리는 고정 이계 진행도를 조건으로 단계별 이벤트를 두면 됩니다." />
      <div className="flex flex-col gap-4">
        {events.map((ev) => <StoryForm key={ev.id} ev={ev} realms={realms} items={items} />)}
        <StoryForm ev={null} realms={realms} items={items} />
      </div>
    </div>
  );
}
