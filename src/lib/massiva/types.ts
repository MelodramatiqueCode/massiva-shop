/** Types aligned with Massiva API Draft (+ shop packages). */

export type MassivaId = string;

export type Account = {
  id: MassivaId;
  name: string;
  email: string;
  company?: string;
  createdAt: string;
  /** Contract discount 0–1 (e.g. 0.1 = 10 %). */
  contractDiscountPct?: number;
  /** Minimum allowed cost per play (CPP floor). */
  minCppEur?: number;
};

export type Chain = {
  id: MassivaId;
  name: string;
  venueCount: number;
};

export type VenueTier = "A" | "B" | "C";

export type Venue = {
  id: MassivaId;
  name: string;
  city: string;
  address: string;
  chainId: MassivaId;
  region: string;
  isOnline: boolean;
  lat: number;
  lng: number;
  /** Base rate EUR / venue / full day (~8h reference). */
  baseRateEur: number;
  /** Estimated daily store visitors. */
  footfallDaily: number;
  tier: VenueTier;
  /** 0–1 typical slot occupancy (busier = more expensive). */
  occupancyPct: number;
};

export type Content = {
  id: MassivaId;
  name: string;
  filename: string;
  durationSec: number;
  accountId: MassivaId;
  createdAt: string;
  storageKey: string;
};

export type CampaignStatus =
  | "draft"
  | "scheduled"
  | "live"
  | "ended"
  | "paused";

export type TimetableInterval = {
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
};

export type Campaign = {
  id: MassivaId;
  name: string;
  accountId: MassivaId;
  contentId: MassivaId;
  venueIds: MassivaId[];
  chainIds: MassivaId[];
  status: CampaignStatus;
  startsAt: string;
  endsAt: string;
  playsPerHour: number;
  timetable: TimetableInterval[];
  packageId?: string;
  totalPriceEur: number;
  createdAt: string;
  updatedAt: string;
};

export type Playlog = {
  id: MassivaId;
  campaignId: MassivaId;
  contentId: MassivaId;
  venueId: MassivaId;
  playedAt: string;
};

export type VenueDayOccupancy = {
  venueId: MassivaId;
  date: string;
  occupiedSlots: number;
  totalSlots: number;
};

export type CreateContentInput = {
  name: string;
  filename: string;
  durationSec: number;
  accountId: MassivaId;
  storageKey?: string;
};

export type CreateCampaignInput = {
  name: string;
  accountId: MassivaId;
  contentId: MassivaId;
  venueIds: MassivaId[];
  chainIds?: MassivaId[];
  startsAt: string;
  endsAt: string;
  playsPerHour: number;
  timetable?: TimetableInterval[];
  packageId?: string;
  totalPriceEur: number;
  status?: CampaignStatus;
};

export type UpdateCampaignInput = Partial<
  Omit<Campaign, "id" | "createdAt" | "accountId">
>;

export type SearchQuery = {
  q?: string;
  accountId?: string;
  campaignId?: string;
  chainId?: string;
  venueId?: string;
  status?: CampaignStatus;
  limit?: number;
};

export type MediaPackage = {
  id: string;
  name: string;
  tagline: string;
  region: string;
  venueIds: MassivaId[];
  playsPerHour: number;
  pricePerDayEur: number;
  minDays: number;
  featured?: boolean;
  /** Package discount 0–1. */
  discountPct?: number;
};
