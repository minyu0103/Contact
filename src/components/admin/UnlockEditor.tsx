"use client";

import { useState } from "react";
import type { Opt } from "./editor-options";

type Row = { type: "flag" | "realm_escapes" | "item"; flag: string; realmId: string; count: number; itemId: string };

/** 도감 단계 해금 조건 편집기 (hidden input JSON) */
export function UnlockEditor({ name, initial, realms, items, flags }: { name: string; initial: Row[]; realms: Opt[]; items: Opt[]; flags: string[] }) {
  const [rows, setRows] = useState<Row[]>(initial);
  const update = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const serialized = rows.map((r) => r.type === "flag" ? { type: r.type, flag: r.flag } : r.type === "item" ? { type: r.type, itemId: r.itemId } : { type: r.type, realmId: r.realmId, count: Number(r.count) || 1 });
  return (
    <div className="flex flex-col gap-1.5">
      <input type="hidden" name={name} value={JSON.stringify(serialized)} />
      {rows.map((r, i) => (
        <div key={i} className="flex flex-wrap items-center gap-1.5">
          <select className="select w-auto text-xs" value={r.type} onChange={(e) => update(i, { type: e.target.value as Row["type"] })}>
            <option value="flag">단서 플래그 확보</option><option value="realm_escapes">이계 탈출 횟수</option><option value="item">아이템 획득</option>
          </select>
          {r.type === "flag" && (<><input className="input w-40 text-xs" list={`flags-${name}`} placeholder="플래그 이름" value={r.flag} onChange={(e) => update(i, { flag: e.target.value })} /><datalist id={`flags-${name}`}>{flags.map((f) => <option key={f} value={f} />)}</datalist></>)}
          {r.type === "realm_escapes" && (<><select className="select w-auto text-xs" value={r.realmId} onChange={(e) => update(i, { realmId: e.target.value })}><option value="">이계 선택</option>{realms.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select><input type="number" min={1} className="input mono w-16 text-xs" value={r.count} onChange={(e) => update(i, { count: Number(e.target.value) })} /><span className="text-xs text-fg-mute">회</span></>)}
          {r.type === "item" && <select className="select w-auto text-xs" value={r.itemId} onChange={(e) => update(i, { itemId: e.target.value })}><option value="">아이템 선택</option>{items.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select>}
          <button type="button" className="btn btn-ghost btn-sm text-danger" onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))}>×</button>
        </div>
      ))}
      <button type="button" className="btn btn-sm self-start" onClick={() => setRows((rs) => [...rs, { type: "flag", flag: "", realmId: "", count: 1, itemId: "" }])}>+ 조건</button>
      <p className="help">조건이 없으면 누구나 읽을 수 있습니다. 여러 개면 모두 충족해야 합니다.</p>
    </div>
  );
}
