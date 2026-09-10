import Link from "next/link";
import { formatDate, formatEur, STATUS_LABELS } from "@/lib/format";
import { getMassivaClient } from "@/lib/massiva/client";

export default async function CampaignsPage() {
  const api = getMassivaClient();
  const campaigns = await api.getCampaigns();

  return (
    <div className="shell space-y-6">
      <section className="fade-up flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold tracking-[-0.04em]">
            Kampane
          </h1>
          <p className="text-[var(--ink-soft)]">
            Massiva campaigns — vytvorené e-shopom alebo seed dátami.
          </p>
        </div>
        <Link href="/baliky" className="btn btn-primary">
          + Nová objednávka
        </Link>
      </section>

      <section className="panel fade-up overflow-hidden" style={{ animationDelay: "80ms" }}>
        {campaigns.length === 0 ? (
          <div className="p-8 text-center text-[var(--ink-soft)]">
            Zatiaľ žiadne kampane.
          </div>
        ) : (
          <ul>
            {campaigns.map((c) => (
              <li key={c.id}>
                <Link href={`/kampane/${c.id}`} className="table-row">
                  <div>
                    <div className="font-bold">{c.name}</div>
                    <div className="text-sm text-[var(--ink-soft)]">{c.id}</div>
                  </div>
                  <div className="text-sm text-[var(--ink-soft)]">
                    {formatDate(c.startsAt)} → {formatDate(c.endsAt)}
                  </div>
                  <div>
                    <span
                      className={`chip ${c.status === "live" ? "chip-live" : ""}`}
                    >
                      {STATUS_LABELS[c.status] ?? c.status}
                    </span>
                  </div>
                  <div className="font-bold">{formatEur(c.totalPriceEur)}</div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
