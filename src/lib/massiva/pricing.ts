/** Shop pricing for custom venue selection (mock cenník). */
export const PRICE_PER_VENUE_PER_DAY_EUR = 18;
export const BASE_PLAYS_PER_HOUR = 2;
export const MIN_CAMPAIGN_DAYS = 3;
export const MAX_PLAYS_PER_HOUR = 8;

export function estimateCampaignPrice(input: {
  venueCount: number;
  days: number;
  playsPerHour: number;
}) {
  const venues = Math.max(0, input.venueCount);
  const days = Math.max(0, input.days);
  const plays = Math.max(1, input.playsPerHour);
  const playFactor = plays / BASE_PLAYS_PER_HOUR;
  return Math.round(venues * days * PRICE_PER_VENUE_PER_DAY_EUR * playFactor);
}
