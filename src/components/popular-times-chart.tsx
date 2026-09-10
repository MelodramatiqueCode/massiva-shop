"use client";

import {
  FOOTFALL_MODE_LABEL,
  peakHoursLabel,
  type FootfallMode,
} from "@/lib/massiva/footfall-model";
import type { Venue } from "@/lib/massiva/types";

type Props = {
  venue: Venue;
  compact?: boolean;
};

export function PopularTimesChart({ venue, compact = false }: Props) {
  const hourly =
    venue.footfallHourly?.length === 24
      ? venue.footfallHourly
      : Array.from({ length: 24 }, () => 8);
  const mode: FootfallMode =
    venue.footfallMode === "provider" ? "provider" : "model";
  const max = Math.max(...hourly, 1);
  const nowHour = new Date().getHours();
  const peak = peakHoursLabel(hourly);

  return (
    <div className={`popular-times ${compact ? "popular-times-compact" : ""}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.06em] text-[var(--ink-soft)]">
            {FOOTFALL_MODE_LABEL[mode]}
          </div>
          <div className="mt-0.5 text-sm font-semibold">
            ~{venue.footfallDaily.toLocaleString("sk-SK")} návštevníkov / deň
            <span className="font-medium text-[var(--ink-soft)]">
              {" "}
              · peak {peak}
            </span>
          </div>
        </div>
        {!venue.isOnline ? (
          <span className="chip chip-warn">Offline (−42 % model)</span>
        ) : null}
      </div>

      <div
        className="popular-times-bars"
        role="img"
        aria-label={`Odhadovaná návštevnosť po hodinách pre ${venue.name}`}
      >
        {hourly.map((value, hour) => {
          const height = Math.max(8, Math.round((value / max) * 100));
          const isNow = hour === nowHour;
          const isPeak = value >= max * 0.92;
          return (
            <div key={hour} className="popular-times-col" title={`${hour}:00 · ${value}`}>
              <div
                className={`popular-times-bar ${isPeak ? "is-peak" : ""} ${isNow ? "is-now" : ""}`}
                style={{ height: `${height}%` }}
              />
              {hour % 3 === 0 || hour === 23 ? (
                <span className="popular-times-label">{hour}</span>
              ) : (
                <span className="popular-times-label popular-times-label-empty" />
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-1 text-[11px] text-[var(--ink-soft)]">
        Popular times (demo) · nie meranie z Google / providera
      </p>
    </div>
  );
}
