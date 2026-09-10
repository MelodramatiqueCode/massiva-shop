import type { Contract } from "./types";

export type ContractDocumentSection = {
  heading: string;
  paragraphs: string[];
};

/** Shared commercial + legal copy for demo media contracts. */
export function buildContractDocument(contract: Contract): {
  title: string;
  intro: string;
  sections: ContractDocumentSection[];
} {
  const discountPct = Math.round(contract.contractDiscountPct * 100);
  const minCpp = contract.minCppEur.toFixed(2).replace(".", ",");

  return {
    title: `Mediálna zmluva ${contract.number}`,
    intro:
      contract.termsSummary ||
      "Rámcová zmluva o vysielaní in-store audio reklamy v sieti Massiva Air.",
    sections: [
      {
        heading: "1. Predmet zmluvy",
        paragraphs: [
          "Poskytovateľ (Massiva / Melodramatique) umožňuje Objednávateľovi vysielanie audio reklamných spotov v predajniach pripojených k sieti in-store rádia (MPD / Massiva).",
          "Objednávateľ objednáva mediálny priestor (airtime) prostredníctvom e-shopu Massiva Air alebo iného dohodnutého kanála. Každá objednávka je viazaná na túto zmluvu.",
        ],
      },
      {
        heading: "2. Rozsah a platnosť",
        paragraphs: [
          `Zmluva platí od ${contract.startsAt} do ${contract.endsAt}, pokiaľ nie je predĺžená dodatkom alebo ukončená podľa bodu 8.`,
          "Rozsah vysielania (reťazce / predajne) je uvedený v zmluve. Ak nie je rozsah obmedzený, platí pre celú dostupnú sieť Massiva v čase objednávky.",
        ],
      },
      {
        heading: "3. Cenník a fakturácia",
        paragraphs: [
          `Na cenu kampane sa uplatňuje zmluvná zľava ${discountPct} % z vypočítaného subtotalu podľa aktuálnej rate karty (venue base, daypart, occupancy, frekvencia).`,
          `Minimálna cena za prehratie (CPP floor) je ${minCpp} €, pokiaľ by po zľavách vyšla nižšia jednotková cena.`,
          "Konečná cena kampane je potvrdená pri odoslaní objednávky. DPH sa účtuje podľa platných predpisov SR.",
        ],
      },
      {
        heading: "4. Obchodné podmienky objednávky (VOP)",
        paragraphs: [
          "Objednávku môže podať len osoba oprávnená konať za Objednávateľa. Odoslaním objednávky Objednávateľ potvrdzuje súhlas s touto zmluvou a VOP.",
          "Zmena termínu, predajní alebo spotu po potvrdení je možná len so súhlasom Poskytovateľa; môže ovplyvniť cenu.",
          "Zrušenie kampane menej ako 48 hodín pred začiatkom môže byť spoplatnené až do 50 % ceny kampane (demo pravidlo).",
        ],
      },
      {
        heading: "5. Audio obsah",
        paragraphs: [
          "Objednávateľ zodpovedá za obsah spotu (autorské práva, ochranné známky, pravdivosť tvrdení, súlad s reklamnými predpismi a pravidlami reťazca).",
          "Poskytovateľ môže spot odmietnuť alebo pozastaviť, ak porušuje zákon, dobré mravy alebo technické limity siete (dĺžka, formát, hlasitosť).",
          "V deme e-shopu stačí názov súboru; v produkcii sa vyžaduje upload schváleného audia.",
        ],
      },
      {
        heading: "6. Vysielanie a reporty",
        paragraphs: [
          "Vysielanie prebieha podľa schváleného rozvrhu (dni, časové okná, frekvencia). Krátkodobé výpadky zariadenia v predajni nezakladajú nárok na odstúpenie, ak celkový objem airtime neklesne pod 90 % plánu (demo SLA).",
          "Report prehraní (play log) je dostupný v detaile kampane. Odhad kontaktov (CPT) je modelový a nie je zárukou reálneho dosahu.",
        ],
      },
      {
        heading: "7. Ochrana údajov",
        paragraphs: [
          "Kontaktné a fakturačné údaje sa spracúvajú na účely plnenia zmluvy a fakturácie. Poskytovateľ ich nepredáva tretím stranám mimo nevyhnutných subdodávateľov (hosting, platby).",
        ],
      },
      {
        heading: "8. Ukončenie",
        paragraphs: [
          "Zmluvu môže ktorákoľvek strana vypovedať písomne s 30-dňovou výpovednou lehotou. Kampane už potvrdené na obdobie po ukončení sa dokončia, pokiaľ sa strany nedohodnú inak.",
          "Pri hrubom porušení (neplatenie, nezákonný obsah) môže Poskytovateľ zmluvu okamžite pozastaviť.",
        ],
      },
      {
        heading: "9. Záverečné ustanovenia",
        paragraphs: [
          "Tento dokument je demo / návrh pre Massiva Air MVP. Nie je právnym poradcom; ostrá zmluva podlieha schváleniu právnym oddelením.",
          "Právny poriadok SR. Spory riešia strany prednostne dohodou.",
        ],
      },
    ],
  };
}
