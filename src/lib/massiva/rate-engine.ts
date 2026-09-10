import type {
  Account,
  MediaPackage,
  TimetableInterval,
  Venue,
} from "./types";
import { calendarDaysInclusive } from "./timetable";

export const BASE_PLAYS_PER_HOUR = 2;
export const MIN_CAMPAIGN_DAYS = 3;
export const MAX_PLAYS_PER_HOUR = 8;
export const BASE_WINDOW_HOURS = 8;
/** Fallback when venue has no rate (legacy store). */
export const PRICE_PER_VENUE_PER_DAY_EUR = 9;
/** Assumed store open hours for footfall share. */
export const STORE_OPEN_HOURS = 12;
/** Share of visitors who hear a spot during window (mock). */
export const HEAR_RATE = 0.18;

export type DaypartBand = {
  label: string;
  startMinute: number;
  endMinute: number;
  multiplier: number;
};

/** Peak / off-peak multipliers (point 4 – daypart). */
export const DAYPART_BANDS: DaypartBand[] = [
  { label: "Ráno", startMinute: 6 * 60, endMinute: 9 * 60, multiplier: 1.15 },
  { label: "Dopopoludnie", startMinute: 9 * 60, endMinute: 12 * 60, multiplier: 1.0 },
  { label: "Obed", startMinute: 12 * 60, endMinute: 14 * 60, multiplier: 1.12 },
  { label: "Popoludnie", startMinute: 14 * 60, endMinute: 17 * 60, multiplier: 1.05 },
  { label: "Večer peak", startMinute: 17 * 60, endMinute: 20 * 60, multiplier: 1.28 },
  { label: "Neskorý večer", startMinute: 20 * 60, endMinute: 22 * 60, multiplier: 0.9 },
];

export type RateEngineInput = {
  venues: Venue[];
  startsAt: string; // YYYY-MM-DD
  endsAt: string;
  playsPerHour: number;
  timetable: TimetableInterval[];
  account?: Account | null;
  mediaPackage?: MediaPackage | null;
};

export type RateEngineQuote = {
  totalPriceEur: number;
  subtotalEur: number;
  estimatedPlays: number;
  estimatedContacts: number;
  pricePerPlayEur: number;
  pricePerContactEur: number;
  activeDays: number;
  windowHours: number;
  weekdayCount: number;
  avgDaypartMultiplier: number;
  avgOccupancyMultiplier: number;
  avgVenueBaseRateEur: number;
  contractDiscountPct: number;
  packageDiscountPct: number;
  cppFloorApplied: boolean;
  minCppEur: number;
  factors: {
    venueBase: boolean;
    cpp: boolean;
    footfall: boolean;
    occupancyDaypart: boolean;
    contractPackage: boolean;
  };
};

function overlapMinutes(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): number {
  const start = Math.max(aStart, bStart);
  const end = Math.min(aEnd, bEnd);
  return Math.max(0, end - start);
}

/** Weighted daypart multiplier for a time window. */
export function daypartMultiplier(startMinute: number, endMinute: number): number {
  if (endMinute <= startMinute) return 1;
  let weighted = 0;
  let covered = 0;
  for (const band of DAYPART_BANDS) {
    const mins = overlapMinutes(startMinute, endMinute, band.startMinute, band.endMinute);
    if (mins <= 0) continue;
    weighted += mins * band.multiplier;
    covered += mins;
  }
  const total = endMinute - startMinute;
  if (covered < total) {
    weighted += (total - covered) * 0.85;
    covered = total;
  }
  return covered > 0 ? weighted / covered : 1;
}

export function occupancyMultiplier(occupancyPct: number): number {
  const occ = Math.min(1, Math.max(0, occupancyPct));
  // 0% free → 0.9×, 100% full → 1.4×
  return 0.9 + occ * 0.5;
}

function enumerateActiveDates(
  startsAt: string,
  endsAt: string,
  weekdays: Set<number>,
): string[] {
  const out: string[] = [];
  const cur = new Date(`${startsAt}T00:00:00`);
  const end = new Date(`${endsAt}T00:00:00`);
  while (cur <= end) {
    // JS: 0=Sun…6=Sat → Massiva: 0=Mon…6=Sun
    const js = cur.getDay();
    const massivaDay = js === 0 ? 6 : js - 1;
    if (weekdays.has(massivaDay)) {
      out.push(cur.toISOString().slice(0, 10));
    }
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

function windowsFromTimetable(timetable: TimetableInterval[]) {
  const byDay = new Map<number, Array<{ startMinute: number; endMinute: number }>>();
  for (const row of timetable) {
    const list = byDay.get(row.dayOfWeek) ?? [];
    list.push({ startMinute: row.startMinute, endMinute: row.endMinute });
    byDay.set(row.dayOfWeek, list);
  }
  return byDay;
}

function dailyWindowHours(
  windows: Array<{ startMinute: number; endMinute: number }>,
): number {
  return (
    windows.reduce(
      (sum, w) => sum + Math.max(0, w.endMinute - w.startMinute),
      0,
    ) / 60
  );
}

/**
 * Full rate engine — all 5 commercial factors:
 * 1) venue base rate / day
 * 2) CPP (price per play + optional floor)
 * 3) footfall → contacts / CPT
 * 4) occupancy + daypart multipliers
 * 5) contract + package discounts
 */
export function quoteCampaign(input: RateEngineInput): RateEngineQuote {
  const playsPerHour = Math.max(1, input.playsPerHour);
  const playFactor = playsPerHour / BASE_PLAYS_PER_HOUR;
  const timetable = input.timetable ?? [];
  const weekdays = new Set(timetable.map((t) => t.dayOfWeek));
  const weekdayCount = weekdays.size || 7;
  const activeDates = enumerateActiveDates(
    input.startsAt,
    input.endsAt,
    weekdays.size ? weekdays : new Set([0, 1, 2, 3, 4, 5, 6]),
  );
  const activeDays = activeDates.length;
  const byDayWindows = windowsFromTimetable(timetable);

  // Representative window hours (max day)
  let windowHours = BASE_WINDOW_HOURS;
  if (byDayWindows.size) {
    windowHours = Math.max(
      0.5,
      ...[...byDayWindows.values()].map((w) => dailyWindowHours(w)),
    );
  }

  let subtotal = 0;
  let daypartWeight = 0;
  let daypartMinutes = 0;
  let occupancyWeight = 0;
  let baseRateSum = 0;

  for (const venue of input.venues) {
    const base = venue.baseRateEur || PRICE_PER_VENUE_PER_DAY_EUR;
    baseRateSum += base;
    const occMult = occupancyMultiplier(venue.occupancyPct ?? 0.5);
    occupancyWeight += occMult;

    for (const date of activeDates) {
      const d = new Date(`${date}T00:00:00`);
      const js = d.getDay();
      const massivaDay = js === 0 ? 6 : js - 1;
      const windows =
        byDayWindows.get(massivaDay) ??
        [{ startMinute: 8 * 60, endMinute: 20 * 60 }];

      for (const w of windows) {
        const hours = Math.max(0, (w.endMinute - w.startMinute) / 60);
        if (hours <= 0) continue;
        const dp = daypartMultiplier(w.startMinute, w.endMinute);
        daypartWeight += dp * (w.endMinute - w.startMinute);
        daypartMinutes += w.endMinute - w.startMinute;
        // Point 1 + 4: base scaled by hours/8, daypart, occupancy, play intensity
        subtotal +=
          base *
          (hours / BASE_WINDOW_HOURS) *
          dp *
          occMult *
          playFactor;
      }
    }
  }

  const contractDiscountPct = Math.min(
    0.5,
    Math.max(0, input.account?.contractDiscountPct ?? 0),
  );
  const packageDiscountPct = Math.min(
    0.5,
    Math.max(0, input.mediaPackage?.discountPct ?? 0),
  );

  let total =
    subtotal * (1 - contractDiscountPct) * (1 - packageDiscountPct);

  const estimatedPlays = Math.round(
    input.venues.length * activeDays * windowHours * playsPerHour,
  );

  // Point 3: footfall contacts during selected windows
  let estimatedContacts = 0;
  for (const venue of input.venues) {
    const footfall = venue.footfallDaily || 3000;
    estimatedContacts +=
      footfall *
      activeDays *
      (windowHours / STORE_OPEN_HOURS) *
      HEAR_RATE;
  }
  estimatedContacts = Math.round(estimatedContacts);

  const minCppEur = input.account?.minCppEur ?? 0;
  let cppFloorApplied = false;
  if (estimatedPlays > 0 && minCppEur > 0) {
    const floorTotal = estimatedPlays * minCppEur;
    if (total < floorTotal) {
      total = floorTotal;
      cppFloorApplied = true;
    }
  }

  const totalPriceEur = Math.round(total);
  const pricePerPlayEur =
    estimatedPlays > 0 ? totalPriceEur / estimatedPlays : 0;
  const pricePerContactEur =
    estimatedContacts > 0 ? totalPriceEur / estimatedContacts : 0;

  return {
    totalPriceEur,
    subtotalEur: Math.round(subtotal),
    estimatedPlays,
    estimatedContacts,
    pricePerPlayEur,
    pricePerContactEur,
    activeDays,
    windowHours,
    weekdayCount,
    avgDaypartMultiplier:
      daypartMinutes > 0 ? daypartWeight / daypartMinutes : 1,
    avgOccupancyMultiplier:
      input.venues.length > 0 ? occupancyWeight / input.venues.length : 1,
    avgVenueBaseRateEur:
      input.venues.length > 0 ? baseRateSum / input.venues.length : 0,
    contractDiscountPct,
    packageDiscountPct,
    cppFloorApplied,
    minCppEur,
    factors: {
      venueBase: true,
      cpp: true,
      footfall: true,
      occupancyDaypart: true,
      contractPackage: true,
    },
  };
}

/** Legacy-compatible wrapper used by older call sites. */
export function estimateCampaignBreakdown(input: {
  venueCount: number;
  days: number;
  playsPerHour: number;
  weekdayCount?: number;
  windowHours?: number;
  venues?: Venue[];
  startsAt?: string;
  endsAt?: string;
  timetable?: TimetableInterval[];
  account?: Account | null;
  mediaPackage?: MediaPackage | null;
}) {
  if (input.venues && input.startsAt && input.endsAt && input.timetable) {
    const q = quoteCampaign({
      venues: input.venues,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      playsPerHour: input.playsPerHour,
      timetable: input.timetable,
      account: input.account,
      mediaPackage: input.mediaPackage,
    });
    return {
      totalPriceEur: q.totalPriceEur,
      estimatedPlays: q.estimatedPlays,
      pricePerPlayEur: q.pricePerPlayEur,
      activeDays: q.activeDays,
      windowHours: q.windowHours,
      estimatedContacts: q.estimatedContacts,
      pricePerContactEur: q.pricePerContactEur,
      quote: q,
    };
  }

  // Fallback approximate (no per-venue rates)
  const venues = Math.max(0, input.venueCount);
  const days = Math.max(0, input.days);
  const playsPerHour = Math.max(1, input.playsPerHour);
  const weekdayCount = Math.min(7, Math.max(1, input.weekdayCount ?? 7));
  const weekdayFactor = weekdayCount / 7;
  const hours = Math.max(0.5, input.windowHours ?? BASE_WINDOW_HOURS);
  const hourFactor = Math.min(1.5, hours / BASE_WINDOW_HOURS);
  const playFactor = playsPerHour / BASE_PLAYS_PER_HOUR;
  const totalPriceEur = Math.round(
    venues *
      days *
      PRICE_PER_VENUE_PER_DAY_EUR *
      playFactor *
      weekdayFactor *
      hourFactor,
  );
  const activeDays = Math.max(0, Math.round(days * weekdayFactor));
  const estimatedPlays = Math.round(
    venues * activeDays * hours * playsPerHour,
  );
  return {
    totalPriceEur,
    estimatedPlays,
    pricePerPlayEur: estimatedPlays > 0 ? totalPriceEur / estimatedPlays : 0,
    activeDays,
    windowHours: hours,
    estimatedContacts: 0,
    pricePerContactEur: 0,
    quote: null as RateEngineQuote | null,
  };
}

export function estimateCampaignPrice(
  input: Parameters<typeof estimateCampaignBreakdown>[0],
) {
  return estimateCampaignBreakdown(input).totalPriceEur;
}

export function windowHoursFromTimetable(
  timetable: Array<{ dayOfWeek: number; startMinute: number; endMinute: number }>,
): number {
  if (!timetable.length) return BASE_WINDOW_HOURS;
  const byDay = new Map<number, number>();
  for (const row of timetable) {
    const minutes = Math.max(0, row.endMinute - row.startMinute);
    byDay.set(row.dayOfWeek, (byDay.get(row.dayOfWeek) ?? 0) + minutes);
  }
  return Math.max(0.5, Math.max(...byDay.values()) / 60);
}

export function weekdayCountFromTimetable(
  timetable: Array<{ dayOfWeek: number }>,
): number {
  return new Set(timetable.map((t) => t.dayOfWeek)).size || 7;
}

export function spanDays(startsAt: string, endsAt: string) {
  return calendarDaysInclusive(startsAt, endsAt);
}
