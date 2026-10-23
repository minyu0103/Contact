"use client";

import { useRouter } from "next/navigation";
import { WorldMap, type MapMarker } from "@/components/WorldMap";

export function MapClient({ markers }: { markers: MapMarker[] }) {
  const router = useRouter();
  return <WorldMap markers={markers} onMarkerClick={(id) => router.push(`/map/${id}`)} />;
}
