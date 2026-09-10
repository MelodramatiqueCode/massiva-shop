import type { Venue, VenueTier } from "./types";

/** Where daily/hourly footfall estimates come from. */
export type FootfallMode = "model" | "provider";

export const FOOTFALL_MODE_LABEL: Record<FootfallMode, string> = {
  model: "Odhad návštevnosti (model)",
  provider: "Externý provider (zatiaľ model — pripravené na napojenie)",
};

/** City size proxy for SK (relative to national baseline 1.0). */
const CITY_SIZE: Record<string, number> = {
  Bratislava: 1.45,
  Košice: 1.22,
  Prešov: 1.08,
  Žilina: 1.05,
  "Banská Bystrica": 1.02,
  Nitra: 1.0,
  Trnava: 0.98,
  Trenčín: 0.96,
  Martin: 0.92,
  Poprad: 0.9,
  Prievidza: 0.88,
  Zvolen: 0.86,
  "Nové Zámky": 0.84,
  Michalovce: 0.84,
  Humenné: 0.8,
  Ružomberok: 0.78,
  "Liptovský Mikuláš": 0.78,
  "Dolný Kubín": 0.72,
  Snina: 0.7,
  Zázrivá: 0.55,
  Párnica: 0.52,
};

const TIER_DAILY: Record<VenueTier, number> = {
  A: 1.28,
  B: 1.0,
  C: 0.72,
};

const TIER_BASE: Record<VenueTier, number> = {
  A: 6200,
  B: 4100,
  C: 2600,
};

/**
 * Typical in-store "Popular times" shape (relative 0–100), grocery / retail SK.
 * Index = hour of day (0–23).
 */
const RETAIL_HOURLY_SHAPE = [
  4, 3, 2, 2, 3, 8, 18, 32, 48, 58, 62, 70, 78, 72, 65, 68, 74, 88, 92, 70, 42,
  22, 12, 6,
];

function hash01(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

function cityMultiplier(city: string): number {
  if (CITY_SIZE[city] != null) return CITY_SIZE[city]!;
  const key = Object.keys(CITY_SIZE).find(
    (c) =>
      city.toLowerCase().includes(c.toLowerCase()) ||
      c.toLowerCase().includes(city.toLowerCase()),
  );
  if (key) return CITY_SIZE[key]!;
  return 0.55 + hash01(city) * 0.35;
}

/** Build 24 hourly popularity scores 0–100 for a venue. */
export function buildHourlyCurve(input: {
  id: string;
  tier: VenueTier;
  isOnline: boolean;
}): number[] {
  const jitter = hash01(input.id);
  const eveningBoost =
    input.tier === "A" ? 1.08 : input.tier === "B" ? 1.0 : 0.94;
  const morningBoost = input.tier === "C" ? 1.06 : 1.0;

  return RETAIL_HOURLY_SHAPE.map((base, hour) => {
    let v = base;
    if (hour >= 7 && hour <= 11) v *= morningBoost;
    if (hour >= 16 && hour <= 19) v *= eveningBoost;
    v *= 0.92 + jitter * 0.16 + Math.sin((hour + jitter * 6) * 0.7) * 0.04;
    if (!input.isOnline) v *= 0.82;
    return Math.max(1, Math.min(100, Math.round(v)));
  });
}

/** Deterministic daily visitor estimate from city + tier + online. */
export function estimateFootfallDaily(input: {
  id: string;
  city: string;
  tier: VenueTier;
  isOnline: boolean;
}): number {
  const base = TIER_BASE[input.tier] * TIER_DAILY[input.tier];
  const city = cityMultiplier(input.city);
  const online = input.isOnline ? 1 : 0.58;
  const noise = 0.9 + hash01(`${input.id}:${input.city}`) * 0.2;
  return Math.round(base * city * online * noise);
}

export type FootfallEstimate = {
  footfallDaily: number;
  footfallHourly: number[];
  footfallMode: FootfallMode;
  peakHour: number;
  label: string;
};

export function estimateVenueFootfall(
  venue: Pick<Venue, "id" | "city" | "tier" | "isOnline">,
  mode: FootfallMode = "model",
): FootfallEstimate {
  const footfallHourly = buildHourlyCurve(venue);
  const footfallDaily = estimateFootfallDaily(venue);
  let peakHour = 0;
  let peakVal = -1;
  for (let h = 0; h < footfallHourly.length; h++) {
    if ((footfallHourly[h] ?? 0) > peakVal) {
      peakVal = footfallHourly[h] ?? 0;
      peakHour = h;
    }
  }
  return {
    footfallDaily,
    footfallHourly,
    footfallMode: mode,
    peakHour,
    label: FOOTFALL_MODE_LABEL[mode],
  };
}

/** Enrich venues with model footfall (pricing + Popular times UI). */
export function applyFootfallModel(
  venues: Venue[],
  mode: FootfallMode = "model",
): Venue[] {
  return venues.map((v) => {
    const est = estimateVenueFootfall(v, mode);
    return {
      ...v,
      footfallDaily: est.footfallDaily,
      footfallHourly: est.footfallHourly,
      footfallMode: mode,
    };
  });
}

export function peakHoursLabel(hourly: number[]): string {
  if (!hourly.length) return "—";
  const max = Math.max(...hourly);
  const peaks = hourly
    .map((v, h) => (v >= max * 0.92 ? h : -1))
    .filter((h) => h >= 0);
  if (!peaks.length) return "—";
  const first = peaks[0]!;
  const last = peaks[peaks.length - 1]!;
  return first === last ? `${first}:00` : `${first}:00–${last + 1}:00`;
}
