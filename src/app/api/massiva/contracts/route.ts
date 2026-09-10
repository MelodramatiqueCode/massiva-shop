import { NextResponse } from "next/server";
import { getMassivaClient } from "@/lib/massiva/client";
import { DEMO_ACCOUNT } from "@/lib/massiva/seed";

export async function GET() {
  const api = getMassivaClient();
  const contracts = await api.searchContracts({ accountId: DEMO_ACCOUNT.id });
  const active = await api.getActiveContract(DEMO_ACCOUNT.id);
  return NextResponse.json({ contracts, active });
}
