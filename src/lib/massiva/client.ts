import { mapServisListToChainsAndVenues } from "@/lib/shop/servislist-inventory";
import { newId, readStore, writeStore, type VenueSource } from "./store";
import { pickActiveContract } from "./contracts";
import type {
  Account,
  Campaign,
  Chain,
  Content,
  Contract,
  ContractStatus,
  CreateCampaignInput,
  CreateContentInput,
  MediaPackage,
  Playlog,
  SearchQuery,
  UpdateCampaignInput,
  Venue,
  VenueDayOccupancy,
} from "./types";

async function catalogFromSource(): Promise<{
  venues: Venue[];
  chains: Chain[];
  source: VenueSource;
}> {
  const store = await readStore();
  if (store.venueSource === "servislist") {
    try {
      const mapped = mapServisListToChainsAndVenues();
      return {
        venues: mapped.venues,
        chains: mapped.chains,
        source: "servislist",
      };
    } catch {
      // Keep mock catalog if ServisList snapshot fails to load.
    }
  }
  return {
    venues: store.venues,
    chains: store.chains,
    source: "mock",
  };
}

/**
 * Massiva client — mock implementation.
 * Swap for HTTP when MASSIVA_API_URL is available; keep this method surface.
 */
export type MassivaClient = {
  getAccounts(): Promise<Account[]>;
  searchAccounts(query: SearchQuery): Promise<Account[]>;
  getAccount(id: string): Promise<Account | null>;

  getContracts(): Promise<Contract[]>;
  searchContracts(query: SearchQuery): Promise<Contract[]>;
  getContract(id: string): Promise<Contract | null>;
  getActiveContract(accountId: string): Promise<Contract | null>;
  updateContractStatus(
    id: string,
    status: ContractStatus,
  ): Promise<Contract | null>;
  signContract(id: string): Promise<Contract | null>;

  getCampaigns(): Promise<Campaign[]>;
  searchCampaigns(query: SearchQuery): Promise<Campaign[]>;
  getCampaign(id: string): Promise<Campaign | null>;
  createCampaign(input: CreateCampaignInput): Promise<Campaign>;
  updateCampaign(
    id: string,
    input: UpdateCampaignInput,
  ): Promise<Campaign | null>;

  getChains(): Promise<Chain[]>;
  searchChains(query: SearchQuery): Promise<Chain[]>;
  getChain(id: string): Promise<Chain | null>;

  getContents(): Promise<Content[]>;
  searchContents(query: SearchQuery): Promise<Content[]>;
  getContent(id: string): Promise<Content | null>;
  createContent(input: CreateContentInput): Promise<Content>;
  updateContent(id: string, input: Partial<Content>): Promise<Content | null>;
  deleteContent(id: string): Promise<boolean>;
  getContentAudio(id: string): Promise<{ url: string } | null>;

  getPlaylogs(): Promise<Playlog[]>;
  searchPlaylogs(query: SearchQuery): Promise<Playlog[]>;
  getPlaylog(id: string): Promise<Playlog | null>;

  getVenues(): Promise<Venue[]>;
  searchVenues(query: SearchQuery): Promise<Venue[]>;
  getVenue(id: string): Promise<Venue | null>;
  getVenueOptions(): Promise<{ regions: string[]; cities: string[] }>;

  getPackages(): Promise<MediaPackage[]>;
  getPackage(id: string): Promise<MediaPackage | null>;
  getVenueOccupancy(venueId: string, date: string): Promise<VenueDayOccupancy>;

  getVenueSource(): Promise<VenueSource>;
  setVenueSource(source: VenueSource): Promise<VenueSource>;
};

function matchQ<T extends object>(
  items: T[],
  q: string | undefined,
  fields: (keyof T)[],
) {
  if (!q?.trim()) return items;
  const needle = q.trim().toLowerCase();
  return items.filter((item) =>
    fields.some((f) => String(item[f] ?? "").toLowerCase().includes(needle)),
  );
}

export const mockMassiva: MassivaClient = {
  async getAccounts() {
    return (await readStore()).accounts;
  },
  async searchAccounts(query) {
    return matchQ(await this.getAccounts(), query.q, [
      "name",
      "email",
      "company",
    ]);
  },
  async getAccount(id) {
    return (await this.getAccounts()).find((a) => a.id === id) ?? null;
  },

  async getContracts() {
    const store = await readStore();
    return [...store.contracts].sort(
      (a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt),
    );
  },
  async searchContracts(query) {
    let list = await this.getContracts();
    if (query.accountId)
      list = list.filter((c) => c.accountId === query.accountId);
    return matchQ(list, query.q, ["number", "title", "id"]);
  },
  async getContract(id) {
    return (await this.getContracts()).find((c) => c.id === id) ?? null;
  },
  async getActiveContract(accountId) {
    const list = await this.getContracts();
    return pickActiveContract(list, accountId);
  },
  async updateContractStatus(id, status) {
    const store = await readStore();
    const idx = store.contracts.findIndex((c) => c.id === id);
    if (idx < 0) return null;
    const now = new Date().toISOString();
    store.contracts[idx] = {
      ...store.contracts[idx],
      status,
      updatedAt: now,
      signedAt:
        status === "signed" || status === "active"
          ? (store.contracts[idx].signedAt ?? now)
          : store.contracts[idx].signedAt,
    };
    await writeStore(store);
    return store.contracts[idx];
  },
  async signContract(id) {
    const store = await readStore();
    const idx = store.contracts.findIndex((c) => c.id === id);
    if (idx < 0) return null;
    const contract = store.contracts[idx];
    if (contract.status === "cancelled" || contract.status === "expired") {
      return null;
    }
    const now = new Date().toISOString();
    store.contracts[idx] = {
      ...contract,
      status: "active",
      signedAt: now,
      updatedAt: now,
    };
    await writeStore(store);
    return store.contracts[idx];
  },

  async getCampaigns() {
    const store = await readStore();
    return [...store.campaigns].sort(
      (a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt),
    );
  },
  async searchCampaigns(query) {
    let list = await this.getCampaigns();
    if (query.accountId)
      list = list.filter((c) => c.accountId === query.accountId);
    if (query.status) list = list.filter((c) => c.status === query.status);
    return matchQ(list, query.q, ["name", "id"]);
  },
  async getCampaign(id) {
    return (await this.getCampaigns()).find((c) => c.id === id) ?? null;
  },
  async createCampaign(input) {
    const store = await readStore();
    const now = new Date().toISOString();
    const campaign: Campaign = {
      id: newId("cmp"),
      name: input.name,
      accountId: input.accountId,
      contentId: input.contentId,
      venueIds: input.venueIds,
      chainIds: input.chainIds ?? [],
      status: input.status ?? "scheduled",
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      playsPerHour: input.playsPerHour,
      timetable: input.timetable ?? [
        { dayOfWeek: 0, startMinute: 480, endMinute: 1260 },
        { dayOfWeek: 1, startMinute: 480, endMinute: 1260 },
        { dayOfWeek: 2, startMinute: 480, endMinute: 1260 },
        { dayOfWeek: 3, startMinute: 480, endMinute: 1260 },
        { dayOfWeek: 4, startMinute: 480, endMinute: 1260 },
        { dayOfWeek: 5, startMinute: 480, endMinute: 1200 },
        { dayOfWeek: 6, startMinute: 540, endMinute: 1080 },
      ],
      packageId: input.packageId,
      contractId: input.contractId,
      totalPriceEur: input.totalPriceEur,
      createdAt: now,
      updatedAt: now,
    };
    store.campaigns.unshift(campaign);
    await writeStore(store);
    return campaign;
  },
  async updateCampaign(id, input) {
    const store = await readStore();
    const idx = store.campaigns.findIndex((c) => c.id === id);
    if (idx < 0) return null;
    store.campaigns[idx] = {
      ...store.campaigns[idx],
      ...input,
      updatedAt: new Date().toISOString(),
    };
    await writeStore(store);
    return store.campaigns[idx];
  },

  async getChains() {
    return (await catalogFromSource()).chains;
  },
  async searchChains(query) {
    return matchQ(await this.getChains(), query.q, ["name"]);
  },
  async getChain(id) {
    return (await this.getChains()).find((c) => c.id === id) ?? null;
  },

  async getContents() {
    return (await readStore()).contents;
  },
  async searchContents(query) {
    let list = await this.getContents();
    if (query.accountId)
      list = list.filter((c) => c.accountId === query.accountId);
    return matchQ(list, query.q, ["name", "filename"]);
  },
  async getContent(id) {
    return (await this.getContents()).find((c) => c.id === id) ?? null;
  },
  async createContent(input) {
    const store = await readStore();
    const content: Content = {
      id: newId("cnt"),
      name: input.name,
      filename: input.filename,
      durationSec: input.durationSec,
      accountId: input.accountId,
      createdAt: new Date().toISOString(),
      storageKey: input.storageKey ?? `mock://${input.filename}`,
    };
    store.contents.unshift(content);
    await writeStore(store);
    return content;
  },
  async updateContent(id, input) {
    const store = await readStore();
    const idx = store.contents.findIndex((c) => c.id === id);
    if (idx < 0) return null;
    store.contents[idx] = { ...store.contents[idx], ...input };
    await writeStore(store);
    return store.contents[idx];
  },
  async deleteContent(id) {
    const store = await readStore();
    const before = store.contents.length;
    store.contents = store.contents.filter((c) => c.id !== id);
    await writeStore(store);
    return store.contents.length < before;
  },
  async getContentAudio(id) {
    const content = await this.getContent(id);
    if (!content) return null;
    return { url: content.storageKey };
  },

  async getPlaylogs() {
    const store = await readStore();
    return [...store.playlogs].sort(
      (a, b) => +new Date(b.playedAt) - +new Date(a.playedAt),
    );
  },
  async searchPlaylogs(query) {
    let list = await this.getPlaylogs();
    if (query.campaignId) {
      list = list.filter((p) => p.campaignId === query.campaignId);
    }
    if (query.venueId) list = list.filter((p) => p.venueId === query.venueId);
    return list.slice(0, query.limit ?? 100);
  },
  async getPlaylog(id) {
    return (await this.getPlaylogs()).find((p) => p.id === id) ?? null;
  },

  async getVenues() {
    return (await catalogFromSource()).venues;
  },
  async searchVenues(query) {
    let list = await this.getVenues();
    if (query.chainId) list = list.filter((v) => v.chainId === query.chainId);
    return matchQ(list, query.q, ["name", "city", "address", "region"]);
  },
  async getVenue(id) {
    return (await this.getVenues()).find((v) => v.id === id) ?? null;
  },
  async getVenueOptions() {
    const venues = await this.getVenues();
    return {
      regions: [...new Set(venues.map((v) => v.region))].sort(),
      cities: [...new Set(venues.map((v) => v.city))].sort(),
    };
  },

  async getPackages() {
    return (await readStore()).packages;
  },
  async getPackage(id) {
    return (await this.getPackages()).find((p) => p.id === id) ?? null;
  },
  async getVenueOccupancy(venueId, date) {
    return {
      venueId,
      date,
      occupiedSlots: 12,
      totalSlots: 40,
    };
  },

  async getVenueSource() {
    return (await catalogFromSource()).source;
  },
  async setVenueSource(source) {
    const store = await readStore();
    store.venueSource = source === "servislist" ? "servislist" : "mock";
    await writeStore(store);
    return store.venueSource;
  },
};

export function getMassivaClient(): MassivaClient {
  return mockMassiva;
}
