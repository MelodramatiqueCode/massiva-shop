/**
 * Pricing facade — rate engine with all 5 commercial factors.
 * Prefer `quoteCampaign` from `./rate-engine` for new code.
 */
export {
  BASE_PLAYS_PER_HOUR,
  BASE_WINDOW_HOURS,
  DAYPART_BANDS,
  MAX_PLAYS_PER_HOUR,
  MIN_CAMPAIGN_DAYS,
  PRICE_PER_VENUE_PER_DAY_EUR,
  daypartMultiplier,
  estimateCampaignBreakdown,
  estimateCampaignPrice,
  occupancyMultiplier,
  quoteCampaign,
  weekdayCountFromTimetable,
  windowHoursFromTimetable,
  type RateEngineInput,
  type RateEngineQuote,
} from "./rate-engine";
