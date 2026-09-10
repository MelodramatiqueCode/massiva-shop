"use client";

import { useEffect, useMemo } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import type { Venue } from "@/lib/massiva/types";
import "leaflet/dist/leaflet.css";

type Props = {
  venues: Venue[];
  selectedIds: string[];
  onToggle: (id: string) => void;
};

function markerIcon(selected: boolean, online: boolean) {
  const fill = selected ? "#c8f54a" : online ? "#1f6b5c" : "#e2a33a";
  const stroke = selected ? "#071512" : "#ffffff";
  const svg = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
      <path fill="${fill}" stroke="${stroke}" stroke-width="2" d="M14 1c-7 0-13 5.5-13 12.5 0 9.5 13 21.5 13 21.5s13-12 13-21.5C27 6.5 21 1 14 1z"/>
      <circle cx="14" cy="13" r="4.5" fill="${selected ? "#071512" : "#fff"}"/>
    </svg>`,
  );
  return L.icon({
    iconUrl: `data:image/svg+xml,${svg}`,
    iconSize: [28, 36],
    iconAnchor: [14, 34],
    popupAnchor: [0, -30],
  });
}

function FitSelected({ venues, selectedIds }: { venues: Venue[]; selectedIds: string[] }) {
  const map = useMap();
  const key = selectedIds.slice().sort().join(",");

  useEffect(() => {
    const points = venues.filter((v) => selectedIds.includes(v.id));
    if (points.length === 0) {
      map.setView([48.7, 19.5], 7);
      return;
    }
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 11);
      return;
    }
    const bounds = L.latLngBounds(points.map((v) => [v.lat, v.lng] as [number, number]));
    map.fitBounds(bounds.pad(0.25));
  }, [key, map, venues, selectedIds]);

  return null;
}

export function VenueMap({ venues, selectedIds, onToggle }: Props) {
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  return (
    <div className="venue-map">
      <MapContainer
        center={[48.7, 19.5]}
        zoom={7}
        className="h-full w-full"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitSelected venues={venues} selectedIds={selectedIds} />
        {venues.map((v) => {
          const selected = selectedSet.has(v.id);
          return (
            <Marker
              key={v.id}
              position={[v.lat, v.lng]}
              icon={markerIcon(selected, v.isOnline)}
              eventHandlers={{
                click: () => onToggle(v.id),
              }}
            >
              <Popup>
                <div className="space-y-1 text-sm">
                  <strong>{v.name}</strong>
                  <div>
                    {v.city} · {v.region}
                  </div>
                  <button
                    type="button"
                    className="mt-1 font-semibold underline"
                    onClick={() => onToggle(v.id)}
                  >
                    {selected ? "Odobrať z kampane" : "Pridať do kampane"}
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
