import Link from "next/link";
import { getMassivaClient } from "@/lib/massiva/client";

export default async function VenuesPage() {
  const api = getMassivaClient();
  const [venues, chains, source] = await Promise.all([
    api.getVenues(),
    api.getChains(),
    api.getVenueSource(),
  ]);
  const chainName = Object.fromEntries(chains.map((c) => [c.id, c.name]));

  return (
    <div className="shell space-y-6">
      <section className="fade-up space-y-2">
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold tracking-[-0.04em]">
          Predajne
        </h1>
        <p className="text-[var(--ink-soft)]">
          {source === "servislist"
            ? `ServisList inventár — ${venues.length} predajní · ${chains.length} partnerov.`
            : "Massiva mock venues — inventár, na ktorý sa mapujú balíky a kampane."}
        </p>
      </section>

      <section className="panel fade-up overflow-hidden" style={{ animationDelay: "80ms" }}>
        <ul>
          {venues.map((v) => (
            <li key={v.id} className="table-row">
              <div>
                <div className="font-bold">{v.name}</div>
                <div className="text-sm text-[var(--ink-soft)]">
                  {v.address}, {v.city}
                </div>
              </div>
              <div className="text-sm">
                <div className="font-semibold">{chainName[v.chainId] ?? v.chainId}</div>
                <div className="text-[var(--ink-soft)]">región {v.region}</div>
              </div>
              <div>
                <span className={`chip ${v.isOnline ? "chip-live" : "chip-warn"}`}>
                  {v.isOnline ? "Online" : "Offline"}
                </span>
                <div className="mt-1 text-xs text-[var(--ink-soft)]">
                  tier {v.tier} · {v.baseRateEur} €/deň · footfall {v.footfallDaily}
                </div>
              </div>
              <div className="text-sm text-[var(--ink-soft)]">{v.id}</div>
            </li>
          ))}
        </ul>
      </section>

      <Link href="/baliky" className="btn btn-primary">
        Späť na balíky
      </Link>
    </div>
  );
}
