import Link from "next/link";
import { CampaignBuilder } from "@/components/campaign-builder";
import { canOrderWithContract } from "@/lib/massiva/contracts";
import { getMassivaClient } from "@/lib/massiva/client";
import { DEMO_ACCOUNT } from "@/lib/massiva/seed";

export default async function NovaKampanPage() {
  const api = getMassivaClient();
  const [venues, chains, contract, venueSource] = await Promise.all([
    api.getVenues(),
    api.getChains(),
    api.getActiveContract(DEMO_ACCOUNT.id),
    api.getVenueSource(),
  ]);
  const orderable = canOrderWithContract(contract);
  const inventoryLabel =
    venueSource === "servislist"
      ? `ServisList · ${venues.length} prevádzok · ${chains.length} partnerov`
      : `Mock inventár · ${venues.length} predajní`;

  return (
    <div className="shell space-y-6">
      <section className="fade-up space-y-2">
        <Link href="/" className="text-sm font-semibold text-[var(--teal)]">
          ← Domov
        </Link>
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold tracking-[-0.04em] md:text-5xl">
          Nová kampaň
        </h1>
        <p className="max-w-2xl text-[var(--ink-soft)]">
          Na mape vyber prevádzky (aj celý región / partnera), nastav termín a
          frekvenciu — live quote spočíta cenu vo väčšom objeme. Inventár:{" "}
          <strong>{inventoryLabel}</strong>.
        </p>
      </section>

      <div
        className="panel fade-up px-4 py-3 text-sm"
        style={{
          animationDelay: "30ms",
          borderColor:
            venueSource === "servislist"
              ? "rgba(200, 245, 74, 0.55)"
              : undefined,
          background:
            venueSource === "servislist"
              ? "rgba(200, 245, 74, 0.14)"
              : undefined,
        }}
      >
        {venueSource === "servislist" ? (
          <>
            Mapa aj pricing bežia nad <strong>ServisList</strong> inventárom (
            {venues.length} pinov). Vyber viac predajní alebo celého partnera —
            cena sa prepočíta hneď.
          </>
        ) : (
          <>
            Beží <strong>mock</strong> inventár. Pre reálne prevádzky: v headeri{" "}
            <em>Pripojiť ServisList</em>, potom sa mapa aj quote naplnia celou
            sieťou.
          </>
        )}
      </div>

      {!orderable ? (
        <div
          className="panel fade-up space-y-2 border-[rgba(226,163,58,0.5)] bg-[rgba(226,163,58,0.15)] px-4 py-4"
          style={{ animationDelay: "40ms" }}
        >
          <p className="font-semibold">
            Objednávka je zablokovaná — chýba aktívna zmluva.
          </p>
          <p className="text-sm text-[var(--ink-soft)]">
            Builder (mapa + odhad ceny) môžeš skúšať; odoslanie až po podpise
            zmluvy.
          </p>
          <Link href="/zmluvy" className="btn btn-primary">
            Prejsť na zmluvy
          </Link>
        </div>
      ) : (
        <div
          className="panel fade-up border-[rgba(200,245,74,0.45)] bg-[rgba(200,245,74,0.14)] px-4 py-3 text-sm"
          style={{ animationDelay: "40ms" }}
        >
          Objednávka podľa zmluvy{" "}
          <Link
            href={`/zmluvy/${contract!.id}`}
            className="font-bold underline"
          >
            {contract!.number}
          </Link>{" "}
          · zľava {(contract!.contractDiscountPct * 100).toFixed(0)}%
        </div>
      )}

      <div className="fade-up" style={{ animationDelay: "80ms" }}>
        <CampaignBuilder
          venues={venues}
          chains={chains}
          contract={contract}
          canOrder={orderable}
          venueSource={venueSource}
        />
      </div>
    </div>
  );
}
