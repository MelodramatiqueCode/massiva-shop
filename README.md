# Massiva Air — e-shop MVP

E-shop na predaj in-store audio airtime. Používa **Massiva mock klienta** so rovnakým povrchom API ako draft (`accounts`, `campaigns`, `contents`, `chains`, `venues`, `play_logs`).

## Stack

- Next.js App Router + TypeScript + Tailwind
- File-backed mock store: `data/massiva-store.json`
- Server Actions pre objednávky

## Spustenie

```bash
npm install
npm run dev
```

Otvor [http://localhost:3000](http://localhost:3000).

## Tok objednávky

1. Výber balíka (`/baliky`)
2. Formulár (`/objednat?pkg=…`) → vytvorí **Content** + **Campaign** cez mock
3. Detail kampane + playlogy (`/kampane/[id]`)

## Massiva mock

Klient: `src/lib/massiva/client.ts` → `getMassivaClient()`.

Neskôr stačí doplniť HTTP implementáciu pri `MASSIVA_API_URL` + token a ponechať rovnaké metódy.

REST náhľad:

- `GET /api/massiva/venues`
- `GET /api/massiva/campaigns`
- `GET /api/massiva/packages`

## Poznámka

Žiadna ostrá platba (Stripe) ani upload MP3 — MVP mockuje spot názvom súboru.
