"use client";

import { useState } from "react";
import { CHECK_TARGET_OPTIONS, ITEM_EFFECT_DEFS, type ItemEffect } from "@/lib/content-types";

type Row = { type: ItemEffect["type"]; value: number; checkType: string; text: string };

function toRows(effects: ItemEffect[]): Row[] {
  return effects.map((e) => ({
    type: e.type,
    value: "value" in e ? e.value : 0,
    checkType: "checkType" in e ? e.checkType : "OWN",
    text: "text" in e ? e.text : "",
  }));
}

/** 아이템 효과 목록 편집기. 결과를 hidden input(JSON)으로 제출한다. */
export function ItemEffectsEditor({ name = "effects", initial }: { name?: string; initial: ItemEffect[] }) {
  const [rows, setRows] = useState<Row[]>(() => toRows(initial));
  const update = (i: number, patch: Partial<Row>) => setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  const serialized = rows.map((r) => {
    const def = ITEM_EFFECT_DEFS.find((d) => d.type === r.type)!;
    const out: Record<string, unknown> = { type: r.type };
    if (def.fields.includes("value")) out.value = Number(r.value) || 0;
    if (def.fields.includes("checkType")) out.checkType = r.checkType;
    if (def.fields.includes("text")) out.text = r.text;
    return out;
  });
  return (
    <div className="flex flex-col gap-2">
      <input type="hidden" name={name} value={JSON.stringify(serialized)} />
      {rows.map((r, i) => {
        const def = ITEM_EFFECT_DEFS.find((d) => d.type === r.type)!;
        return (
          <div key={i} className="flex flex-wrap items-center gap-2 border border-line bg-bg/50 p-2">
            <select className="select w-auto" value={r.type} onChange={(e) => update(i, { type: e.target.value as Row["type"] })}>
              {ITEM_EFFECT_DEFS.map((d) => <option key={d.type} value={d.type}>{d.label}</option>)}
            </select>
            {def.fields.includes("checkType") && (
              <select className="select w-auto" value={r.checkType} onChange={(e) => update(i, { checkType: e.target.value })}>
                {CHECK_TARGET_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            )}
            {def.fields.includes("value") && (
              <input type="number" className="input mono w-24" value={r.value} onChange={(e) => update(i, { value: Number(e.target.value) })} />
            )}
            {def.fields.includes("text") && (
              <input type="text" className="input flex-1 min-w-[10rem]" placeholder="설명" value={r.text} onChange={(e) => update(i, { text: e.target.value })} />
            )}
            {def.help && <span className="help">{def.help}</span>}
            <button type="button" className="btn btn-ghost btn-sm ml-auto text-danger" onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))}>제거</button>
          </div>
        );
      })}
      <button type="button" className="btn btn-sm self-start" onClick={() => setRows((rs) => [...rs, { type: "hp", value: 1, checkType: "OWN", text: "" }])}>+ 효과 추가</button>
    </div>
  );
}
