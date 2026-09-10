import { NextResponse } from "next/server";
import { getMassivaClient } from "@/lib/massiva/client";

/** GET /api/massiva/packages — shop-layer packages */
export async function GET() {
  const packages = await getMassivaClient().getPackages();
  return NextResponse.json({ data: packages });
}
