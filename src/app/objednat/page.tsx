import Link from "next/link";
import { notFound } from "next/navigation";
import { submitOrderAction } from "@/lib/actions";
import { formatEur } from "@/lib/format";
import { getMassivaClient } from "@/lib/massiva/client";

type SearchParams = Promise<{ pkg?: string }>;

export default async function OrderPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { pkg: packageId } = await searchParams;
  if (!packageId) notFound();

  const api = getMassivaClient();
  const pkg = await api.getPackage(packageId);
  if (!pkg) notFound();

  const venues = await api.getVenues();
  const selected = venues.filter((v) => pkg.venueIds.includes(v.id));
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultStart = tomorrow.toISOString().slice(0, 10);

  return (
    <div className="shell space-y-6">
      <section className="fade-up space-y-2">
        <Link href="/baliky" className="text-sm font-semibold text-[var(--teal)]">
          ← Balíky
        </Link>
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold tracking-[-0.04em]">
          Objednávka
        </h1>
        <p className="text-[var(--ink-soft)]">
          {pkg.name} · {formatEur(pkg.pricePerDayEur)}/deň · {pkg.playsPerHour}×
          / hod
        </p>
      </section>

      <div
        className="fade-up grid gap-6 lg:grid-cols-[1.3fr_0.9fr]"
        style={{ animationDelay: "80ms" }}
      >
        <form action={submitOrderAction} className="panel space-y-4 p-5 md:p-6">
          <input type="hidden" name="packageId" value={pkg.id} />

          <div className="field">
            <label htmlFor="campaignName">Názov kampane</label>
            <input
              id="campaignName"
              name="campaignName"
              required
              placeholder="napr. Jarná kampaň 2026"
              defaultValue={`${pkg.name} — nová kampaň`}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="field">
              <label htmlFor="contactName">Meno</label>
              <input id="contactName" name="contactName" required defaultValue="Demo Inzerent" />
            </div>
            <div className="field">
              <label htmlFor="contactEmail">E-mail</label>
              <input
                id="contactEmail"
                name="contactEmail"
                type="email"
                required
                defaultValue="demo@example.com"
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="company">Firma</label>
            <input id="company" name="company" defaultValue="Demo Brand s.r.o." />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="field">
              <label htmlFor="startsAt">Začiatok</label>
              <input
                id="startsAt"
                name="startsAt"
                type="date"
                required
                defaultValue={defaultStart}
              />
            </div>
            <div className="field">
              <label htmlFor="days">Počet dní</label>
              <input
                id="days"
                name="days"
                type="number"
                min={pkg.minDays}
                defaultValue={pkg.minDays}
                required
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="field">
              <label htmlFor="spotName">Názov spotu</label>
              <input
                id="spotName"
                name="spotName"
                defaultValue="Reklamný spot"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="spotFilename">Súbor (mock)</label>
              <input
                id="spotFilename"
                name="spotFilename"
                defaultValue="spot-30s.mp3"
                required
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="spotDurationSec">Dĺžka spotu (s)</label>
            <input
              id="spotDurationSec"
              name="spotDurationSec"
              type="number"
              min={5}
              max={120}
              defaultValue={30}
              required
            />
          </div>

          <p className="text-sm text-[var(--ink-soft)]">
            MVP: namiesto uploadu stačí názov súboru. Mock vytvorí Content a
            Campaign cez Massiva klienta.
          </p>

          <button type="submit" className="btn btn-primary w-full md:w-auto">
            Odoslať objednávku
          </button>
        </form>

        <aside className="panel space-y-4 p-5 md:p-6">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-bold">
            Predajne v balíku
          </h2>
          <ul className="space-y-2 text-sm">
            {selected.map((v) => (
              <li key={v.id} className="flex items-start justify-between gap-2">
                <span>
                  <strong>{v.name}</strong>
                  <br />
                  <span className="text-[var(--ink-soft)]">
                    {v.city} · {v.region}
                  </span>
                </span>
                <span className={`chip ${v.isOnline ? "chip-live" : "chip-warn"}`}>
                  {v.isOnline ? "On" : "Off"}
                </span>
              </li>
            ))}
          </ul>
          <div className="border-t border-[var(--line)] pt-4 text-sm text-[var(--ink-soft)]">
            Odhad od {formatEur(pkg.pricePerDayEur * pkg.minDays)} za{" "}
            {pkg.minDays} dní.
          </div>
        </aside>
      </div>
    </div>
  );
}
