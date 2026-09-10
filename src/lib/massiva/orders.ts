import { DEMO_ACCOUNT } from "./seed";
import { getMassivaClient } from "./client";
import { estimateCampaignPrice, MIN_CAMPAIGN_DAYS } from "./pricing";
import { calendarDaysInclusive } from "./timetable";
import type {
  CreateCampaignInput,
  CreateContentInput,
  TimetableInterval,
} from "./types";

export { DEMO_ACCOUNT };

export async function placeOrder(input: {
  packageId: string;
  campaignName: string;
  contactName: string;
  contactEmail: string;
  company?: string;
  startsAt: string;
  days: number;
  spotName: string;
  spotFilename: string;
  spotDurationSec: number;
}) {
  const api = getMassivaClient();
  const pkg = await api.getPackage(input.packageId);
  if (!pkg) throw new Error("Balík neexistuje");

  const ends = new Date(input.startsAt);
  ends.setDate(ends.getDate() + input.days);

  const content = await api.createContent({
    name: input.spotName,
    filename: input.spotFilename,
    durationSec: input.spotDurationSec,
    accountId: DEMO_ACCOUNT.id,
    storageKey: `mock://uploads/${input.spotFilename}`,
  } satisfies CreateContentInput);

  const venues = await api.getVenues();
  const selected = venues.filter((v) => pkg.venueIds.includes(v.id));
  const chainIds = [...new Set(selected.map((v) => v.chainId))];

  const campaign = await api.createCampaign({
    name: input.campaignName,
    accountId: DEMO_ACCOUNT.id,
    contentId: content.id,
    venueIds: pkg.venueIds,
    chainIds,
    startsAt: new Date(input.startsAt).toISOString(),
    endsAt: ends.toISOString(),
    playsPerHour: pkg.playsPerHour,
    packageId: pkg.id,
    totalPriceEur: pkg.pricePerDayEur * input.days,
    status: "scheduled",
  } satisfies CreateCampaignInput);

  return {
    campaign,
    content,
    package: pkg,
    contact: {
      name: input.contactName,
      email: input.contactEmail,
      company: input.company,
    },
  };
}

export async function placeCustomCampaign(input: {
  venueIds: string[];
  campaignName: string;
  contactName: string;
  contactEmail: string;
  company?: string;
  startsAt: string;
  endsAt: string;
  playsPerHour: number;
  timetable: TimetableInterval[];
  weekdayCount: number;
  windowHours: number;
  spotName: string;
  spotFilename: string;
  spotDurationSec: number;
}) {
  if (input.venueIds.length < 1) {
    throw new Error("Vyber aspoň jednu predajňu na mape.");
  }
  if (input.timetable.length < 1) {
    throw new Error("Vyber dni a aspoň jedno platné časové okno.");
  }

  const days = calendarDaysInclusive(input.startsAt, input.endsAt);
  if (days < MIN_CAMPAIGN_DAYS) {
    throw new Error(`Obdobie musí mať aspoň ${MIN_CAMPAIGN_DAYS} dni.`);
  }
  if (new Date(input.endsAt) < new Date(input.startsAt)) {
    throw new Error("Dátum do musí byť po dátume od.");
  }

  const api = getMassivaClient();
  const venues = await api.getVenues();
  const selected = venues.filter((v) => input.venueIds.includes(v.id));
  if (selected.length !== input.venueIds.length) {
    throw new Error("Niektoré predajne neexistujú.");
  }

  const chainIds = [...new Set(selected.map((v) => v.chainId))];
  const totalPriceEur = estimateCampaignPrice({
    venueCount: selected.length,
    days,
    playsPerHour: input.playsPerHour,
    weekdayCount: input.weekdayCount,
    windowHours: input.windowHours,
  });

  const content = await api.createContent({
    name: input.spotName,
    filename: input.spotFilename,
    durationSec: input.spotDurationSec,
    accountId: DEMO_ACCOUNT.id,
    storageKey: `mock://uploads/${input.spotFilename}`,
  } satisfies CreateContentInput);

  const campaign = await api.createCampaign({
    name: input.campaignName,
    accountId: DEMO_ACCOUNT.id,
    contentId: content.id,
    venueIds: selected.map((v) => v.id),
    chainIds,
    startsAt: new Date(`${input.startsAt}T00:00:00`).toISOString(),
    endsAt: new Date(`${input.endsAt}T23:59:59`).toISOString(),
    playsPerHour: input.playsPerHour,
    timetable: input.timetable,
    totalPriceEur,
    status: "scheduled",
  } satisfies CreateCampaignInput);

  return {
    campaign,
    content,
    venues: selected,
    contact: {
      name: input.contactName,
      email: input.contactEmail,
      company: input.company,
    },
  };
}
