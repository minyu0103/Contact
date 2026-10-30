"use client";

import { useState } from "react";

export function ListingForm({ inventory, items }: { inventory: { itemId: string; name: string; qty: number }[]; items: { id: string; name: string }[] }) {
  const [kind, setKind] = useState<"SELL" | "BARTER" | "REQUEST">("SELL");
  return (
    <div className="flex flex-col gap-3">
      <div className="field"><label>종류</label>
        <select name="kind" className="select" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}><option value="SELL">판매 (아이템 → P)</option><option value="BARTER">물물교환 (아이템 ↔ 아이템)</option><option value="REQUEST">주문 제작 의뢰 (P → 물건)</option></select></div>
      <div className="field"><label>제목</label><input name="title" className="input" maxLength={80} required placeholder={kind === "REQUEST" ? "예: 멈춘 시간 특성 장비 만들어주실 분" : "예: 침식 억제제 팝니다"} /></div>
      {kind !== "REQUEST" && (
        <div className="grid grid-cols-[1fr_4.5rem] gap-2">
          <div className="field"><label>내놓을 아이템</label><select name="offerItemId" className="select">{inventory.map((i) => <option key={i.itemId} value={i.itemId}>{i.name} (보유 {i.qty})</option>)}</select></div>
          <div className="field"><label>수량</label><input name="offerQty" type="number" min={1} className="input mono" defaultValue={1} /></div>
        </div>
      )}
      {kind === "SELL" && <div className="field"><label>가격 (P)</label><input name="askPoints" type="number" min={1} className="input mono" defaultValue={50} /></div>}
      {kind === "BARTER" && (
        <div className="grid grid-cols-[1fr_4.5rem] gap-2">
          <div className="field"><label>받고 싶은 아이템</label><select name="askItemId" className="select">{items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</select></div>
          <div className="field"><label>수량</label><input name="askQty" type="number" min={1} className="input mono" defaultValue={1} /></div>
        </div>
      )}
      {kind === "REQUEST" && <div className="field"><label>제작 보수 (P, 보관됨)</label><input name="askPoints" type="number" min={1} className="input mono" defaultValue={100} /></div>}
      <div className="field"><label>설명 (흥정 조건, 원하는 특성 등)</label><textarea name="body" className="textarea min-h-[4rem]" maxLength={3000} /></div>
    </div>
  );
}
