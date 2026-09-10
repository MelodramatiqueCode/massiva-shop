export type BedOption = {
  id: string;
  name: string;
  description: string;
  file: string;
};

/** Predpripravené podklady — jemné, bez vokálu, vhodné pod hlas. */
export const BED_CATALOG: BedOption[] = [
  {
    id: "podmaz-1",
    name: "Podmaz 1",
    description: "Retail bed ~20 s",
    file: "podmaz-1.mp3",
  },
  {
    id: "podmaz-2",
    name: "Podmaz 2",
    description: "Promo bed ~22 s",
    file: "podmaz-2.mp3",
  },
];

export function getBedById(id: string | undefined | null): BedOption | null {
  if (!id) return null;
  return BED_CATALOG.find((b) => b.id === id) ?? null;
}

/** Bed alone before voice starts. */
export const BED_LEAD_SEC = 1.5;
/** Bed alone after voice ends. */
export const BED_TAIL_SEC = 2.0;
/** Slow fade-in of bed. */
export const BED_FADE_IN_SEC = 1.5;
/** Slow fade-out of bed. */
export const BED_FADE_OUT_SEC = 2.5;
