"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { submitCampaignBuilderAction } from "@/lib/actions";
import { formatEur } from "@/lib/format";
import {
  BASE_PLAYS_PER_HOUR,
  estimateCampaignPrice,
  MAX_PLAYS_PER_HOUR,
  MIN_CAMPAIGN_DAYS,
  PRICE_PER_VENUE_PER_DAY_EUR,
} from "@/lib/massiva/pricing";
import type { Chain, Venue } from "@/lib/massiva/types";

const VenueMap = dynamic(
  () => import("./venue-map").then((m) => m.VenueMap),
  {
    ssr: false,
    loading: () => (
      <div className="venue-map grid place-items-center text-sm text-[var(--ink-soft)]">
        Načítavam mapu…
      </div>
    ),
  },
);

type Props = {
  venues: Venue[];
  chains: Chain[];
};

export function CampaignBuilder({ venues, chains }: Props) {
  const chainName = useMemo(
    () => Object.fromEntries(chains.map((c) => [c.id, c.name])),
    [chains],
  );
  const regions = useMemo(
    () => [...new Set(venues.map((v) => v.region))].sort(),
    [venues],
  );

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [days, setDays] = useState(MIN_CAMPAIGN_DAYS);
  const [playsPerHour, setPlaysPerHour] = useState(BASE_PLAYS_PER_HOUR);

  const tomorrow = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }, []);

  const visibleVenues = useMemo(
    () =>
      regionFilter === "all"
        ? venues
        : venues.filter((v) => v.region === regionFilter),
    [venues, regionFilter],
  );

  const selectedVenues = useMemo(
    () => venues.filter((v) => selectedIds.includes(v.id)),
    [venues, selectedIds],
  );

  const total = estimateCampaignPrice({
    venueCount: selectedIds.length,
    days,
    playsPerHour,
  });

  function toggle(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function selectVisible() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const v of visibleVenues) next.add(v.id);
      return [...next];
    });
  }

  function clearSelection() {
    setSelectedIds([]);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.35fr_0.95fr]">
      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <label
            className="text-sm font-semibold text-[var(--ink-soft)]"
            htmlFor="region"
          >
            Filter regiónu
          </label>
          <select
            id="region"
            className="rounded-full border border-[var(--line)] bg-white/80 px-3 py-1.5 text-sm"
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
          >
            <option value="all">Celé Slovensko</option>
            {regions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <button type="button" className="btn btn-ghost" onClick={selectVisible}>
            Vybrať viditeľné
          </button>
          <button type="button" className="btn btn-ghost" onClick={clearSelection}>
            Vyčistiť
          </button>
        </div>

        <VenueMap
          venues={visibleVenues}
          selectedIds={selectedIds}
          onToggle={toggle}
        />

        <div className="panel max-h-56 overflow-auto">
          <ul>
            {visibleVenues.map((v) => {
              const active = selectedIds.includes(v.id);
              return (
                <li key={v.id}>
                  <button
                    type="button"
                    onClick={() => toggle(v.id)}
                    className="table-row w-full text-left md:!grid-cols-[1.5fr_1fr_auto]"
                    style={
                      active
                        ? { background: "rgba(200, 245, 74, 0.22)" }
                        : undefined
                    }
                  >
                    <span>
                      <span className="block font-bold">{v.name}</span>
                      <span className="text-sm text-[var(--ink-soft)]">
                        {v.address}, {v.city}
                      </span>
                    </span>
                    <span className="text-sm text-[var(--ink-soft)]">
                      {chainName[v.chainId] ?? v.chainId} · {v.region}
                    </span>
                    <span
                      className={`chip ${active ? "chip-live" : v.isOnline ? "" : "chip-warn"}`}
                    >
                      {active ? "Vybrané" : v.isOnline ? "Online" : "Offline"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <form
        action={submitCampaignBuilderAction}
        className="panel space-y-4 p-5 md:p-6"
      >
        <input type="hidden" name="venueIds" value={selectedIds.join(",")} />

        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-[-0.03em]">
            Builder kampane
          </h2>
          <p className="text-sm text-[var(--ink-soft)]">
            Vyber predajne na mape, nastav termín a spot.
          </p>
        </div>

        <div className="rounded-xl bg-[rgba(200,245,74,0.2)] px-3 py-2 text-sm font-semibold">
          {selectedIds.length} predajní · odhad {formatEur(total)}
        </div>

        {selectedVenues.length > 0 ? (
          <ul className="max-h-28 space-y-1 overflow-auto text-sm text-[var(--ink-soft)]">
            {selectedVenues.map((v) => (
              <li key={v.id}>
                • {v.city} — {v.name}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[var(--ink-soft)]">
            Zatiaľ nič nevybrané — klikni pin na mape alebo riadok v zozname.
          </p>
        )}

        <div className="field">
          <label htmlFor="campaignName">Názov kampane</label>
          <input
            id="campaignName"
            name="campaignName"
            required
            placeholder="napr. Jarný push — vybrané predajne"
            defaultValue="Moja kampaň na mape"
          />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="field">
            <label htmlFor="contactName">Meno</label>
            <input
              id="contactName"
              name="contactName"
              required
              defaultValue="Demo Inzerent"
            />
          </div>
          <div className="field">
            <label htmlFor="contactEmail">E-mail</label>
            <input
              id="contactEmail"
              name="contactEmail"
              type="email"
              required
              defaultValue="demo@example.com"
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="company">Firma</label>
          <input id="company" name="company" defaultValue="Demo Brand s.r.o." />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="field">
            <label htmlFor="startsAt">Začiatok</label>
            <input
              id="startsAt"
              name="startsAt"
              type="date"
              required
              defaultValue={tomorrow}
            />
          </div>
          <div className="field">
            <label htmlFor="days">Počet dní</label>
            <input
              id="days"
              name="days"
              type="number"
              min={MIN_CAMPAIGN_DAYS}
              value={days}
              onChange={(e) =>
                setDays(Number(e.target.value) || MIN_CAMPAIGN_DAYS)
              }
              required
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="playsPerHour">
            Prehratia za hodinu ({playsPerHour}×)
          </label>
          <input
            id="playsPerHour"
            name="playsPerHour"
            type="range"
            min={1}
            max={MAX_PLAYS_PER_HOUR}
            value={playsPerHour}
            onChange={(e) => setPlaysPerHour(Number(e.target.value))}
          />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="field">
            <label htmlFor="spotName">Názov spotu</label>
            <input
              id="spotName"
              name="spotName"
              required
              defaultValue="Reklamný spot"
            />
          </div>
          <div className="field">
            <label htmlFor="spotFilename">Súbor (mock)</label>
            <input
              id="spotFilename"
              name="spotFilename"
              required
              defaultValue="spot-30s.mp3"
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="spotDurationSec">Dĺžka spotu (s)</label>
          <input
            id="spotDurationSec"
            name="spotDurationSec"
            type="number"
            min={5}
            max={120}
            defaultValue={30}
            required
          />
        </div>

        <p className="text-xs text-[var(--ink-soft)]">
          Cenník mock: {formatEur(PRICE_PER_VENUE_PER_DAY_EUR)} / predajňa / deň
          pri {BASE_PLAYS_PER_HOUR}×/hod. Viac prehraní zvyšuje cenu lineárne.
        </p>

        <button
          type="submit"
          className="btn btn-primary w-full"
          disabled={selectedIds.length < 1}
        >
          Vytvoriť kampaň
        </button>
      </form>
    </div>
  );
}
