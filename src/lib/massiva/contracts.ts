import type { Account, Contract, ContractStatus } from "./types";

/** Statuses that allow placing an order (within validity window). */
export const ORDERABLE_CONTRACT_STATUSES: ContractStatus[] = [
  "active",
  "signed",
];

export function isWithinValidity(
  contract: Contract,
  onDate: Date = new Date(),
): boolean {
  const day = onDate.toISOString().slice(0, 10);
  return day >= contract.startsAt && day <= contract.endsAt;
}

export function canOrderWithContract(
  contract: Contract | null | undefined,
  onDate: Date = new Date(),
): boolean {
  if (!contract) return false;
  return (
    ORDERABLE_CONTRACT_STATUSES.includes(contract.status) &&
    isWithinValidity(contract, onDate)
  );
}

/** Prefer contract commercial terms; fall back to account legacy fields. */
export function pricingAccountFromContract(
  account: Account | null | undefined,
  contract: Contract | null | undefined,
): Account | null {
  if (!account && !contract) return null;
  const base: Account = account ?? {
    id: contract!.accountId,
    name: "Account",
    email: "",
    createdAt: contract!.createdAt,
  };
  if (!contract) return base;
  return {
    ...base,
    contractDiscountPct: contract.contractDiscountPct,
    minCppEur: contract.minCppEur,
  };
}

export function pickActiveContract(
  contracts: Contract[],
  accountId: string,
  onDate: Date = new Date(),
): Contract | null {
  const candidates = contracts
    .filter(
      (c) =>
        c.accountId === accountId && canOrderWithContract(c, onDate),
    )
    .sort((a, b) => {
      // Prefer active over signed, then newer number
      const rank = (s: ContractStatus) => (s === "active" ? 0 : 1);
      const d = rank(a.status) - rank(b.status);
      if (d !== 0) return d;
      return b.number.localeCompare(a.number);
    });
  return candidates[0] ?? null;
}

export function contractCoversVenues(
  contract: Contract,
  venueIds: string[],
  venueChainById: Record<string, string>,
): boolean {
  const chains = contract.chainIds ?? [];
  const venues = contract.venueIds ?? [];
  if (chains.length === 0 && venues.length === 0) return true;
  return venueIds.every((id) => {
    if (venues.includes(id)) return true;
    const chainId = venueChainById[id];
    return Boolean(chainId && chains.includes(chainId));
  });
}
