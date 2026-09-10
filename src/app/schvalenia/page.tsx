import Link from "next/link";
import {
  approveSegmentAction,
  rejectSegmentAction,
} from "@/lib/actions";
import { formatEur } from "@/lib/format";
import { getShopSession } from "@/lib/shop/session";
import { listPendingApprovals } from "@/lib/shop/orders";

type SearchParams = Promise<{ ok?: string }>;

export default async function ApprovalsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { ok } = await searchParams;
  const session = await getShopSession();
  const pending = await listPendingApprovals(session);

  return (
    <div className="shell space-y-6">
      <section className="fade-up space-y-2">
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold tracking-[-0.04em]">
          Schválenia
        </h1>
        <p className="max-w-2xl text-[var(--ink-soft)]">
          Chain admin schvaľuje len svoju časť cenovej ponuky. Partial fulfill —
          schválené segmenty môžu ísť do vysielania aj keď iné ešte čakajú alebo
          boli zamietnuté.
        </p>
        <p className="text-sm font-semibold">
          Prihlásený: {session.user.name} · {session.organization.name}
          {session.organization.chainId
            ? ` · ${session.organization.chainId}`
            : ""}
        </p>
      </section>

      {ok ? (
        <div className="panel border-[rgba(200,245,74,0.55)] bg-[rgba(200,245,74,0.2)] px-4 py-3 text-sm font-semibold">
          {ok === "approved" ? "Segment schválený." : "Segment zamietnutý."}
        </div>
      ) : null}

      {!session.isChainAdmin ? (
        <div className="panel p-5 text-sm text-[var(--ink-soft)]">
          Schvaľovací inbox je pre chain adminov. Prepni personu v hlavičke (napr.
          Tesco Chain Admin).
        </div>
      ) : pending.length === 0 ? (
        <div className="panel p-5 text-sm text-[var(--ink-soft)]">
          Žiadne čakajúce požiadavky pre vašu sieť.
        </div>
      ) : (
        <div className="space-y-4">
          {pending.map(({ segment, order }) => (
            <article key={segment.id} className="panel space-y-3 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-[family-name:var(--font-display)] text-xl font-bold">
                    {order?.name ?? "Objednávka"}
                  </h2>
                  <p className="text-sm text-[var(--ink-soft)]">
                    {segment.chainName} · {segment.venueIds.length} predajní ·{" "}
                    {formatEur(segment.quoteEur)}
                  </p>
                  {order ? (
                    <p className="mt-1 text-xs text-[var(--ink-soft)]">
                      Celková ponuka {formatEur(order.totalQuoteEur)} · kontakt{" "}
                      {order.contactName} ({order.contactEmail})
                    </p>
                  ) : null}
                </div>
                {order ? (
                  <Link
                    href={`/kampane/${order.campaignId}`}
                    className="btn btn-ghost text-xs"
                  >
                    Detail kampane
                  </Link>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                <form action={approveSegmentAction}>
                  <input type="hidden" name="segmentId" value={segment.id} />
                  <button type="submit" className="btn btn-primary">
                    Schváliť túto časť
                  </button>
                </form>
                <form action={rejectSegmentAction} className="flex flex-wrap gap-2">
                  <input type="hidden" name="segmentId" value={segment.id} />
                  <input
                    name="reason"
                    placeholder="Dôvod zamietnutia"
                    className="rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm"
                  />
                  <button type="submit" className="btn btn-ghost">
                    Zamietnuť
                  </button>
                </form>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
