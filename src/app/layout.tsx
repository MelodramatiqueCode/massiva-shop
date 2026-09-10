import type { Metadata } from "next";
import { Outfit, Space_Grotesk } from "next/font/google";
import Link from "next/link";
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="sk"
      className={`${display.variable} ${body.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="site-header">
          <div className="shell flex items-center justify-between gap-4 py-3.5">
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
            </nav>
          </div>
        </header>
        <main className="flex-1 py-8 md:py-10">{children}</main>
        <footer className="shell pb-10 pt-2 text-sm text-[var(--ink-soft)]">
          Massiva Air · mock napojenie na Massiva API · MPD sieť predajní
        </footer>
      </body>
    </html>
  );
}
