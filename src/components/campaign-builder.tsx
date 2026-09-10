"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { submitCampaignBuilderAction } from "@/lib/actions";
import { formatEur, formatNumber } from "@/lib/format";
import {
  BASE_PLAYS_PER_HOUR,
  MAX_PLAYS_PER_HOUR,
  MIN_CAMPAIGN_DAYS,
  quoteCampaign,
} from "@/lib/massiva/pricing";
import { DEMO_ACCOUNT } from "@/lib/massiva/seed";
import {
  WEEKDAY_OPTIONS,
  buildTimetable,
  calendarDaysInclusive,
  type TimeWindow,
} from "@/lib/massiva/timetable";
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

function defaultEndDate(start: string, minDays: number) {
  const d = new Date(`${start}T00:00:00`);
  d.setDate(d.getDate() + minDays - 1);
  return d.toISOString().slice(0, 10);
}

export function CampaignBuilder({ venues, chains }: Props) {
  const chainName = useMemo(
    () => Object.fromEntries(chains.map((c) => [c.id, c.name])),
    [chains],
  );
  const regions = useMemo(
    () => [...new Set(venues.map((v) => v.region))].sort(),
    [venues],
  );

  const tomorrow = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }, []);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [startsAt, setStartsAt] = useState(tomorrow);
  const [endsAt, setEndsAt] = useState(defaultEndDate(tomorrow, MIN_CAMPAIGN_DAYS));
  const [weekdays, setWeekdays] = useState<number[]>([0, 1, 2, 3, 4]);
  const [windows, setWindows] = useState<TimeWindow[]>([
    { id: "w1", start: "07:00", end: "10:00" },
    { id: "w2", start: "15:00", end: "18:00" },
  ]);
  const [playsPerHour, setPlaysPerHour] = useState(BASE_PLAYS_PER_HOUR);

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

  const spanDays = calendarDaysInclusive(startsAt, endsAt);
  const timetable = useMemo(
    () =>
      buildTimetable(
        weekdays,
        windows.map(({ start, end }) => ({ start, end })),
      ),
    [weekdays, windows],
  );
  const quote = useMemo(
    () =>
      quoteCampaign({
        venues: selectedVenues,
        startsAt,
        endsAt,
        playsPerHour,
        timetable,
        account: DEMO_ACCOUNT,
        mediaPackage: null,
      }),
    [selectedVenues, startsAt, endsAt, playsPerHour, timetable],
  );

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

  function toggleWeekday(day: number) {
    setWeekdays((prev) =>
      prev.includes(day)
        ? prev.filter((d) => d !== day)
        : [...prev, day].sort((a, b) => a - b),
    );
  }

  function updateWindow(id: string, patch: Partial<TimeWindow>) {
    setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, ...patch } : w)));
  }

  function addWindow() {
    setWindows((prev) => [
      ...prev,
      {
        id: `w_${Date.now().toString(36)}`,
        start: "12:00",
        end: "14:00",
      },
    ]);
  }

  function removeWindow(id: string) {
    setWindows((prev) => (prev.length <= 1 ? prev : prev.filter((w) => w.id !== id)));
  }

  const canSubmit =
    selectedIds.length > 0 && weekdays.length > 0 && windows.length > 0 && spanDays >= 1;

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
        <input type="hidden" name="weekdays" value={weekdays.join(",")} />
        <input
          type="hidden"
          name="windows"
          value={JSON.stringify(windows.map(({ start, end }) => ({ start, end })))}
        />

        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-[-0.03em]">
            Builder kampane
          </h2>
          <p className="text-sm text-[var(--ink-soft)]">
            Predajne, obdobie, dni, hodiny a spot.
          </p>
        </div>

        <div className="space-y-3 rounded-xl bg-[rgba(200,245,74,0.2)] px-3 py-3 text-sm">
          <div className="font-semibold">
            {selectedIds.length} predajní · {quote.weekdayCount} dní/týž. ·{" "}
            {quote.windowHours.toFixed(1)} h/deň · Ø base{" "}
            {formatEur(quote.avgVenueBaseRateEur)}
          </div>
          <dl className="grid gap-2 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium text-[var(--ink-soft)]">
                Odhadovaná cena
              </dt>
              <dd className="text-lg font-extrabold tracking-tight">
                {formatEur(quote.totalPriceEur)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-[var(--ink-soft)]">
                Odhad prehraní
              </dt>
              <dd className="text-lg font-extrabold tracking-tight">
                {formatNumber(quote.estimatedPlays)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-[var(--ink-soft)]">
                Cena / prehratie (CPP)
              </dt>
              <dd className="text-lg font-extrabold tracking-tight">
                {quote.estimatedPlays > 0
                  ? formatEur(quote.pricePerPlayEur, 2)
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-[var(--ink-soft)]">
                Cena / kontakt (CPT)
              </dt>
              <dd className="text-lg font-extrabold tracking-tight">
                {quote.estimatedContacts > 0
                  ? formatEur(quote.pricePerContactEur, 2)
                  : "—"}
              </dd>
            </div>
          </dl>
          <ul className="space-y-1 text-xs text-[var(--ink-soft)]">
            <li>
              1. Venue base Ø {formatEur(quote.avgVenueBaseRateEur)}/deň · tiery A/B/C
            </li>
            <li>
              2. CPP {quote.estimatedPlays > 0 ? formatEur(quote.pricePerPlayEur, 2) : "—"}
              {quote.cppFloorApplied
                ? ` · floor ${formatEur(quote.minCppEur, 2)} aktivovaný`
                : quote.minCppEur
                  ? ` · floor ${formatEur(quote.minCppEur, 2)}`
                  : ""}
            </li>
            <li>
              3. Footfall kontakty ~{formatNumber(quote.estimatedContacts)} · CPT{" "}
              {quote.estimatedContacts > 0
                ? formatEur(quote.pricePerContactEur, 2)
                : "—"}
            </li>
            <li>
              4. Daypart ×{quote.avgDaypartMultiplier.toFixed(2)} · occupancy ×
              {quote.avgOccupancyMultiplier.toFixed(2)}
            </li>
            <li>
              5. Zľava zmluva {(quote.contractDiscountPct * 100).toFixed(0)}% · balík{" "}
              {(quote.packageDiscountPct * 100).toFixed(0)}% · subtotal{" "}
              {formatEur(quote.subtotalEur)}
            </li>
          </ul>
        </div>

        {selectedVenues.length > 0 ? (
          <ul className="max-h-24 space-y-1 overflow-auto text-sm text-[var(--ink-soft)]">
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
            <label htmlFor="startsAt">Od dátumu</label>
            <input
              id="startsAt"
              name="startsAt"
              type="date"
              required
              value={startsAt}
              onChange={(e) => {
                const next = e.target.value;
                setStartsAt(next);
                if (next > endsAt) setEndsAt(defaultEndDate(next, MIN_CAMPAIGN_DAYS));
              }}
            />
          </div>
          <div className="field">
            <label htmlFor="endsAt">Do dátumu</label>
            <input
              id="endsAt"
              name="endsAt"
              type="date"
              required
              value={endsAt}
              min={startsAt}
              onChange={(e) => setEndsAt(e.target.value)}
            />
          </div>
        </div>
        <p className="text-xs text-[var(--ink-soft)]">
          Obdobie: {spanDays} dní (min. {MIN_CAMPAIGN_DAYS}).
        </p>

        <div className="space-y-2">
          <div className="text-sm font-semibold text-[var(--ink-soft)]">Dni v týždni</div>
          <div className="flex flex-wrap gap-2">
            {WEEKDAY_OPTIONS.map((d) => {
              const active = weekdays.includes(d.value);
              return (
                <button
                  key={d.value}
                  type="button"
                  className={`day-pill ${active ? "day-pill-active" : ""}`}
                  onClick={() => toggleWeekday(d.value)}
                  aria-pressed={active}
                  title={d.full}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setWeekdays([0, 1, 2, 3, 4])}
            >
              Po–Pi
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setWeekdays([0, 1, 2, 3, 4, 5, 6])}
            >
              Celý týždeň
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setWeekdays([5, 6])}
            >
              Víkend
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-semibold text-[var(--ink-soft)]">
              Časové okná
            </div>
            <button type="button" className="btn btn-ghost" onClick={addWindow}>
              + Okno
            </button>
          </div>
          <div className="space-y-2">
            {windows.map((w) => (
              <div key={w.id} className="flex flex-wrap items-end gap-2">
                <div className="field grow">
                  <label htmlFor={`${w.id}-start`}>Od</label>
                  <input
                    id={`${w.id}-start`}
                    type="time"
                    value={w.start}
                    onChange={(e) => updateWindow(w.id, { start: e.target.value })}
                    required
                  />
                </div>
                <div className="field grow">
                  <label htmlFor={`${w.id}-end`}>Do</label>
                  <input
                    id={`${w.id}-end`}
                    type="time"
                    value={w.end}
                    onChange={(e) => updateWindow(w.id, { end: e.target.value })}
                    required
                  />
                </div>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => removeWindow(w.id)}
                  disabled={windows.length <= 1}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <p className="text-xs text-[var(--ink-soft)]">
            Napr. 07:00–10:00 a 15:00–18:00 — platí pre každý vybraný deň.
          </p>
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
          Rate engine: venue base + daypart/occupancy + footfall CPT + CPP floor +
          zmluvná zľava. Základ sa líši podľa predajne (tier A/B/C).
        </p>

        <button
          type="submit"
          className="btn btn-primary w-full"
          disabled={!canSubmit}
        >
          Vytvoriť kampaň
        </button>
      </form>
    </div>
  );
}
