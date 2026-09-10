/** Shop pricing for custom venue selection (mock cenník). */
export const PRICE_PER_VENUE_PER_DAY_EUR = 18;
export const BASE_PLAYS_PER_HOUR = 2;
export const MIN_CAMPAIGN_DAYS = 3;
export const MAX_PLAYS_PER_HOUR = 8;
export const BASE_WINDOW_HOURS = 8;

export function estimateCampaignPrice(input: {
  venueCount: number;
  days: number;
  playsPerHour: number;
  /** Number of selected weekdays (1–7). Defaults to 7. */
  weekdayCount?: number;
  /** Total hours per selected day from time windows. Defaults to BASE_WINDOW_HOURS. */
  windowHours?: number;
}) {
  const venues = Math.max(0, input.venueCount);
  const days = Math.max(0, input.days);
  const plays = Math.max(1, input.playsPerHour);
  const playFactor = plays / BASE_PLAYS_PER_HOUR;
  const weekdayFactor = Math.min(1, Math.max(1, input.weekdayCount ?? 7) / 7);
  const hours = Math.max(0.5, input.windowHours ?? BASE_WINDOW_HOURS);
  const hourFactor = Math.min(1.5, hours / BASE_WINDOW_HOURS);
  return Math.round(
    venues * days * PRICE_PER_VENUE_PER_DAY_EUR * playFactor * weekdayFactor * hourFactor,
  );
}
