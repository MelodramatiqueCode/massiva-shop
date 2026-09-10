import Link from "next/link";
import { notFound } from "next/navigation";
import {
  formatCptEur,
  formatDate,
  formatDateTime,
  formatEur,
  formatNumber,
  STATUS_LABELS,
} from "@/lib/format";
import { getMassivaClient } from "@/lib/massiva/client";
import { quoteCampaign } from "@/lib/massiva/pricing";
import { DEMO_ACCOUNT } from "@/lib/massiva/seed";
import { getOrderByCampaignId } from "@/lib/shop/orders";
import { ORDER_STATUS_LABELS, SEGMENT_STATUS_LABELS } from "@/lib/format";
import { summarizeTimetable } from "@/lib/massiva/timetable";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ objednane?: string }>;

export default async function CampaignDetailPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const { objednane } = await searchParams;
  const api = getMassivaClient();

  const campaign = await api.getCampaign(id);
  if (!campaign) notFound();

  const shopOrder = await getOrderByCampaignId(campaign.id);

  const [content, venues, playlogs, pkg, contract] = await Promise.all([
    api.getContent(campaign.contentId),
    api.getVenues(),
    api.searchPlaylogs({ campaignId: campaign.id, limit: 20 }),
    campaign.packageId ? api.getPackage(campaign.packageId) : Promise.resolve(null),
    campaign.contractId
      ? api.getContract(campaign.contractId)
      : api.getActiveContract(campaign.accountId),
  ]);

  const venueMap = Object.fromEntries(venues.map((v) => [v.id, v]));
  const scheduleLines = summarizeTimetable(campaign.timetable ?? []);
  const selected = campaign.venueIds
    .map((id) => venueMap[id])
    .filter(Boolean);
  const account = (await api.getAccount(campaign.accountId)) ?? DEMO_ACCOUNT;
  const quote = quoteCampaign({
    venues: selected,
    startsAt: campaign.startsAt.slice(0, 10),
    endsAt: campaign.endsAt.slice(0, 10),
    playsPerHour: campaign.playsPerHour,
    timetable: campaign.timetable ?? [],
    account,
    contract,
    mediaPackage: pkg,
  });
  const totalPrice = campaign.totalPriceEur || quote.totalPriceEur;

  return (
    <div className="shell space-y-6">
      <section className="fade-up space-y-3">
        <Link href="/kampane" className="text-sm font-semibold text-[var(--teal)]">
          ← Kampane
        </Link>
        {objednane ? (
          <div className="panel border-[rgba(200,245,74,0.55)] bg-[rgba(200,245,74,0.2)] px-4 py-3 text-sm font-semibold">
            Objednávka prijatá. Content + Campaign sú v Massiva mock store.
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <span className={`chip ${campaign.status === "live" ? "chip-live" : ""}`}>
            {STATUS_LABELS[campaign.status] ?? campaign.status}
          </span>
          {pkg ? <span className="chip">{pkg.name}</span> : null}
          {contract ? (
            <Link href={`/zmluvy/${contract.id}`} className="chip">
              {contract.number}
            </Link>
          ) : null}
        </div>
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold tracking-[-0.04em]">
          {campaign.name}
        </h1>
        <p className="text-[var(--ink-soft)]">
          {formatDate(campaign.startsAt)} → {formatDate(campaign.endsAt)} ·{" "}
          {campaign.playsPerHour}× / hod · {formatEur(totalPrice)}
        </p>
      </section>

      <section
        className="fade-up grid grid-cols-2 gap-3 md:grid-cols-4"
        style={{ animationDelay: "60ms" }}
      >
        <div className="stat">
          <span className="text-sm text-[var(--ink-soft)]">Cena kampane</span>
          <strong>{formatEur(totalPrice)}</strong>
        </div>
        <div className="stat">
          <span className="text-sm text-[var(--ink-soft)]">Odhad prehraní</span>
          <strong>{formatNumber(quote.estimatedPlays)}</strong>
        </div>
        <div className="stat">
          <span className="text-sm text-[var(--ink-soft)]">CPP</span>
          <strong>
            {quote.estimatedPlays > 0
              ? formatEur(totalPrice / quote.estimatedPlays, 2)
              : "—"}
          </strong>
        </div>
        <div className="stat">
          <span className="text-sm text-[var(--ink-soft)]">CPT</span>
          <strong>
            {quote.estimatedContacts > 0
              ? formatCptEur(totalPrice / quote.estimatedContacts)
              : "—"}
          </strong>
        </div>
      </section>


      {shopOrder ? (
        <section className="panel fade-up space-y-3 p-5" style={{ animationDelay: "80ms" }}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold">
              Schválenia po sieťach (partial fulfill)
            </h2>
            <span className="chip">
              {ORDER_STATUS_LABELS[shopOrder.order.status] ?? shopOrder.order.status}
            </span>
          </div>
          <p className="text-sm text-[var(--ink-soft)]">
            Požadované {formatEur(shopOrder.order.totalQuoteEur)} · schválené{" "}
            {formatEur(shopOrder.order.approvedQuoteEur)} · billing{" "}
            {shopOrder.order.billingMode === "internal_free" ? "interné (bez platby)" : "platené"}
          </p>
          <ul className="space-y-2 text-sm">
            {shopOrder.segments.map((seg) => (
              <li
                key={seg.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--line)] px-3 py-2"
              >
                <span>
                  <strong>{seg.chainName}</strong> · {seg.venueIds.length} predajní ·{" "}
                  {formatEur(seg.quoteEur)}
                </span>
                <span className="chip">
                  {SEGMENT_STATUS_LABELS[seg.approvalStatus] ?? seg.approvalStatus}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="panel fade-up space-y-2 p-5 text-sm" style={{ animationDelay: "70ms" }}>
        <h2 className="font-[family-name:var(--font-display)] text-lg font-bold">
          Rate engine (5 faktorov)
        </h2>
        <ul className="space-y-1 text-[var(--ink-soft)]">
          <li>
            1. Venue base Ø {formatEur(quote.avgVenueBaseRateEur)}/deň ·{" "}
            {selected.length} predajní
          </li>
          <li>
            2. CPP{" "}
            {quote.estimatedPlays > 0
              ? formatEur(totalPrice / quote.estimatedPlays, 2)
              : "—"}
            {quote.cppFloorApplied
              ? ` · floor ${formatEur(quote.minCppEur, 2)}`
              : ""}
          </li>
          <li>
            3. Footfall ~{formatNumber(quote.estimatedContacts)} kontaktov · CPT{" "}
            {quote.estimatedContacts > 0
              ? formatCptEur(totalPrice / quote.estimatedContacts)
              : "—"}
          </li>
          <li>
            4. Daypart ×{quote.avgDaypartMultiplier.toFixed(2)} · occupancy ×
            {quote.avgOccupancyMultiplier.toFixed(2)}
          </li>
          <li>
            5. Zľavy: zmluva {(quote.contractDiscountPct * 100).toFixed(0)}%
            {contract ? ` (${contract.number})` : ""} · balík{" "}
            {(quote.packageDiscountPct * 100).toFixed(0)}% · subtotal{" "}
            {formatEur(quote.subtotalEur)}
          </li>
        </ul>
      </section>

      <section
        className="fade-up grid gap-4 md:grid-cols-2"
        style={{ animationDelay: "80ms" }}
      >
        <div className="panel space-y-3 p-5">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-bold">
            Spot (Content)
          </h2>
          {content ? (
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--ink-soft)]">Názov</dt>
                <dd className="font-semibold">{content.name}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--ink-soft)]">Súbor</dt>
                <dd className="font-semibold">{content.filename}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--ink-soft)]">Dĺžka</dt>
                <dd className="font-semibold">{content.durationSec}s</dd>
              </div>
              {content.storageKey.startsWith("data:audio") ? (
                <div className="space-y-2 pt-2">
                  <dt className="text-[var(--ink-soft)]">Preview (TTS)</dt>
                  <dd>
                    <audio controls src={content.storageKey} className="w-full" />
                  </dd>
                </div>
              ) : (
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--ink-soft)]">Storage</dt>
                  <dd className="truncate font-mono text-xs">{content.storageKey}</dd>
                </div>
              )}
            </dl>
          ) : (
            <p className="text-sm text-[var(--ink-soft)]">Content nenájdený</p>
          )}
        </div>

        <div className="panel space-y-3 p-5">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-bold">
            Predajne ({campaign.venueIds.length})
          </h2>
          <ul className="space-y-2 text-sm">
            {campaign.venueIds.map((vid) => {
              const v = venueMap[vid];
              return (
                <li key={vid} className="flex justify-between gap-2">
                  <span>{v?.name ?? vid}</span>
                  <span className="text-[var(--ink-soft)]">{v?.city}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="panel fade-up space-y-3 p-5" style={{ animationDelay: "110ms" }}>
        <h2 className="font-[family-name:var(--font-display)] text-xl font-bold">
          Rozvrh vysielania
        </h2>
        {scheduleLines.length === 0 ? (
          <p className="text-sm text-[var(--ink-soft)]">Bez detailného timetable.</p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {scheduleLines.map((line) => (
              <li key={line} className="font-semibold">
                {line}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel fade-up overflow-hidden" style={{ animationDelay: "140ms" }}>
        <div className="border-b border-[var(--line)] px-5 py-4">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-bold">
            Playlogy
          </h2>
          <p className="text-sm text-[var(--ink-soft)]">
            GET /play_logs — mock report prehraní na zariadeniach.
          </p>
        </div>
        {playlogs.length === 0 ? (
          <div className="p-6 text-sm text-[var(--ink-soft)]">
            Zatiaľ žiadne prehratia (nová kampaň ešte nemá seed playlogy).
          </div>
        ) : (
          <ul>
            {playlogs.map((p) => (
              <li key={p.id} className="table-row md:!grid-cols-[1fr_1fr_1fr]">
                <div className="font-semibold">{formatDateTime(p.playedAt)}</div>
                <div className="text-sm">{venueMap[p.venueId]?.name ?? p.venueId}</div>
                <div className="text-sm text-[var(--ink-soft)]">{p.id}</div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
