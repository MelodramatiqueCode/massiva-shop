"use server";

import { redirect } from "next/navigation";
import { placeCustomCampaign, placeOrder } from "./massiva/orders";
import {
  buildTimetable,
  calendarDaysInclusive,
  validateWindows,
  windowHours,
} from "./massiva/timetable";

export async function submitOrderAction(formData: FormData) {
  const packageId = String(formData.get("packageId") || "");
  const campaignName = String(formData.get("campaignName") || "").trim();
  const contactName = String(formData.get("contactName") || "").trim();
  const contactEmail = String(formData.get("contactEmail") || "").trim();
  const company = String(formData.get("company") || "").trim();
  const startsAt = String(formData.get("startsAt") || "");
  const days = Number(formData.get("days") || 0);
  const spotName = String(formData.get("spotName") || "").trim();
  const spotFilename = String(formData.get("spotFilename") || "spot.mp3").trim();
  const spotDurationSec = Number(formData.get("spotDurationSec") || 30);

  if (
    !packageId ||
    !campaignName ||
    !contactName ||
    !contactEmail ||
    !startsAt ||
    days < 1
  ) {
    throw new Error("Vyplň všetky povinné polia.");
  }

  const result = await placeOrder({
    packageId,
    campaignName,
    contactName,
    contactEmail,
    company: company || undefined,
    startsAt,
    days,
    spotName: spotName || campaignName,
    spotFilename,
    spotDurationSec,
  });

  redirect(`/kampane/${result.campaign.id}?objednane=1`);
}

export async function submitCampaignBuilderAction(formData: FormData) {
  const venueIds = String(formData.get("venueIds") || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  const campaignName = String(formData.get("campaignName") || "").trim();
  const contactName = String(formData.get("contactName") || "").trim();
  const contactEmail = String(formData.get("contactEmail") || "").trim();
  const company = String(formData.get("company") || "").trim();
  const startsAt = String(formData.get("startsAt") || "");
  const endsAt = String(formData.get("endsAt") || "");
  const playsPerHour = Number(formData.get("playsPerHour") || 2);
  const spotName = String(formData.get("spotName") || "").trim();
  const spotFilename = String(formData.get("spotFilename") || "spot.mp3").trim();
  const spotDurationSec = Number(formData.get("spotDurationSec") || 30);

  const weekdays = String(formData.get("weekdays") || "")
    .split(",")
    .map((v) => Number(v.trim()))
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);

  let windows: Array<{ start: string; end: string }> = [];
  try {
    windows = JSON.parse(String(formData.get("windows") || "[]")) as Array<{
      start: string;
      end: string;
    }>;
  } catch {
    throw new Error("Neplatné časové okná.");
  }

  if (
    venueIds.length < 1 ||
    !campaignName ||
    !contactName ||
    !contactEmail ||
    !startsAt ||
    !endsAt
  ) {
    throw new Error("Vyber predajne na mape a vyplň povinné polia.");
  }
  if (weekdays.length < 1) {
    throw new Error("Vyber aspoň jeden deň v týždni.");
  }
  const windowError = validateWindows(windows);
  if (windowError) throw new Error(windowError);

  const timetable = buildTimetable(weekdays, windows);
  if (timetable.length < 1) {
    throw new Error("Nepodarilo sa zložiť rozvrh — skontroluj dni a časy.");
  }

  const days = calendarDaysInclusive(startsAt, endsAt);
  if (days < 1) throw new Error("Neplatné obdobie kampane.");

  const result = await placeCustomCampaign({
    venueIds,
    campaignName,
    contactName,
    contactEmail,
    company: company || undefined,
    startsAt,
    endsAt,
    playsPerHour,
    timetable,
    weekdayCount: weekdays.length,
    windowHours: windowHours(windows),
    spotName: spotName || campaignName,
    spotFilename,
    spotDurationSec,
  });

  redirect(`/kampane/${result.campaign.id}?objednane=1`);
}
