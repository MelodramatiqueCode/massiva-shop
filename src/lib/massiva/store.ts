import { promises as fs } from "fs";
import path from "path";
import {
  DEMO_ACCOUNT,
  SEED_CAMPAIGNS,
  SEED_CHAINS,
  SEED_CONTENTS,
  SEED_PACKAGES,
  SEED_VENUES,
  buildSeedPlaylogs,
} from "./seed";
import type {
  Account,
  Campaign,
  Chain,
  Content,
  MediaPackage,
  Playlog,
  Venue,
} from "./types";

export type MassivaStore = {
  accounts: Account[];
  chains: Chain[];
  venues: Venue[];
  contents: Content[];
  campaigns: Campaign[];
  playlogs: Playlog[];
  packages: MediaPackage[];
};

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_FILE = path.join(DATA_DIR, "massiva-store.json");

const venueById = Object.fromEntries(SEED_VENUES.map((v) => [v.id, v]));

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
      baseRateEur: v.baseRateEur ?? seed?.baseRateEur ?? 18,
      footfallDaily: v.footfallDaily ?? seed?.footfallDaily ?? 3000,
      tier: v.tier ?? seed?.tier ?? "C",
      occupancyPct: v.occupancyPct ?? seed?.occupancyPct ?? 0.5,
    };
  });
}

function emptySeed(): MassivaStore {
  return {
    accounts: [DEMO_ACCOUNT],
    chains: SEED_CHAINS,
    venues: SEED_VENUES,
    contents: SEED_CONTENTS,
    campaigns: SEED_CAMPAIGNS,
    playlogs: buildSeedPlaylogs(),
    packages: SEED_PACKAGES,
  };
}

export async function readStore(): Promise<MassivaStore> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    const raw = await fs.readFile(STORE_FILE, "utf8");
    const store = JSON.parse(raw) as MassivaStore;
    store.venues = hydrateVenues(store.venues ?? SEED_VENUES);
    store.accounts = store.accounts?.length
      ? store.accounts.map((a) =>
          a.id === DEMO_ACCOUNT.id ? { ...DEMO_ACCOUNT, ...a } : a,
        )
      : [DEMO_ACCOUNT];
    store.packages = SEED_PACKAGES.map((pkg) => {
      const existing = (store.packages ?? []).find((p) => p.id === pkg.id);
      return existing ? { ...pkg, ...existing, discountPct: pkg.discountPct ?? existing.discountPct } : pkg;
    });
    return store;
  } catch {
    const seed = emptySeed();
    await fs.writeFile(STORE_FILE, JSON.stringify(seed, null, 2), "utf8");
    return seed;
  }
}

export async function writeStore(store: MassivaStore): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(STORE_FILE, JSON.stringify(store, null, 2), "utf8");
}

export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
