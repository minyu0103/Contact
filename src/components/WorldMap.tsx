"use client";

import { useMemo } from "react";
import { geoEquirectangular, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import land from "world-atlas/land-110m.json";

export const MAP_W = 1000;
export const MAP_H = 500;

export type MapMarker = { id: string; x: number; y: number; label: string; progress?: number; active?: boolean };

/**
 * 세계 지도 (Natural Earth 기반 world-atlas 데이터, 퍼블릭 도메인).
 * x, y는 0~100 백분율. 클릭 좌표를 onPick으로 돌려준다.
 */
export function WorldMap({ markers = [], onPick, onMarkerClick, className = "" }: {
  markers?: MapMarker[];
  onPick?: (x: number, y: number) => void;
  onMarkerClick?: (id: string) => void;
  className?: string;
}) {
  const landPath = useMemo(() => {
    const topo = land as unknown as Topology<{ land: GeometryCollection }>;
    const geo = feature(topo, topo.objects.land);
    const projection = geoEquirectangular().fitSize([MAP_W, MAP_H], geo);
    return geoPath(projection)(geo) ?? "";
  }, []);

  return (
    <svg
      viewBox={`0 0 ${MAP_W} ${MAP_H}`}
      className={`block w-full select-none ${onPick ? "cursor-crosshair" : ""} ${className}`}
      onClick={(e) => {
        if (!onPick) return;
        const rect = e.currentTarget.getBoundingClientRect();
        onPick(((e.clientX - rect.left) / rect.width) * 100, ((e.clientY - rect.top) / rect.height) * 100);
      }}
    >
      <defs>
        <pattern id="map-grid" width="50" height="50" patternUnits="userSpaceOnUse">
          <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(114,214,227,0.08)" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width={MAP_W} height={MAP_H} fill="#0a0d12" />
      <rect width={MAP_W} height={MAP_H} fill="url(#map-grid)" />
      <path d={landPath} fill="#172029" stroke="rgba(114,214,227,0.35)" strokeWidth="0.8" />
      {markers.map((m) => {
        const cx = (m.x / 100) * MAP_W;
        const cy = (m.y / 100) * MAP_H;
        return (
          <g key={m.id} transform={`translate(${cx} ${cy})`} className={onMarkerClick ? "cursor-pointer" : ""} onClick={(e) => { if (onMarkerClick) { e.stopPropagation(); onMarkerClick(m.id); } }}>
            <circle r="14" fill="rgba(201,140,255,0.12)" stroke="rgba(201,140,255,0.5)" strokeWidth="1">
              <animate attributeName="r" values="10;18;10" dur="3s" repeatCount="indefinite" />
            </circle>
            <circle r="4" fill={m.active ? "#c98cff" : "#72d6e3"} stroke="#0a0d12" strokeWidth="1.5" />
            <text y="-18" textAnchor="middle" fontSize="12" fill="#e3e9f0" fontWeight="600" style={{ paintOrder: "stroke", stroke: "#0a0d12", strokeWidth: 3 }}>{m.label}</text>
            {m.progress !== undefined && (
              <text y="28" textAnchor="middle" fontSize="10" fill="#94a3b5" fontFamily="monospace" style={{ paintOrder: "stroke", stroke: "#0a0d12", strokeWidth: 3 }}>{m.progress}%</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
