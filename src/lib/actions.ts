"use server";

import { redirect } from "next/navigation";
import { placeCustomCampaign, placeOrder } from "./massiva/orders";

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
  const days = Number(formData.get("days") || 0);
  const playsPerHour = Number(formData.get("playsPerHour") || 2);
  const spotName = String(formData.get("spotName") || "").trim();
  const spotFilename = String(formData.get("spotFilename") || "spot.mp3").trim();
  const spotDurationSec = Number(formData.get("spotDurationSec") || 30);

  if (
    venueIds.length < 1 ||
    !campaignName ||
    !contactName ||
    !contactEmail ||
    !startsAt ||
    days < 1
  ) {
    throw new Error("Vyber predajne na mape a vyplň povinné polia.");
  }

  const result = await placeCustomCampaign({
    venueIds,
    campaignName,
    contactName,
    contactEmail,
    company: company || undefined,
    startsAt,
    days,
    playsPerHour,
    spotName: spotName || campaignName,
    spotFilename,
    spotDurationSec,
  });

  redirect(`/kampane/${result.campaign.id}?objednane=1`);
}
