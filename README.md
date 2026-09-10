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

1. **Zmluva** (`/zmluvy`) — aktívna mediálna zmluva (zľava + CPP floor)
2. **Nová kampaň** (`/nova-kampan`) — mapa predajní + builder
3. Alebo hotový balík (`/baliky` → `/objednat`) — súhlas so zmluvou povinný
4. Detail kampane + playlogy (`/kampane/[id]`)

Bez aktívnej / podpísanej zmluvy je odoslanie objednávky zablokované.

Mock cenník custom výberu: rate engine podľa predajne + daypart/occupancy + zmluva.

## Massiva mock

Klient: `src/lib/massiva/client.ts` → `getMassivaClient()`.

Neskôr stačí doplniť HTTP implementáciu pri `MASSIVA_API_URL` + token a ponechať rovnaké metódy.

REST náhľad:

- `GET /api/massiva/venues`
- `GET /api/massiva/campaigns`
- `GET /api/massiva/packages`
- `GET /api/massiva/contracts`

## Poznámka

Žiadna ostrá platba (Stripe) ani upload MP3 — MVP mockuje spot názvom súboru.
