import inventory from "./servislist-inventory.json";
import type { Chain, Venue, VenueTier } from "@/lib/massiva/types";

export type ServisListDeviceRow = {
  uuid: string;
  name: string;
  code: string;
  partner: string;
  city: string;
  address: string;
  isOnline: boolean;
  fleet?: string;
};

export type ServisListInventory = {
  syncedAt?: string;
  devices: ServisListDeviceRow[];
};

const CITY_COORDS: Record<string, { lat: number; lng: number; region: string }> = {
  Bratislava: { lat: 48.1486, lng: 17.1077, region: "BA" },
  "Liptovský Mikuláš": { lat: 49.0806, lng: 19.6222, region: "ZA" },
  "Banská Bystrica": { lat: 48.7395, lng: 19.1534, region: "BB" },
  Prešov: { lat: 48.9985, lng: 21.2419, region: "PO" },
  Ružomberok: { lat: 49.0816, lng: 19.3164, region: "ZA" },
  Michalovce: { lat: 48.7543, lng: 21.9195, region: "KE" },
  Humenné: { lat: 48.9371, lng: 21.9163, region: "PO" },
  Snina: { lat: 48.9886, lng: 22.152, region: "PO" },
  Zázrivá: { lat: 49.277, lng: 19.166, region: "ZA" },
  Párnica: { lat: 49.2, lng: 19.2, region: "ZA" },
  Slovensko: { lat: 48.7, lng: 19.5, region: "SK" },
};

function slugPartner(partner: string) {
  return partner
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "") || "other";
}

function hashTier(code: string): VenueTier {
  const n = [...code].reduce((s, c) => s + c.charCodeAt(0), 0);
  if (n % 5 === 0) return "A";
  if (n % 3 === 0) return "B";
  return "C";
}

function coordsForCity(city: string) {
  if (CITY_COORDS[city]) return CITY_COORDS[city]!;
  // stable pseudo-coords for unknown cities around SK centroid
  const h = [...city].reduce((s, c) => s + c.charCodeAt(0), 0);
  return {
    lat: 48.3 + (h % 90) / 100,
    lng: 18.5 + (h % 110) / 100,
    region: "SK",
  };
}

function displayName(device: ServisListDeviceRow) {
  const raw = device.name.trim();
  // "1-JTS-PJ099,Zázrivá,Ústredie 153" → prefer readable bits
  if (raw.includes(",")) {
    const parts = raw.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) return `${parts[1]}${parts[2] ? ` · ${parts[2]}` : ""}`;
  }
  return raw || `Predajňa ${device.code || device.uuid.slice(0, 6)}`;
}

export function loadServisListInventory(): ServisListInventory {
  return inventory as ServisListInventory;
}

export function mapServisListToChainsAndVenues(data?: ServisListInventory): {
  chains: Chain[];
  venues: Venue[];
  deviceCount: number;
  syncedAt?: string;
} {
  const inv = data ?? loadServisListInventory();
  const devices = inv.devices ?? [];
  const byPartner = new Map<string, ServisListDeviceRow[]>();

  for (const device of devices) {
    const partner = (device.partner || "OTHER").trim() || "OTHER";
    const list = byPartner.get(partner) ?? [];
    list.push(device);
    byPartner.set(partner, list);
  }

  const chains: Chain[] = [...byPartner.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], "sk"))
    .map(([partner, list]) => ({
      id: `chain_sl_${slugPartner(partner)}`,
      name: partner === "OTHER" ? "Ostatné (ServisList)" : partner,
      venueCount: list.length,
    }));

  const venues: Venue[] = [];
  for (const [partner, list] of byPartner) {
    const chainId = `chain_sl_${slugPartner(partner)}`;
    for (const device of list) {
      const city = device.city || "Slovensko";
      const geo = coordsForCity(city);
      const tier = hashTier(device.code || device.uuid);
      venues.push({
        id: `ven_sl_${device.uuid}`,
        name: displayName(device),
        city,
        address: device.address || city,
        chainId,
        region: geo.region,
        isOnline: Boolean(device.isOnline),
        lat: geo.lat,
        lng: geo.lng,
        baseRateEur: tier === "A" ? 14 : tier === "B" ? 11 : 8,
        footfallDaily: tier === "A" ? 7000 : tier === "B" ? 4500 : 2800,
        tier,
        occupancyPct: tier === "A" ? 0.7 : tier === "B" ? 0.55 : 0.42,
      });
    }
  }

  return {
    chains,
    venues,
    deviceCount: devices.length,
    syncedAt: inv.syncedAt,
  };
}
