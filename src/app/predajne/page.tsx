import Link from "next/link";
import { VenuesFootfallList } from "@/components/venues-footfall-list";
import { FOOTFALL_MODE_LABEL } from "@/lib/massiva/footfall-model";
import { getMassivaClient } from "@/lib/massiva/client";

export default async function VenuesPage() {
  const api = getMassivaClient();
  const [venues, chains, source, footfallMode] = await Promise.all([
    api.getVenues(),
    api.getChains(),
    api.getVenueSource(),
    api.getFootfallMode(),
  ]);

  const sourceLabel =
    source === "servislist"
      ? `ServisList inventár — ${venues.length} predajní · ${chains.length} partnerov`
      : "Massiva mock venues — inventár pre balíky a kampane";

  return (
    <div className="shell space-y-6">
      <section className="fade-up space-y-2">
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold tracking-[-0.04em]">
          Predajne
        </h1>
        <p className="text-[var(--ink-soft)]">
          {sourceLabel}. {FOOTFALL_MODE_LABEL[footfallMode]}.
        </p>
      </section>

      <VenuesFootfallList
        venues={venues}
        chains={chains}
        sourceLabel={sourceLabel}
      />

      <Link href="/baliky" className="btn btn-primary">
        Späť na balíky
      </Link>
    </div>
  );
}
