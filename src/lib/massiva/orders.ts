import { DEMO_ACCOUNT } from "./seed";
import { getMassivaClient } from "./client";
import {
  canOrderWithContract,
  contractCoversVenues,
  pricingAccountFromContract,
} from "./contracts";
import { MIN_CAMPAIGN_DAYS, quoteCampaign } from "./pricing";
import { calendarDaysInclusive } from "./timetable";
import type {
  Contract,
  CreateCampaignInput,
  CreateContentInput,
  TimetableInterval,
} from "./types";

export { DEMO_ACCOUNT };

async function requireOrderContract(venueIds: string[]): Promise<Contract> {
  const api = getMassivaClient();
  const contract = await api.getActiveContract(DEMO_ACCOUNT.id);
  if (!canOrderWithContract(contract)) {
    throw new Error(
      "Chýba aktívna zmluva. Podpíšte zmluvu v sekcii Zmluvy a skúste znova.",
    );
  }
  const venues = await api.getVenues();
  const chainById = Object.fromEntries(venues.map((v) => [v.id, v.chainId]));
  if (!contractCoversVenues(contract!, venueIds, chainById)) {
    throw new Error(
      `Zmluva ${contract!.number} nepokrýva vybrané predajne. Skontrolujte rozsah zmluvy.`,
    );
  }
  return contract!;
}

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
  spotStorageKey?: string;
  acceptTerms?: boolean;
}) {
  if (!input.acceptTerms) {
    throw new Error("Potvrďte súhlas so zmluvnými podmienkami.");
  }

  const api = getMassivaClient();
  const pkg = await api.getPackage(input.packageId);
  if (!pkg) throw new Error("Balík neexistuje");

  const contract = await requireOrderContract(pkg.venueIds);

  const ends = new Date(input.startsAt);
  ends.setDate(ends.getDate() + input.days);
  const endsAt = ends.toISOString().slice(0, 10);

  const content = await api.createContent({
    name: input.spotName,
    filename: input.spotFilename,
    durationSec: input.spotDurationSec,
    accountId: DEMO_ACCOUNT.id,
    storageKey:
      input.spotStorageKey || `mock://uploads/${input.spotFilename}`,
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
    account: pricingAccountFromContract(account, contract),
    contract,
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
    contractId: contract.id,
    timetable,
    totalPriceEur: quote.totalPriceEur,
    status: "scheduled",
  } satisfies CreateCampaignInput);

  return {
    campaign,
    content,
    package: pkg,
    contract,
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
  spotStorageKey?: string;
  packageId?: string;
  acceptTerms?: boolean;
  contractId?: string;
}) {
  if (!input.acceptTerms) {
    throw new Error("Potvrďte súhlas so zmluvnými podmienkami.");
  }
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

  let contract: Contract | null = null;
  if (input.contractId) {
    contract = await api.getContract(input.contractId);
  }
  if (!canOrderWithContract(contract)) {
    contract = await requireOrderContract(input.venueIds);
  } else {
    const chainById = Object.fromEntries(venues.map((v) => [v.id, v.chainId]));
    if (!contractCoversVenues(contract!, input.venueIds, chainById)) {
      throw new Error(
        `Zmluva ${contract!.number} nepokrýva vybrané predajne.`,
      );
    }
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
    account: pricingAccountFromContract(account, contract),
    contract,
    mediaPackage,
  });

  const content = await api.createContent({
    name: input.spotName,
    filename: input.spotFilename,
    durationSec: input.spotDurationSec,
    accountId: DEMO_ACCOUNT.id,
    storageKey:
      input.spotStorageKey || `mock://uploads/${input.spotFilename}`,
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
    contractId: contract!.id,
    totalPriceEur: quote.totalPriceEur,
    status: "scheduled",
  } satisfies CreateCampaignInput);

  return {
    campaign,
    content,
    venues: selected,
    contract,
    quote,
    contact: {
      name: input.contactName,
      email: input.contactEmail,
      company: input.company,
    },
  };
}
