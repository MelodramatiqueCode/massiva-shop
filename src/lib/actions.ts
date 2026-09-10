"use server";

import { redirect } from "next/navigation";
import { placeOrder } from "./massiva/orders";

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
