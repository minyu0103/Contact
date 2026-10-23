"use client";

import { useState } from "react";
import { CATEGORY_OPTIONS, CONDITION_DEFS, EROSION_STAGE_OPTIONS, ABILITY_EFFECT_DEFS, type Condition } from "@/lib/content-types";
import type { EditorOptions } from "./editor-options";

type Row = { type: Condition["type"]; value: string; tagId: string; itemId: string; flag: string };

function toRows(conds: Condition[]): Row[] {
  return conds.map((c) => ({
    type: c.type,
    value: "value" in c ? c.value : "",
    tagId: "tagId" in c ? c.tagId : "",
    itemId: "itemId" in c ? c.itemId : "",
    flag: "flag" in c ? c.flag : "",
  }));
}

function serialize(rows: Row[]) {
  return rows.map((r) => {
    switch (r.type) {
      case "category": return { type: r.type, value: r.value || "COMBAT" };
      case "ability_effect": return { type: r.type, value: r.value || "CHECK_BONUS" };
      case "erosion_stage_at_least": return { type: r.type, value: r.value || "ACTIVE" };
      case "tag": return { type: r.type, tagId: r.tagId };
      case "item": return { type: r.type, itemId: r.itemId };
      case "flag": case "not_flag": return { type: r.type, flag: r.flag };
    }
  });
}

/** 표시 조건 목록 편집기 (hidden input JSON) */
export function ConditionsEditor({ name = "conditions", initial, options }: { name?: string; initial: Condition[]; options: EditorOptions }) {
  const [rows, setRows] = useState<Row[]>(() => toRows(initial));
  const update = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  return (
    <div className="flex flex-col gap-1.5">
      <input type="hidden" name={name} value={JSON.stringify(serialize(rows))} />
      {rows.map((r, i) => (
        <div key={i} className="flex flex-wrap items-center gap-1.5">
          <select className="select w-auto text-xs" value={r.type} onChange={(e) => update(i, { type: e.target.value as Row["type"], value: "" })}>
            {CONDITION_DEFS.map((d) => <option key={d.type} value={d.type}>{d.label}</option>)}
          </select>
          {r.type === "category" && <select className="select w-auto text-xs" value={r.value || "COMBAT"} onChange={(e) => update(i, { value: e.target.value })}>{CATEGORY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>}
          {r.type === "ability_effect" && <select className="select w-auto text-xs" value={r.value || "CHECK_BONUS"} onChange={(e) => update(i, { value: e.target.value })}>{ABILITY_EFFECT_DEFS.map((o) => <option key={o.type} value={o.type}>{o.label}</option>)}</select>}
          {r.type === "erosion_stage_at_least" && <select className="select w-auto text-xs" value={r.value || "ACTIVE"} onChange={(e) => update(i, { value: e.target.value })}>{EROSION_STAGE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>}
          {r.type === "tag" && <select className="select w-auto text-xs" value={r.tagId} onChange={(e) => update(i, { tagId: e.target.value })}><option value="">태그 선택</option>{options.tags.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select>}
          {r.type === "item" && <select className="select w-auto text-xs" value={r.itemId} onChange={(e) => update(i, { itemId: e.target.value })}><option value="">아이템 선택</option>{options.items.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select>}
          {(r.type === "flag" || r.type === "not_flag") && <input className="input w-40 text-xs" placeholder="플래그 이름" value={r.flag} onChange={(e) => update(i, { flag: e.target.value })} />}
          <button type="button" className="btn btn-ghost btn-sm text-danger" onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))}>×</button>
        </div>
      ))}
      <button type="button" className="btn btn-sm self-start" onClick={() => setRows((rs) => [...rs, { type: "category", value: "COMBAT", tagId: "", itemId: "", flag: "" }])}>+ 조건</button>
    </div>
  );
}
