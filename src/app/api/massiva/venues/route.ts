import { NextResponse } from "next/server";
import { getMassivaClient } from "@/lib/massiva/client";

/** GET /api/massiva/venues — mirrors Massiva GET /venues */
export async function GET() {
  const venues = await getMassivaClient().getVenues();
  return NextResponse.json({ data: venues });
}
