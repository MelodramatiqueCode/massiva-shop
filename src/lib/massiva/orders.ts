import { DEMO_ACCOUNT } from "./seed";
import { getMassivaClient } from "./client";
import { estimateCampaignPrice, MIN_CAMPAIGN_DAYS } from "./pricing";
import type { CreateCampaignInput, CreateContentInput } from "./types";

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
  days: number;
  playsPerHour: number;
  spotName: string;
  spotFilename: string;
  spotDurationSec: number;
}) {
  if (input.venueIds.length < 1) {
    throw new Error("Vyber aspoň jednu predajňu na mape.");
  }
  if (input.days < MIN_CAMPAIGN_DAYS) {
    throw new Error(`Minimum je ${MIN_CAMPAIGN_DAYS} dní.`);
  }

  const api = getMassivaClient();
  const venues = await api.getVenues();
  const selected = venues.filter((v) => input.venueIds.includes(v.id));
  if (selected.length !== input.venueIds.length) {
    throw new Error("Niektoré predajne neexistujú.");
  }

  const ends = new Date(input.startsAt);
  ends.setDate(ends.getDate() + input.days);
  const chainIds = [...new Set(selected.map((v) => v.chainId))];
  const totalPriceEur = estimateCampaignPrice({
    venueCount: selected.length,
    days: input.days,
    playsPerHour: input.playsPerHour,
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
    startsAt: new Date(input.startsAt).toISOString(),
    endsAt: ends.toISOString(),
    playsPerHour: input.playsPerHour,
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
