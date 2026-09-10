import { promises as fs } from "fs";
import path from "path";
import {
  DEMO_ACCOUNT,
  SEED_CAMPAIGNS,
  SEED_CHAINS,
  SEED_CONTENTS,
  SEED_CONTRACTS,
  SEED_PACKAGES,
  SEED_VENUES,
  buildSeedPlaylogs,
} from "./seed";
import type {
  Account,
  Campaign,
  Chain,
  Content,
  Contract,
  MediaPackage,
  Playlog,
  Venue,
} from "./types";
import type {
  CampaignOrder,
  Membership,
  OrderSegment,
  Organization,
  ShopUser,
} from "@/lib/shop/types";
import {
  SEED_MEMBERSHIPS,
  SEED_ORGANIZATIONS,
  SEED_USERS,
} from "@/lib/shop/seed";

/** Catalog source for venues/chains. Default mock keeps production safe. */
export type VenueSource = "mock" | "servislist";

/** Footfall estimate source. `provider` is a stub until an external API is wired. */
export type FootfallSourceMode = "model" | "provider";

export type MassivaStore = {
  accounts: Account[];
  contracts: Contract[];
  chains: Chain[];
  venues: Venue[];
  contents: Content[];
  campaigns: Campaign[];
  playlogs: Playlog[];
  packages: MediaPackage[];
  shopUsers: ShopUser[];
  organizations: Organization[];
  memberships: Membership[];
  campaignOrders: CampaignOrder[];
  orderSegments: OrderSegment[];
  venueSource: VenueSource;
  /** Default model = synthetic SK footfall. provider = future hook (falls back to model). */
  footfallMode: FootfallSourceMode;
};

/** On Vercel the repo `data/` dir is gitignored + FS is ephemeral — use /tmp. */
const DATA_DIR = process.env.VERCEL
  ? path.join("/tmp", "massiva-shop")
  : path.join(process.cwd(), "data");
const STORE_FILE = path.join(DATA_DIR, "massiva-store.json");

/** Process-local fallback when disk write is unavailable. */
let memoryStore: MassivaStore | null = null;

const venueById = Object.fromEntries(SEED_VENUES.map((v) => [v.id, v]));
const contractById = Object.fromEntries(SEED_CONTRACTS.map((c) => [c.id, c]));

function hydrateVenues(
  venues: Array<Partial<Venue> & { id: string }>,
): Venue[] {
  return venues.map((v) => {
    const seed = venueById[v.id];
    return {
      id: v.id,
      name: v.name ?? seed?.name ?? v.id,
      city: v.city ?? seed?.city ?? "",
      address: v.address ?? seed?.address ?? "",
      chainId: v.chainId ?? seed?.chainId ?? "",
      region: v.region ?? seed?.region ?? "",
      isOnline: v.isOnline ?? seed?.isOnline ?? true,
      lat: typeof v.lat === "number" ? v.lat : (seed?.lat ?? 48.7),
      lng: typeof v.lng === "number" ? v.lng : (seed?.lng ?? 19.5),
      baseRateEur: seed?.baseRateEur ?? v.baseRateEur ?? 9,
      footfallDaily: seed?.footfallDaily ?? v.footfallDaily ?? 3000,
      footfallHourly: Array.isArray(v.footfallHourly)
        ? v.footfallHourly
        : seed?.footfallHourly,
      footfallMode: v.footfallMode === "provider" ? "provider" : "model",
      tier: seed?.tier ?? v.tier ?? "C",
      occupancyPct: seed?.occupancyPct ?? v.occupancyPct ?? 0.5,
    };
  });
}

function hydrateContracts(
  contracts: Array<Partial<Contract> & { id: string }> | undefined,
): Contract[] {
  const existing = contracts ?? [];
  const byId = new Map(existing.map((c) => [c.id, c]));

  const merged = SEED_CONTRACTS.map((seed) => {
    const cur = byId.get(seed.id);
    if (!cur) return seed;
    return { ...seed, ...cur, id: seed.id, number: cur.number ?? seed.number };
  });

  for (const cur of existing) {
    if (!contractById[cur.id] && !merged.some((m) => m.id === cur.id)) {
      merged.push({
        id: cur.id,
        number: cur.number ?? cur.id,
        accountId: cur.accountId ?? DEMO_ACCOUNT.id,
        title: cur.title ?? "Zmluva",
        status: cur.status ?? "draft",
        startsAt: cur.startsAt ?? "2026-01-01",
        endsAt: cur.endsAt ?? "2026-12-31",
        signedAt: cur.signedAt,
        contractDiscountPct: cur.contractDiscountPct ?? 0,
        minCppEur: cur.minCppEur ?? 0,
        chainIds: cur.chainIds ?? [],
        venueIds: cur.venueIds ?? [],
        termsSummary: cur.termsSummary ?? "",
        documentUrl: cur.documentUrl,
        createdAt: cur.createdAt ?? new Date().toISOString(),
        updatedAt: cur.updatedAt ?? new Date().toISOString(),
      });
    }
  }

  return merged;
}

function emptySeed(): MassivaStore {
  return {
    accounts: [DEMO_ACCOUNT],
    contracts: SEED_CONTRACTS,
    chains: SEED_CHAINS,
    venues: SEED_VENUES,
    contents: SEED_CONTENTS,
    campaigns: SEED_CAMPAIGNS,
    playlogs: buildSeedPlaylogs(),
    packages: SEED_PACKAGES,
    shopUsers: SEED_USERS,
    organizations: SEED_ORGANIZATIONS,
    memberships: SEED_MEMBERSHIPS,
    campaignOrders: [],
    orderSegments: [],
    venueSource: "mock",
    footfallMode: "model",
  };
}

function normalizeStore(store: MassivaStore): MassivaStore {
  store.venueSource =
    store.venueSource === "servislist" ? "servislist" : "mock";
  store.footfallMode =
    store.footfallMode === "provider" ? "provider" : "model";
  store.venues = hydrateVenues(store.venues ?? SEED_VENUES);
  store.accounts = store.accounts?.length
    ? store.accounts.map((a) =>
        a.id === DEMO_ACCOUNT.id ? { ...DEMO_ACCOUNT, ...a } : a,
      )
    : [DEMO_ACCOUNT];
  store.contracts = hydrateContracts(store.contracts);
  store.packages = SEED_PACKAGES.map((pkg) => {
    const existing = (store.packages ?? []).find((p) => p.id === pkg.id);
    return existing
      ? {
          ...pkg,
          ...existing,
          discountPct: pkg.discountPct ?? existing.discountPct,
        }
      : pkg;
  });
  store.contents = store.contents?.length ? store.contents : SEED_CONTENTS;
  store.campaigns = store.campaigns?.length ? store.campaigns : SEED_CAMPAIGNS;
  store.playlogs = store.playlogs?.length ? store.playlogs : buildSeedPlaylogs();
  store.chains = store.chains?.length ? store.chains : SEED_CHAINS;
  store.shopUsers = store.shopUsers?.length ? store.shopUsers : SEED_USERS;
  store.organizations = store.organizations?.length
    ? store.organizations
    : SEED_ORGANIZATIONS;
  store.memberships = store.memberships?.length
    ? store.memberships
    : SEED_MEMBERSHIPS;
  store.campaignOrders = store.campaignOrders ?? [];
  store.orderSegments = store.orderSegments ?? [];
  return store;
}

export async function readStore(): Promise<MassivaStore> {
  if (memoryStore) {
    return normalizeStore(structuredClone(memoryStore));
  }

  try {
    const raw = await fs.readFile(STORE_FILE, "utf8");
    const store = normalizeStore(JSON.parse(raw) as MassivaStore);
    memoryStore = structuredClone(store);
    return store;
  } catch {
    const seed = emptySeed();
    memoryStore = structuredClone(seed);
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.writeFile(STORE_FILE, JSON.stringify(seed, null, 2), "utf8");
    } catch {
      // Serverless / read-only FS — keep memory only
    }
    return seed;
  }
}

export async function writeStore(store: MassivaStore): Promise<void> {
  const normalized = normalizeStore(store);
  memoryStore = structuredClone(normalized);
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(
      STORE_FILE,
      JSON.stringify(normalized, null, 2),
      "utf8",
    );
  } catch {
    // Persist in memory for this instance
  }
}

export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
