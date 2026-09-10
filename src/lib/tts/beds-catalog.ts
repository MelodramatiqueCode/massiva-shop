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
  {
    id: "soft",
    name: "Soft pad",
    description: "Jemné ambientné plochy",
    file: "soft.mp3",
  },
  {
    id: "warm",
    name: "Warm lounge",
    description: "Teplejší lounge atmosféra",
    file: "warm.mp3",
  },
  {
    id: "pulse",
    name: "Soft pulse",
    description: "Jemný rytmus bez vokálu",
    file: "pulse.mp3",
  },
];

export function getBedById(id: string | undefined | null): BedOption | null {
  if (!id) return null;
  return BED_CATALOG.find((b) => b.id === id) ?? null;
}
