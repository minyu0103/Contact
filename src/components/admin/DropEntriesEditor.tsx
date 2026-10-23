"use client";

import { useState } from "react";

type ItemOpt = { id: string; name: string };
type Row = { itemId: string; weight: number; minQty: number; maxQty: number };

/** 드랍 테이블 항목 편집기. 각 항목의 확률(%)을 자동 계산해 보여 준다. itemId ""은 "아무것도 없음". */
export function DropEntriesEditor({ items, initial }: { items: ItemOpt[]; initial: Row[] }) {
  const [rows, setRows] = useState<Row[]>(initial.length ? initial : []);
  const total = rows.reduce((s, r) => s + Math.max(0, Number(r.weight) || 0), 0);
  const update = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  return (
    <div className="flex flex-col gap-2">
      <input type="hidden" name="entries" value={JSON.stringify(rows)} />
      <div className="grid grid-cols-[1fr_5rem_4.5rem_4.5rem_4rem_auto] items-center gap-2 px-1 text-[0.66rem] font-semibold text-fg-mute">
        <span>아이템</span><span>가중치</span><span>최소</span><span>최대</span><span>확률</span><span />
      </div>
      {rows.map((r, i) => {
        const pct = total > 0 ? ((Math.max(0, Number(r.weight) || 0) / total) * 100).toFixed(1) : "0.0";
        return (
          <div key={i} className="grid grid-cols-[1fr_5rem_4.5rem_4.5rem_4rem_auto] items-center gap-2">
            <select className="select" value={r.itemId} onChange={(e) => update(i, { itemId: e.target.value })}>
              <option value="">(아무것도 없음)</option>
              {items.map((it) => <option key={it.id} value={it.id}>{it.name}</option>)}
            </select>
            <input type="number" min={0} className="input mono" value={r.weight} onChange={(e) => update(i, { weight: Number(e.target.value) })} />
            <input type="number" min={1} className="input mono" value={r.minQty} disabled={!r.itemId} onChange={(e) => update(i, { minQty: Number(e.target.value) })} />
            <input type="number" min={1} className="input mono" value={r.maxQty} disabled={!r.itemId} onChange={(e) => update(i, { maxQty: Number(e.target.value) })} />
            <span className="mono text-sm text-accent">{pct}%</span>
            <button type="button" className="btn btn-ghost btn-sm text-danger" onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))}>제거</button>
          </div>
        );
      })}
      <button type="button" className="btn btn-sm self-start" onClick={() => setRows((rs) => [...rs, { itemId: items[0]?.id ?? "", weight: 1, minQty: 1, maxQty: 1 }])}>+ 항목 추가</button>
      <p className="help">가중치 합 {total}. 확률 = 가중치 ÷ 합계. 굴림 1회마다 항목 하나가 뽑힙니다.</p>
    </div>
  );
}
