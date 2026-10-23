"use client";

import { useState } from "react";
import { ABILITY_EFFECT_DEFS, CHECK_TYPE_OPTIONS, type AbilityEffectInput } from "@/lib/content-types";

type Row = AbilityEffectInput;

/** 능력 효과 목록 편집기. 결과를 hidden input(JSON)으로 제출한다. */
export function AbilityEffectsEditor({ initial }: { initial: Row[] }) {
  const [rows, setRows] = useState<Row[]>(initial);
  const update = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  return (
    <div className="flex flex-col gap-2">
      <input type="hidden" name="effects" value={JSON.stringify(rows)} />
      {rows.map((r, i) => {
        const def = ABILITY_EFFECT_DEFS.find((d) => d.type === r.type)!;
        const fields = def.fields as readonly string[];
        const help = "help" in def ? def.help : undefined;
        return (
          <div key={i} className="flex flex-wrap items-center gap-2 border border-line bg-bg/50 p-2">
            <select className="select w-auto" value={r.type} onChange={(e) => update(i, { type: e.target.value as Row["type"] })}>
              {ABILITY_EFFECT_DEFS.map((d) => <option key={d.type} value={d.type}>{d.label}</option>)}
            </select>
            {fields.includes("checkType") && (
              <select className="select w-auto" value={r.checkType ?? ""} onChange={(e) => update(i, { checkType: (e.target.value || null) as Row["checkType"] })}>
                <option value="">모든 판정</option>
                {CHECK_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            )}
            {fields.includes("value") && <label className="flex items-center gap-1 text-xs">+<input type="number" className="input mono w-20" value={r.value} onChange={(e) => update(i, { value: Number(e.target.value) })} /></label>}
            {fields.includes("perDay") && <label className="flex items-center gap-1 text-xs">하루 <input type="number" min={1} className="input mono w-20" value={r.perDay} onChange={(e) => update(i, { perDay: Number(e.target.value) })} /> 회</label>}
            {fields.includes("note") && <input type="text" className="input min-w-[10rem] flex-1" placeholder="설명" value={r.note} onChange={(e) => update(i, { note: e.target.value })} />}
            {help && <span className="help">{help}</span>}
            <button type="button" className="btn btn-ghost btn-sm ml-auto text-danger" onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))}>제거</button>
          </div>
        );
      })}
      <button type="button" className="btn btn-sm self-start" onClick={() => setRows((rs) => [...rs, { type: "CHECK_BONUS", checkType: null, value: 1, perDay: 1, note: "" }])}>+ 효과 추가</button>
    </div>
  );
}
