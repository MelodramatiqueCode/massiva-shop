import { DEMO_ACCOUNT } from "./seed";
import { getMassivaClient } from "./client";
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
