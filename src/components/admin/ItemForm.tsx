import type { Item } from "@prisma/client";
import { ActionForm } from "@/components/ActionForm";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { ItemEffectsEditor } from "@/components/admin/ItemEffectsEditor";
import { ITEM_CATEGORY_OPTIONS, USABLE_IN_OPTIONS, type ItemEffect } from "@/lib/content-types";
import { deleteItemAction, saveItemAction } from "@/app/admin/items/actions";

export function ItemForm({ item }: { item: Item | null }) {
  return (
    <ActionForm
      action={saveItemAction}
      submitLabel={item ? "저장" : "만들기"}
      extraButtons={item && (
        <ConfirmSubmit formAction={deleteItemAction} message={`"${item.name}"을(를) 삭제할까요? 유저 보관함과 드랍 테이블에서도 함께 사라집니다.`}>삭제</ConfirmSubmit>
      )}
    >
      {item && <input type="hidden" name="id" value={item.id} />}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="panel">
          <div className="panel-title">기본 정보</div>
          <div className="flex flex-col gap-3 p-4">
            <div className="field"><label htmlFor="name">이름</label><input id="name" name="name" className="input" defaultValue={item?.name} maxLength={40} required /></div>
            <div className="field"><label htmlFor="description">설명</label><textarea id="description" name="description" className="textarea" defaultValue={item?.description} maxLength={1000} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="field"><label htmlFor="category">분류</label>
                <select id="category" name="category" className="select" defaultValue={item?.category ?? "CONSUMABLE"}>
                  {ITEM_CATEGORY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select></div>
              <div className="field"><label htmlFor="usableIn">사용 가능 위치</label>
                <select id="usableIn" name="usableIn" className="select" defaultValue={item?.usableIn ?? "BOTH"}>
                  {USABLE_IN_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select></div>
              <div className="field"><label htmlFor="stackLimit">겹치기 (한 칸에 몇 개)</label><input id="stackLimit" name="stackLimit" type="number" min={1} className="input mono" defaultValue={item?.stackLimit ?? 99} /></div>
              <div className="field"><label htmlFor="sortOrder">정렬 순서</label><input id="sortOrder" name="sortOrder" type="number" className="input mono" defaultValue={item?.sortOrder ?? 0} /></div>
            </div>
            <div className="field">
              <label htmlFor="image">이미지</label>
              {item?.imageUrl && (
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.imageUrl} alt="" className="h-12 w-12 border border-line object-cover" />
                  <label className="flex items-center gap-2 text-xs"><input type="checkbox" name="removeImage" className="accent-[var(--accent)]" /> 이미지 제거</label>
                </div>
              )}
              <input id="image" name="image" type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="input text-sm" />
              <p className="help">없으면 분류별 기본 아이콘을 씁니다.</p>
            </div>
          </div>
        </section>
        <div className="flex flex-col gap-4">
          <section className="panel">
            <div className="panel-title">효과</div>
            <div className="p-4"><ItemEffectsEditor initial={(item?.effects as ItemEffect[] | undefined) ?? []} /></div>
          </section>
          <section className="panel">
            <div className="panel-title">상점 · 회수</div>
            <div className="grid grid-cols-2 gap-3 p-4">
              <label className="col-span-2 flex items-center gap-2 text-sm"><input type="checkbox" name="shopEnabled" defaultChecked={item?.shopEnabled ?? false} className="accent-[var(--accent)]" /> 상점에서 판매</label>
              <div className="field"><label htmlFor="price">가격 (P)</label><input id="price" name="price" type="number" min={0} className="input mono" defaultValue={item?.price ?? 0} /></div>
              <div className="field"><label htmlFor="sellPrice">회수가 (P, 0이면 판매 불가)</label><input id="sellPrice" name="sellPrice" type="number" min={0} className="input mono" defaultValue={item?.sellPrice ?? 0} /></div>
              <div className="field"><label htmlFor="minLevel">구매 조건: 최소 레벨</label><input id="minLevel" name="minLevel" type="number" min={0} className="input mono" defaultValue={item?.minLevel ?? 0} /></div>
              <div className="field"><label htmlFor="minEscapes">구매 조건: 최소 탈출 성공</label><input id="minEscapes" name="minEscapes" type="number" min={0} className="input mono" defaultValue={item?.minEscapes ?? 0} /></div>
            </div>
          </section>
        </div>
      </div>
    </ActionForm>
  );
}
