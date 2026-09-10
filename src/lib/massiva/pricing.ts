/** Shop pricing for custom venue selection (mock cenník). */
export const PRICE_PER_VENUE_PER_DAY_EUR = 18;
export const BASE_PLAYS_PER_HOUR = 2;
export const MIN_CAMPAIGN_DAYS = 3;
export const MAX_PLAYS_PER_HOUR = 8;
export const BASE_WINDOW_HOURS = 8;

export type CampaignEstimateInput = {
  venueCount: number;
  days: number;
  playsPerHour: number;
  /** Number of selected weekdays (1–7). Defaults to 7. */
  weekdayCount?: number;
  /** Total hours per selected day from time windows. Defaults to BASE_WINDOW_HOURS. */
  windowHours?: number;
};

export type CampaignEstimate = {
  totalPriceEur: number;
  estimatedPlays: number;
  pricePerPlayEur: number;
  activeDays: number;
  windowHours: number;
};

export function estimateCampaignBreakdown(
  input: CampaignEstimateInput,
): CampaignEstimate {
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

  // Approximate number of active calendar days in the range.
  const activeDays = Math.max(0, Math.round(days * weekdayFactor));
  const estimatedPlays = Math.max(
    0,
    Math.round(venues * activeDays * hours * playsPerHour),
  );
  const pricePerPlayEur =
    estimatedPlays > 0 ? totalPriceEur / estimatedPlays : 0;

  return {
    totalPriceEur,
    estimatedPlays,
    pricePerPlayEur,
    activeDays,
    windowHours: hours,
  };
}

export function estimateCampaignPrice(input: CampaignEstimateInput) {
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
  const maxMinutes = Math.max(...byDay.values());
  return Math.max(0.5, maxMinutes / 60);
}

export function weekdayCountFromTimetable(
  timetable: Array<{ dayOfWeek: number }>,
): number {
  return new Set(timetable.map((t) => t.dayOfWeek)).size || 7;
}
