import type { MassivaId } from "@/lib/massiva/types";

export type ShopUser = {
  id: string;
  email: string;
  name: string;
};

export type OrganizationType = "advertiser" | "chain";

export type Organization = {
  id: string;
  name: string;
  type: OrganizationType;
  status: "pending" | "active" | "suspended";
  massivaAccountId?: MassivaId;
  chainId?: MassivaId;
  createdAt: string;
};

export type Membership = {
  id: string;
  userId: string;
  organizationId: string;
  role: "owner" | "advertiser_buyer" | "chain_admin" | "viewer";
  status: "invited" | "active";
};

export type BillingMode = "paid" | "internal_free";

export type OrderStatus =
  | "draft"
  | "pending_approvals"
  | "partially_approved"
  | "approved"
  | "approved_partial"
  | "rejected"
  | "scheduled";

export type SegmentApprovalStatus = "pending" | "approved" | "rejected";

export type CampaignOrder = {
  id: string;
  name: string;
  advertiserOrgId: string;
  createdByUserId: string;
  massivaAccountId: MassivaId;
  campaignId: MassivaId;
  contentId: MassivaId;
  contractId?: MassivaId;
  billingMode: BillingMode;
  status: OrderStatus;
  totalQuoteEur: number;
  approvedQuoteEur: number;
  startsAt: string;
  endsAt: string;
  playsPerHour: number;
  contactName: string;
  contactEmail: string;
  company?: string;
  createdAt: string;
  updatedAt: string;
};

export type OrderSegment = {
  id: string;
  orderId: string;
  chainId: MassivaId;
  chainName: string;
  venueIds: MassivaId[];
  quoteEur: number;
  approvalStatus: SegmentApprovalStatus;
  approvedByUserId?: string;
  decidedAt?: string;
  rejectionReason?: string;
};
