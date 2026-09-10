import { DEMO_ACCOUNT, SEED_CHAINS } from "@/lib/massiva/seed";
import type { Membership, Organization, ShopUser } from "./types";

export const SEED_USERS: ShopUser[] = [
  {
    id: "user_advertiser",
    email: "inzerent@demo.sk",
    name: "Demo Inzerent",
  },
  {
    id: "user_tesco_admin",
    email: "admin@tesco.demo",
    name: "Tesco Chain Admin",
  },
  {
    id: "user_billa_admin",
    email: "admin@billa.demo",
    name: "Billa Chain Admin",
  },
  {
    id: "user_kaufland_admin",
    email: "admin@kaufland.demo",
    name: "Kaufland Chain Admin",
  },
  {
    id: "user_lidl_admin",
    email: "admin@lidl.demo",
    name: "Lidl Chain Admin",
  },
];

export const SEED_ORGANIZATIONS: Organization[] = [
  {
    id: "org_advertiser_demo",
    name: "Demo Brand s.r.o.",
    type: "advertiser",
    status: "active",
    massivaAccountId: DEMO_ACCOUNT.id,
    createdAt: "2026-01-01T10:00:00.000Z",
  },
  ...SEED_CHAINS.map((chain) => ({
    id: `org_${chain.id}`,
    name: `${chain.name} (sieť)`,
    type: "chain" as const,
    status: "active" as const,
    chainId: chain.id,
    createdAt: "2026-01-01T10:00:00.000Z",
  })),
];

export const SEED_MEMBERSHIPS: Membership[] = [
  {
    id: "mem_adv_owner",
    userId: "user_advertiser",
    organizationId: "org_advertiser_demo",
    role: "owner",
    status: "active",
  },
  {
    id: "mem_tesco",
    userId: "user_tesco_admin",
    organizationId: "org_chain_tesco",
    role: "chain_admin",
    status: "active",
  },
  {
    id: "mem_billa",
    userId: "user_billa_admin",
    organizationId: "org_chain_billa",
    role: "chain_admin",
    status: "active",
  },
  {
    id: "mem_kaufland",
    userId: "user_kaufland_admin",
    organizationId: "org_chain_kaufland",
    role: "chain_admin",
    status: "active",
  },
  {
    id: "mem_lidl",
    userId: "user_lidl_admin",
    organizationId: "org_chain_lidl",
    role: "chain_admin",
    status: "active",
  },
];

export const DEFAULT_PERSONA_USER_ID = "user_advertiser";
