import { getMassivaClient } from "@/lib/massiva/client";
import { pricingAccountFromContract } from "@/lib/massiva/contracts";
import { quoteCampaign } from "@/lib/massiva/pricing";
import { newId, readStore, writeStore } from "@/lib/massiva/store";
import type {
  Campaign,
  Contract,
  TimetableInterval,
  Venue,
} from "@/lib/massiva/types";
import type { ShopSession } from "./session";
import type {
  BillingMode,
  CampaignOrder,
  OrderSegment,
  OrderStatus,
  SegmentApprovalStatus,
} from "./types";

function parentStatus(segments: OrderSegment[]): OrderStatus {
  if (!segments.length) return "draft";
  const approved = segments.filter((s) => s.approvalStatus === "approved");
  const rejected = segments.filter((s) => s.approvalStatus === "rejected");
  const pending = segments.filter((s) => s.approvalStatus === "pending");
  if (approved.length === segments.length) return "approved";
  if (rejected.length === segments.length) return "rejected";
  if (approved.length > 0 && pending.length === 0) return "approved_partial";
  if (approved.length > 0) return "partially_approved";
  return "pending_approvals";
}

export async function splitQuoteByChain(input: {
  venues: Venue[];
  startsAt: string;
  endsAt: string;
  playsPerHour: number;
  timetable: TimetableInterval[];
  accountId: string;
  contract: Contract | null;
  packageId?: string;
}) {
  const api = getMassivaClient();
  const chains = await api.getChains();
  const names = Object.fromEntries(chains.map((c) => [c.id, c.name]));
  const account = await api.getAccount(input.accountId);
  const mediaPackage = input.packageId
    ? await api.getPackage(input.packageId)
    : null;

  const byChain = new Map<string, Venue[]>();
  for (const venue of input.venues) {
    const list = byChain.get(venue.chainId) ?? [];
    list.push(venue);
    byChain.set(venue.chainId, list);
  }

  return [...byChain.entries()].map(([chainId, venues]) => {
    const quote = quoteCampaign({
      venues,
      startsAt: input.startsAt.slice(0, 10),
      endsAt: input.endsAt.slice(0, 10),
      playsPerHour: input.playsPerHour,
      timetable: input.timetable,
      account: pricingAccountFromContract(account, input.contract),
      contract: input.contract,
      mediaPackage,
    });
    return {
      chainId,
      chainName: names[chainId] ?? chainId,
      venueIds: venues.map((v) => v.id),
      quoteEur: quote.totalPriceEur,
    };
  });
}

export async function createCampaignOrder(input: {
  session: ShopSession;
  campaign: Campaign;
  contract: Contract | null;
  venues: Venue[];
  timetable: TimetableInterval[];
  billingMode: BillingMode;
  contactName: string;
  contactEmail: string;
  company?: string;
  packageId?: string;
}) {
  const parts = await splitQuoteByChain({
    venues: input.venues,
    startsAt: input.campaign.startsAt,
    endsAt: input.campaign.endsAt,
    playsPerHour: input.campaign.playsPerHour,
    timetable: input.timetable,
    accountId: input.session.massivaAccountId,
    contract: input.contract,
    packageId: input.packageId,
  });

  const now = new Date().toISOString();
  const orderId = newId("ord");
  const autoApprove = input.billingMode === "internal_free";

  const segments: OrderSegment[] = parts.map((part) => ({
    id: newId("seg"),
    orderId,
    chainId: part.chainId,
    chainName: part.chainName,
    venueIds: part.venueIds,
    quoteEur: part.quoteEur,
    approvalStatus: (autoApprove
      ? "approved"
      : "pending") as SegmentApprovalStatus,
    approvedByUserId: autoApprove ? input.session.user.id : undefined,
    decidedAt: autoApprove ? now : undefined,
  }));

  const totalQuoteEur = segments.reduce((s, x) => s + x.quoteEur, 0);
  const approvedQuoteEur = segments
    .filter((s) => s.approvalStatus === "approved")
    .reduce((s, x) => s + x.quoteEur, 0);

  const order: CampaignOrder = {
    id: orderId,
    name: input.campaign.name,
    advertiserOrgId: input.session.organization.id,
    createdByUserId: input.session.user.id,
    massivaAccountId: input.session.massivaAccountId,
    campaignId: input.campaign.id,
    contentId: input.campaign.contentId,
    contractId: input.contract?.id,
    billingMode: input.billingMode,
    status: autoApprove ? "scheduled" : parentStatus(segments),
    totalQuoteEur,
    approvedQuoteEur,
    startsAt: input.campaign.startsAt,
    endsAt: input.campaign.endsAt,
    playsPerHour: input.campaign.playsPerHour,
    contactName: input.contactName,
    contactEmail: input.contactEmail,
    company: input.company,
    createdAt: now,
    updatedAt: now,
  };

  const store = await readStore();
  store.campaignOrders = [order, ...(store.campaignOrders ?? [])];
  store.orderSegments = [...segments, ...(store.orderSegments ?? [])];
  await writeStore(store);
  await syncCampaignFromOrder(order.id);
  return { order, segments };
}

export async function getOrderByCampaignId(campaignId: string) {
  const store = await readStore();
  const order =
    (store.campaignOrders ?? []).find((o) => o.campaignId === campaignId) ??
    null;
  if (!order) return null;
  return {
    order,
    segments: (store.orderSegments ?? []).filter((s) => s.orderId === order.id),
  };
}

export async function listPendingApprovals(session: ShopSession) {
  if (!session.isChainAdmin || !session.organization.chainId) return [];
  const store = await readStore();
  const chainId = session.organization.chainId;
  const segments = (store.orderSegments ?? []).filter(
    (s) => s.chainId === chainId && s.approvalStatus === "pending",
  );
  const orders = store.campaignOrders ?? [];
  return segments.map((segment) => ({
    segment,
    order: orders.find((o) => o.id === segment.orderId) ?? null,
  }));
}

async function syncCampaignFromOrder(orderId: string) {
  const store = await readStore();
  const order = (store.campaignOrders ?? []).find((o) => o.id === orderId);
  if (!order) return;

  const segments = (store.orderSegments ?? []).filter(
    (s) => s.orderId === orderId,
  );
  const approved = segments.filter((s) => s.approvalStatus === "approved");
  const approvedVenueIds = approved.flatMap((s) => s.venueIds);
  const approvedChainIds = [...new Set(approved.map((s) => s.chainId))];
  const approvedQuoteEur = approved.reduce((s, x) => s + x.quoteEur, 0);
  const derived = parentStatus(segments);
  const nextStatus: OrderStatus =
    approved.length > 0 &&
    (derived === "approved" || derived === "approved_partial")
      ? "scheduled"
      : derived;

  const idx = store.campaignOrders!.findIndex((o) => o.id === orderId);
  store.campaignOrders![idx] = {
    ...order,
    status: nextStatus,
    approvedQuoteEur,
    updatedAt: new Date().toISOString(),
  };
  await writeStore(store);

  const api = getMassivaClient();
  if (approvedVenueIds.length > 0) {
    await api.updateCampaign(order.campaignId, {
      venueIds: approvedVenueIds,
      chainIds: approvedChainIds,
      totalPriceEur: approvedQuoteEur,
      status: "scheduled",
    });
  } else {
    await api.updateCampaign(order.campaignId, {
      venueIds: segments.flatMap((s) => s.venueIds),
      chainIds: [...new Set(segments.map((s) => s.chainId))],
      totalPriceEur: order.totalQuoteEur,
      status: "draft",
    });
  }
}

export async function decideSegment(input: {
  session: ShopSession;
  segmentId: string;
  decision: "approved" | "rejected";
  rejectionReason?: string;
}) {
  if (!input.session.isChainAdmin || !input.session.organization.chainId) {
    throw new Error("Schvaľovať môžu len chain admini.");
  }

  const store = await readStore();
  const idx = (store.orderSegments ?? []).findIndex(
    (s) => s.id === input.segmentId,
  );
  if (idx < 0) throw new Error("Segment neexistuje.");
  const segment = store.orderSegments![idx]!;
  if (segment.chainId !== input.session.organization.chainId) {
    throw new Error("Tento segment nepatrí vašej sieti.");
  }
  if (segment.approvalStatus !== "pending") {
    throw new Error("Segment už bol rozhodnutý.");
  }

  store.orderSegments![idx] = {
    ...segment,
    approvalStatus: input.decision,
    approvedByUserId: input.session.user.id,
    decidedAt: new Date().toISOString(),
    rejectionReason:
      input.decision === "rejected"
        ? input.rejectionReason?.trim() || "Zamietnuté chain adminom"
        : undefined,
  };
  await writeStore(store);
  await syncCampaignFromOrder(segment.orderId);
  return store.orderSegments![idx]!;
}
