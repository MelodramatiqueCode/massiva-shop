import { cookies } from "next/headers";
import { DEMO_ACCOUNT } from "@/lib/massiva/seed";
import { readStore } from "@/lib/massiva/store";
import {
  DEFAULT_PERSONA_USER_ID,
  SEED_MEMBERSHIPS,
  SEED_ORGANIZATIONS,
  SEED_USERS,
} from "./seed";
import type { Membership, Organization, ShopUser } from "./types";

export const PERSONA_COOKIE = "massiva_shop_persona";

export type ShopSession = {
  user: ShopUser;
  organization: Organization;
  membership: Membership;
  massivaAccountId: string;
  isChainAdmin: boolean;
  isAdvertiser: boolean;
};

export async function getPersonaUserId(): Promise<string> {
  const jar = await cookies();
  const raw = jar.get(PERSONA_COOKIE)?.value;
  if (raw && SEED_USERS.some((u) => u.id === raw)) return raw;
  return DEFAULT_PERSONA_USER_ID;
}

export async function getShopSession(): Promise<ShopSession> {
  const userId = await getPersonaUserId();
  const store = await readStore();

  const users = store.shopUsers?.length ? store.shopUsers : SEED_USERS;
  const orgs = store.organizations?.length
    ? store.organizations
    : SEED_ORGANIZATIONS;
  const memberships = store.memberships?.length
    ? store.memberships
    : SEED_MEMBERSHIPS;

  const user = users.find((u) => u.id === userId) ?? SEED_USERS[0]!;
  const membership =
    memberships.find((m) => m.userId === user.id && m.status === "active") ??
    SEED_MEMBERSHIPS[0]!;
  const organization =
    orgs.find((o) => o.id === membership.organizationId) ??
    SEED_ORGANIZATIONS[0]!;

  return {
    user,
    organization,
    membership,
    massivaAccountId: organization.massivaAccountId || DEMO_ACCOUNT.id,
    isChainAdmin:
      organization.type === "chain" &&
      (membership.role === "chain_admin" || membership.role === "owner"),
    isAdvertiser: organization.type === "advertiser",
  };
}
