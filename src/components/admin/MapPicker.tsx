"use client";

import { useState } from "react";
import { WorldMap, type MapMarker } from "@/components/WorldMap";

/** 세계 지도를 클릭해 이계 위치(0~100 백분율)를 고른다. hidden input mapX/mapY로 제출. */
export function MapPicker({ x, y, label, others }: { x: number; y: number; label: string; others: MapMarker[] }) {
  const [pos, setPos] = useState({ x, y });
  return (
    <div>
      <input type="hidden" name="mapX" value={pos.x.toFixed(2)} />
      <input type="hidden" name="mapY" value={pos.y.toFixed(2)} />
      <div className="border border-line">
        <WorldMap markers={[...others, { id: "self", x: pos.x, y: pos.y, label, active: true }]} onPick={(nx, ny) => setPos({ x: nx, y: ny })} />
      </div>
      <p className="help mt-1">지도를 클릭해 위치를 지정합니다. 현재 <span className="mono">{pos.x.toFixed(1)}, {pos.y.toFixed(1)}</span></p>
    </div>
  );
}
