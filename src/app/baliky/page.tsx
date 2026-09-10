import Link from "next/link";
import { formatEur } from "@/lib/format";
import { getMassivaClient } from "@/lib/massiva/client";

export default async function PackagesPage() {
  const packages = await getMassivaClient().getPackages();

  return (
    <div className="shell space-y-6">
      <section className="fade-up space-y-2">
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold tracking-[-0.04em]">
          Balíky airtime
        </h1>
        <p className="max-w-2xl text-[var(--ink-soft)]">
          Vyber región alebo celú sieť. Po objednávke vznikne Content + Campaign
          v Massiva mock API.
        </p>
      </section>

      <section
        className="fade-up grid gap-4 md:grid-cols-2"
        style={{ animationDelay: "80ms" }}
      >
        {packages.map((pkg) => (
          <article
            key={pkg.id}
            className={`panel pkg ${pkg.featured ? "pkg-featured" : ""}`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="chip">{pkg.region}</span>
              {pkg.featured ? <span className="chip chip-live">Top</span> : null}
            </div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-[-0.03em]">
              {pkg.name}
            </h2>
            <p className="text-[var(--ink-soft)]">{pkg.tagline}</p>
            <ul className="space-y-1 text-sm text-[var(--ink-soft)]">
              <li>{pkg.venueIds.length} predajní</li>
              <li>{pkg.playsPerHour} prehratí za hodinu</li>
              <li>Minimálne {pkg.minDays} dní</li>
            </ul>
            <div className="mt-auto flex items-end justify-between gap-3 pt-3">
              <div className="text-3xl font-extrabold tracking-tight">
                {formatEur(pkg.pricePerDayEur)}
                <span className="text-base font-semibold text-[var(--ink-soft)]">
                  {" "}
                  / deň
                </span>
              </div>
              <Link href={`/objednat?pkg=${pkg.id}`} className="btn btn-primary">
                Objednať
              </Link>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
