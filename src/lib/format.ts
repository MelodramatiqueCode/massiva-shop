export function formatEur(value: number, fractionDigits = 0) {
  return new Intl.NumberFormat("sk-SK", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("sk-SK").format(value);
}

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat("sk-SK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("sk-SK", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export const STATUS_LABELS: Record<string, string> = {
  draft: "Koncept",
  scheduled: "Naplánovaná",
  live: "Live",
  ended: "Ukončená",
  paused: "Pozastavená",
};

export const CONTRACT_STATUS_LABELS: Record<string, string> = {
  draft: "Koncept",
  sent: "Na podpis",
  signed: "Podpísaná",
  active: "Aktívna",
  expired: "Expirovaná",
  cancelled: "Zrušená",
};
