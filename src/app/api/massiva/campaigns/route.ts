import { NextResponse } from "next/server";
import { getMassivaClient } from "@/lib/massiva/client";

/** GET /api/massiva/campaigns — mirrors Massiva GET /campaigns */
export async function GET() {
  const campaigns = await getMassivaClient().getCampaigns();
  return NextResponse.json({ data: campaigns });
}
