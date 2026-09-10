import Link from "next/link";
import {
  CONTRACT_STATUS_LABELS,
  formatDate,
  formatEur,
} from "@/lib/format";
import { canOrderWithContract } from "@/lib/massiva/contracts";
import { getMassivaClient } from "@/lib/massiva/client";
import { DEMO_ACCOUNT } from "@/lib/massiva/seed";

export default async function ContractsPage() {
  const api = getMassivaClient();
  const contracts = await api.searchContracts({ accountId: DEMO_ACCOUNT.id });
  const active = await api.getActiveContract(DEMO_ACCOUNT.id);

  return (
    <div className="shell space-y-6">
      <section className="fade-up space-y-2">
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold tracking-[-0.04em] md:text-5xl">
          Zmluvy
        </h1>
        <p className="max-w-2xl text-[var(--ink-soft)]">
          Objednávka airtime vyžaduje aktívnu mediálnu zmluvu. Cenníková zľava a
          CPP floor sa berú zo zmluvy, nie z kampane.
        </p>
      </section>

      {active && canOrderWithContract(active) ? (
        <div
          className="panel fade-up border-[rgba(200,245,74,0.55)] bg-[rgba(200,245,74,0.18)] px-4 py-3 text-sm"
          style={{ animationDelay: "40ms" }}
        >
          Objednávky sú povolené podľa{" "}
          <Link
            href={`/zmluvy/${active.id}`}
            className="font-bold text-[var(--teal-deep)] underline"
          >
            {active.number}
          </Link>{" "}
          · zľava {(active.contractDiscountPct * 100).toFixed(0)}% · min. CPP{" "}
          {formatEur(active.minCppEur, 2)}
        </div>
      ) : (
        <div
          className="panel fade-up border-[rgba(226,163,58,0.5)] bg-[rgba(226,163,58,0.15)] px-4 py-3 text-sm font-semibold"
          style={{ animationDelay: "40ms" }}
        >
          Nemáte aktívnu zmluvu — objednávka kampane je zablokovaná. Podpíšte
          návrh nižšie.
        </div>
      )}

      <section className="fade-up space-y-3" style={{ animationDelay: "80ms" }}>
        {contracts.map((c) => {
          const orderable = canOrderWithContract(c);
          return (
            <Link
              key={c.id}
              href={`/zmluvy/${c.id}`}
              className="panel block space-y-2 p-5 transition hover:border-[var(--teal)]"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-[family-name:var(--font-display)] text-lg font-bold">
                  {c.number}
                </span>
                <span
                  className={`chip ${orderable ? "chip-live" : c.status === "sent" ? "chip-warn" : ""}`}
                >
                  {CONTRACT_STATUS_LABELS[c.status] ?? c.status}
                </span>
              </div>
              <div className="font-semibold">{c.title}</div>
              <p className="text-sm text-[var(--ink-soft)]">
                Platnosť {formatDate(c.startsAt)} → {formatDate(c.endsAt)} ·
                zľava {(c.contractDiscountPct * 100).toFixed(0)}% · min. CPP{" "}
                {formatEur(c.minCppEur, 2)}
              </p>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
