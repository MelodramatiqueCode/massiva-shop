import Link from "next/link";
import { notFound } from "next/navigation";
import { signContractAction } from "@/lib/actions";
import {
  CONTRACT_STATUS_LABELS,
  formatDate,
  formatDateTime,
  formatEur,
} from "@/lib/format";
import { canOrderWithContract } from "@/lib/massiva/contracts";
import { getMassivaClient } from "@/lib/massiva/client";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ podpisane?: string }>;

export default async function ContractDetailPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const { podpisane } = await searchParams;
  const api = getMassivaClient();
  const contract = await api.getContract(id);
  if (!contract) notFound();

  const [account, chains] = await Promise.all([
    api.getAccount(contract.accountId),
    api.getChains(),
  ]);
  const chainName = Object.fromEntries(chains.map((c) => [c.id, c.name]));
  const orderable = canOrderWithContract(contract);
  const canSign =
    contract.status === "draft" ||
    contract.status === "sent" ||
    contract.status === "signed";

  const scope =
    (contract.chainIds?.length ?? 0) > 0
      ? contract.chainIds!
          .map((cid) => chainName[cid] ?? cid)
          .join(", ")
      : (contract.venueIds?.length ?? 0) > 0
        ? `${contract.venueIds!.length} predajní`
        : "Celá sieť Massiva";

  return (
    <div className="shell space-y-6">
      <section className="fade-up space-y-3">
        <Link href="/zmluvy" className="text-sm font-semibold text-[var(--teal)]">
          ← Zmluvy
        </Link>
        {podpisane ? (
          <div className="panel border-[rgba(200,245,74,0.55)] bg-[rgba(200,245,74,0.2)] px-4 py-3 text-sm font-semibold">
            Zmluva podpísaná a aktivovaná. Môžete objednať kampaň.
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <span className={`chip ${orderable ? "chip-live" : "chip-warn"}`}>
            {CONTRACT_STATUS_LABELS[contract.status] ?? contract.status}
          </span>
          <span className="chip">{contract.number}</span>
        </div>
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold tracking-[-0.04em]">
          {contract.title}
        </h1>
        <p className="text-[var(--ink-soft)]">
          {account?.company ?? account?.name ?? "Účet"} · platnosť{" "}
          {formatDate(contract.startsAt)} → {formatDate(contract.endsAt)}
        </p>
      </section>

      <section
        className="fade-up grid gap-4 md:grid-cols-3"
        style={{ animationDelay: "60ms" }}
      >
        <div className="stat">
          <span className="text-sm text-[var(--ink-soft)]">Zmluvná zľava</span>
          <strong>{(contract.contractDiscountPct * 100).toFixed(0)}%</strong>
        </div>
        <div className="stat">
          <span className="text-sm text-[var(--ink-soft)]">Min. CPP</span>
          <strong>{formatEur(contract.minCppEur, 2)}</strong>
        </div>
        <div className="stat">
          <span className="text-sm text-[var(--ink-soft)]">Rozsah</span>
          <strong className="text-lg leading-snug">{scope}</strong>
        </div>
      </section>

      <section
        id="dokument"
        className="panel fade-up space-y-3 p-5 md:p-6"
        style={{ animationDelay: "90ms" }}
      >
        <h2 className="font-[family-name:var(--font-display)] text-xl font-bold">
          Podmienky (mock)
        </h2>
        <p className="text-sm leading-relaxed text-[var(--ink-soft)]">
          {contract.termsSummary}
        </p>
        <ul className="space-y-1 text-sm text-[var(--ink-soft)]">
          <li>• Objednávky airtime len pri aktívnej / podpísanej zmluve.</li>
          <li>• Cena podľa rate engine + zľava a CPP floor zo zmluvy.</li>
          <li>• Spot musí spĺňať pravidlá siete (mock — bez kontroly).</li>
        </ul>
        {contract.signedAt ? (
          <p className="text-sm font-semibold">
            Podpísané: {formatDateTime(contract.signedAt)}
          </p>
        ) : null}
      </section>

      <section
        className="fade-up flex flex-wrap gap-3"
        style={{ animationDelay: "120ms" }}
      >
        {canSign && !orderable ? (
          <form action={signContractAction}>
            <input type="hidden" name="contractId" value={contract.id} />
            <button type="submit" className="btn btn-primary">
              Podpísať zmluvu (demo)
            </button>
          </form>
        ) : null}
        {orderable ? (
          <Link href="/nova-kampan" className="btn btn-primary">
            Objednať kampaň
          </Link>
        ) : null}
        <Link href="/zmluvy" className="btn btn-ghost">
          Späť na zoznam
        </Link>
      </section>
    </div>
  );
}
