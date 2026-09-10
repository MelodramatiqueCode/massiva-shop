import Link from "next/link";
import { formatEur } from "@/lib/format";
import { getMassivaClient } from "@/lib/massiva/client";

export default async function HomePage() {
  const api = getMassivaClient();
  const [packages, venues, campaigns] = await Promise.all([
    api.getPackages(),
    api.getVenues(),
    api.getCampaigns(),
  ]);
  const featured = packages.filter((p) => p.featured);

  return (
    <div className="shell space-y-10">
      <section className="hero fade-up">
        <svg className="wave" viewBox="0 0 420 180" aria-hidden>
          <path d="M10 90 C50 20, 90 160, 130 90 S210 20, 250 90 330 160, 370 90 410 40, 410 40" />
          <path d="M10 110 C55 50, 95 170, 140 110 S230 50, 270 110 350 170, 390 110" />
          <path d="M10 70 C60 10, 100 140, 150 70 S240 10, 290 70 370 140, 410 70" />
        </svg>
        <div className="hero-inner">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--lime)]">
            Massiva
          </p>
          <h1 className="max-w-3xl font-[family-name:var(--font-display)] text-4xl font-bold leading-[1.05] tracking-[-0.04em] md:text-6xl">
            Airtime v predajniach.
            <br />
            Tvoj spot medzi regálmi.
          </h1>
          <p className="max-w-xl text-lg text-white/80">
            Objednaj mediálny priestor v obchodoch, kde hrá in-store rádio.
            Mock Massiva API — neskôr ostré napojenie.
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Link href="/nova-kampan" className="btn btn-primary">
              Vytvoriť kampaň
            </Link>
            <Link
              href="/baliky"
              className="btn"
              style={{
                background: "rgba(255,255,255,0.12)",
                color: "#fff",
                borderColor: "rgba(255,255,255,0.25)",
              }}
            >
              Hotové balíky
            </Link>
          </div>
        </div>
      </section>

      <section
        className="fade-up grid grid-cols-2 gap-3 md:grid-cols-4"
        style={{ animationDelay: "80ms" }}
      >
        <div className="stat">
          <span className="text-sm text-[var(--ink-soft)]">Predajne</span>
          <strong>{venues.length}</strong>
        </div>
        <div className="stat">
          <span className="text-sm text-[var(--ink-soft)]">Online</span>
          <strong>{venues.filter((v) => v.isOnline).length}</strong>
        </div>
        <div className="stat">
          <span className="text-sm text-[var(--ink-soft)]">Balíky</span>
          <strong>{packages.length}</strong>
        </div>
        <div className="stat">
          <span className="text-sm text-[var(--ink-soft)]">Kampane</span>
          <strong>{campaigns.length}</strong>
        </div>
      </section>

      <section className="fade-up space-y-4" style={{ animationDelay: "140ms" }}>
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-[-0.03em] md:text-3xl">
              Odporúčané balíky
            </h2>
            <p className="text-[var(--ink-soft)]">
              Geografické balíčky airtime — mapované na Massiva venues.
            </p>
          </div>
          <Link href="/baliky" className="btn btn-ghost shrink-0">
            Všetky
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {featured.map((pkg) => (
            <article key={pkg.id} className="panel pkg pkg-featured">
              <div className="flex items-center justify-between gap-2">
                <span className="chip">{pkg.region}</span>
                <span className="text-sm font-semibold text-[var(--ink-soft)]">
                  {pkg.venueIds.length} predajní
                </span>
              </div>
              <h3 className="font-[family-name:var(--font-display)] text-xl font-bold tracking-[-0.02em]">
                {pkg.name}
              </h3>
              <p className="text-sm text-[var(--ink-soft)]">{pkg.tagline}</p>
              <div className="mt-auto flex items-end justify-between gap-3 pt-2">
                <div>
                  <div className="text-2xl font-extrabold tracking-tight">
                    {formatEur(pkg.pricePerDayEur)}
                    <span className="text-sm font-semibold text-[var(--ink-soft)]">
                      {" "}
                      / deň
                    </span>
                  </div>
                  <div className="text-xs text-[var(--ink-soft)]">
                    {pkg.playsPerHour}× / hod · min. {pkg.minDays} dní
                  </div>
                </div>
                <Link
                  href={`/objednat?pkg=${pkg.id}`}
                  className="btn btn-primary"
                >
                  Objednať
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
