import Link from "next/link";
import { CampaignBuilder } from "@/components/campaign-builder";
import { getMassivaClient } from "@/lib/massiva/client";

export default async function NovaKampanPage() {
  const api = getMassivaClient();
  const [venues, chains] = await Promise.all([api.getVenues(), api.getChains()]);

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
          Klikni na mape predajne, kde chceš hrať spot. Potom nastav termín,
          frekvenciu a odošli — vznikne Massiva Content + Campaign.
        </p>
      </section>

      <div className="fade-up" style={{ animationDelay: "80ms" }}>
        <CampaignBuilder venues={venues} chains={chains} />
      </div>
    </div>
  );
}
