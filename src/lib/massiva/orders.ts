import { DEMO_ACCOUNT } from "./seed";
import { getMassivaClient } from "./client";
import { MIN_CAMPAIGN_DAYS, quoteCampaign } from "./pricing";
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
  const endsAt = ends.toISOString().slice(0, 10);

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
  const account = await api.getAccount(DEMO_ACCOUNT.id);

  const timetable = [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
    dayOfWeek,
    startMinute: 8 * 60,
    endMinute: 20 * 60,
  }));

  const quote = quoteCampaign({
    venues: selected,
    startsAt: input.startsAt,
    endsAt,
    playsPerHour: pkg.playsPerHour,
    timetable,
    account,
    mediaPackage: pkg,
  });

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
    timetable,
    totalPriceEur: quote.totalPriceEur,
    status: "scheduled",
  } satisfies CreateCampaignInput);

  return {
    campaign,
    content,
    package: pkg,
    quote,
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
  packageId?: string;
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
  const account = await api.getAccount(DEMO_ACCOUNT.id);
  const mediaPackage = input.packageId
    ? await api.getPackage(input.packageId)
    : null;

  const quote = quoteCampaign({
    venues: selected,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    playsPerHour: input.playsPerHour,
    timetable: input.timetable,
    account,
    mediaPackage,
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
    packageId: input.packageId,
    totalPriceEur: quote.totalPriceEur,
    status: "scheduled",
  } satisfies CreateCampaignInput);

  return {
    campaign,
    content,
    venues: selected,
    quote,
    contact: {
      name: input.contactName,
      email: input.contactEmail,
      company: input.company,
    },
  };
}
