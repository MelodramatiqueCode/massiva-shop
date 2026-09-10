"use client";

import { useMemo, useState } from "react";
import { FOOTFALL_MODE_LABEL } from "@/lib/massiva/footfall-model";
import type { Chain, Venue } from "@/lib/massiva/types";
import { PopularTimesChart } from "@/components/popular-times-chart";

type Props = {
  venues: Venue[];
  chains: Chain[];
  sourceLabel: string;
};

export function VenuesFootfallList({ venues, chains, sourceLabel }: Props) {
  const chainName = useMemo(
    () => Object.fromEntries(chains.map((c) => [c.id, c.name])),
    [chains],
  );
  const [openId, setOpenId] = useState<string | null>(venues[0]?.id ?? null);
  const mode = venues[0]?.footfallMode === "provider" ? "provider" : "model";

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--ink-soft)]">
        {sourceLabel} · {FOOTFALL_MODE_LABEL[mode]}
      </p>

      <section
        className="panel fade-up overflow-hidden"
        style={{ animationDelay: "80ms" }}
      >
        <ul>
          {venues.map((v) => {
            const open = openId === v.id;
            return (
              <li
                key={v.id}
                className="border-t border-[var(--line)] first:border-t-0"
              >
                <button
                  type="button"
                  className="table-row w-full text-left"
                  onClick={() => setOpenId(open ? null : v.id)}
                  aria-expanded={open}
                >
                  <div>
                    <div className="font-bold">{v.name}</div>
                    <div className="text-sm text-[var(--ink-soft)]">
                      {v.address}, {v.city}
                    </div>
                  </div>
                  <div className="text-sm">
                    <div className="font-semibold">
                      {chainName[v.chainId] ?? v.chainId}
                    </div>
                    <div className="text-[var(--ink-soft)]">región {v.region}</div>
                  </div>
                  <div>
                    <span
                      className={`chip ${v.isOnline ? "chip-live" : "chip-warn"}`}
                    >
                      {v.isOnline ? "Online" : "Offline"}
                    </span>
                    <div className="mt-1 text-xs text-[var(--ink-soft)]">
                      tier {v.tier} · {v.baseRateEur} €/deň · ~
                      {v.footfallDaily.toLocaleString("sk-SK")} / deň
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-[var(--teal-deep)]">
                    {open ? "Skryť graf" : "Popular times"}
                  </div>
                </button>
                {open ? (
                  <div className="px-4 pb-4 md:px-5">
                    <PopularTimesChart venue={v} />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
