import type { Metadata } from "next";
import { Outfit, Space_Grotesk } from "next/font/google";
import Link from "next/link";
import { PersonaSwitcher } from "@/components/persona-switcher";
import { FootfallModeToggle } from "@/components/footfall-mode-toggle";
import { VenueSourceToggle } from "@/components/venue-source-toggle";
import { FOOTFALL_MODE_LABEL } from "@/lib/massiva/footfall-model";
import { getMassivaClient } from "@/lib/massiva/client";
import { getShopSession } from "@/lib/shop/session";
import { listPendingApprovals } from "@/lib/shop/orders";
import "./globals.css";

const display = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700"],
});

const body = Outfit({
  variable: "--font-body",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Massiva — Airtime e-shop",
  description:
    "Kúp mediálny priestor v predajniach. Audio spoty cez Massiva sieť.",
};

export default async function RootLayout({
  children,
}: LayoutProps<"/">) {
  const session = await getShopSession();
  const pending = session.isChainAdmin
    ? await listPendingApprovals(session)
    : [];
  const venueSource = await getMassivaClient().getVenueSource();
  const footfallMode = await getMassivaClient().getFootfallMode();

  return (
    <html
      lang="sk"
      className={`${display.variable} ${body.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <header className="site-header">
          <div className="shell flex flex-wrap items-center justify-between gap-3 py-3.5">
            <Link href="/" className="brand">
              MASSIVA<span> Air</span>
            </Link>
            <nav className="flex flex-wrap items-center justify-end gap-2">
              <Link href="/nova-kampan" className="btn btn-primary">
                Nová kampaň
              </Link>
              <Link href="/baliky" className="btn btn-ghost">
                Balíky
              </Link>
              <Link href="/predajne" className="btn btn-ghost">
                Predajne
              </Link>
              <Link href="/zmluvy" className="btn btn-ghost">
                Zmluvy
              </Link>
              <Link href="/kampane" className="btn btn-ghost">
                Kampane
              </Link>
              <Link href="/schvalenia" className="btn btn-ghost">
                Schválenia
                {pending.length > 0 ? ` (${pending.length})` : ""}
              </Link>
              <VenueSourceToggle />
              <FootfallModeToggle />
              <PersonaSwitcher session={session} />
            </nav>
          </div>
        </header>
        <main className="flex-1 py-8 md:py-10">{children}</main>
        <footer className="shell pb-10 pt-2 text-sm text-[var(--ink-soft)]">
          Massiva Air ·{" "}
          {venueSource === "servislist"
            ? "ServisList inventár"
            : "mock napojenie"}{" "}
          · {FOOTFALL_MODE_LABEL[footfallMode]} · persona:{" "}
          {session.organization.name} ({session.organization.type})
        </footer>
      </body>
    </html>
  );
}
