"use client";

import { useState } from "react";
import { OUTCOME_EFFECT_DEFS, type OutcomeEffect } from "@/lib/content-types";
import type { EditorOptions } from "./editor-options";

type Row = { type: OutcomeEffect["type"]; value: number; itemId: string; tableId: string; qty: number; rolls: number; text: string; flag: string; sceneId: string; nodeId: string };

function toRows(effects: OutcomeEffect[]): Row[] {
  return effects.map((e) => ({
    type: e.type,
    value: "value" in e ? e.value : 0,
    itemId: "itemId" in e ? e.itemId : "",
    tableId: "tableId" in e ? e.tableId : "",
    qty: "qty" in e ? e.qty : 1,
    rolls: "rolls" in e ? e.rolls : 1,
    text: "text" in e ? e.text : "",
    flag: "flag" in e ? e.flag : "",
    sceneId: "sceneId" in e ? e.sceneId : "",
    nodeId: "nodeId" in e ? e.nodeId : "",
  }));
}

function serialize(rows: Row[]) {
  return rows.map((r) => {
    switch (r.type) {
      case "hp": case "mp": case "erosion": case "points": return { type: r.type, value: Number(r.value) || 0 };
      case "item_gain": case "item_lose": return { type: r.type, itemId: r.itemId, qty: Math.max(1, Number(r.qty) || 1) };
      case "item_drop": return { type: r.type, tableId: r.tableId, rolls: Math.max(1, Number(r.rolls) || 1) };
      case "clue": return { type: r.type, text: r.text, flag: r.flag };
      case "set_flag": return { type: r.type, flag: r.flag };
      case "goto_scene": return { type: r.type, sceneId: r.sceneId };
      case "move": case "reveal": return { type: r.type, nodeId: r.nodeId };
      case "move_back": case "escape": case "seal": return { type: r.type };
    }
  });
}

/** 결과 효과 목록 편집기 (hidden input JSON) */
export function OutcomeEffectsEditor({ name, initial, options }: { name: string; initial: OutcomeEffect[]; options: EditorOptions }) {
  const [rows, setRows] = useState<Row[]>(() => toRows(initial));
  const update = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const num = (i: number, key: "value" | "qty" | "rolls", r: Row, min?: number) => (
    <input type="number" min={min} className="input mono w-20 text-xs" value={r[key]} onChange={(e) => update(i, { [key]: Number(e.target.value) })} />
  );
  return (
    <div className="flex flex-col gap-1.5">
      <input type="hidden" name={name} value={JSON.stringify(serialize(rows))} />
      {rows.map((r, i) => {
        const def = OUTCOME_EFFECT_DEFS.find((d) => d.type === r.type)!;
        return (
          <div key={i} className="flex flex-wrap items-center gap-1.5">
            <select className="select w-auto text-xs" value={r.type} onChange={(e) => update(i, { type: e.target.value as Row["type"] })}>
              {OUTCOME_EFFECT_DEFS.map((d) => <option key={d.type} value={d.type}>{d.label}</option>)}
            </select>
            {(r.type === "hp" || r.type === "mp" || r.type === "erosion" || r.type === "points") && num(i, "value", r)}
            {(r.type === "item_gain" || r.type === "item_lose") && (<>
              <select className="select w-auto text-xs" value={r.itemId} onChange={(e) => update(i, { itemId: e.target.value })}><option value="">아이템 선택</option>{options.items.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select>
              <span className="text-xs text-fg-mute">×</span>{num(i, "qty", r, 1)}
            </>)}
            {r.type === "item_drop" && (<>
              <select className="select w-auto text-xs" value={r.tableId} onChange={(e) => update(i, { tableId: e.target.value })}><option value="">드랍 테이블 선택</option>{options.dropTables.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select>
              <span className="text-xs text-fg-mute">굴림</span>{num(i, "rolls", r, 1)}
            </>)}
            {r.type === "clue" && (<>
              <input className="input min-w-[12rem] flex-1 text-xs" placeholder="단서 텍스트 (탐사기록에 남음)" value={r.text} onChange={(e) => update(i, { text: e.target.value })} />
              <input className="input w-36 text-xs" placeholder="추적 플래그" value={r.flag} onChange={(e) => update(i, { flag: e.target.value })} />
            </>)}
            {r.type === "set_flag" && <input className="input w-40 text-xs" placeholder="플래그 이름" value={r.flag} onChange={(e) => update(i, { flag: e.target.value })} />}
            {r.type === "goto_scene" && <select className="select w-auto text-xs" value={r.sceneId} onChange={(e) => update(i, { sceneId: e.target.value })}><option value="">장면 선택</option>{options.scenes.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select>}
            {(r.type === "move" || r.type === "reveal") && <select className="select w-auto text-xs" value={r.nodeId} onChange={(e) => update(i, { nodeId: e.target.value })}><option value="">노드 선택</option>{options.nodes.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select>}
            {def.help && <span className="help">{def.help}</span>}
            <button type="button" className="btn btn-ghost btn-sm text-danger" onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))}>×</button>
          </div>
        );
      })}
      <button type="button" className="btn btn-sm self-start" onClick={() => setRows((rs) => [...rs, { type: "hp", value: -1, itemId: "", tableId: "", qty: 1, rolls: 1, text: "", flag: "", sceneId: "", nodeId: "" }])}>+ 효과</button>
    </div>
  );
}
