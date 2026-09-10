export type BedOption = {
  id: string;
  name: string;
  description: string;
  file: string;
};

/** Predpripravené podklady — jemné, bez vokálu, vhodné pod hlas. */
export const BED_CATALOG: BedOption[] = [
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
