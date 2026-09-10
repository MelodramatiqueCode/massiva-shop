import { setVenueSourceAction } from "@/lib/actions";
import { getMassivaClient } from "@/lib/massiva/client";
import { mapServisListToChainsAndVenues } from "@/lib/shop/servislist-inventory";

export async function VenueSourceToggle() {
  const api = getMassivaClient();
  const source = await api.getVenueSource();
  const connected = source === "servislist";
  const inventory = mapServisListToChainsAndVenues();

  return (
    <form action={setVenueSourceAction} className="flex items-center gap-2">
      <input
        type="hidden"
        name="source"
        value={connected ? "mock" : "servislist"}
      />
      <button
        type="submit"
        className="btn btn-ghost"
        title={
          connected
            ? `ServisList · ${inventory.deviceCount} zariadení`
            : "Pripojiť inventár zo ServisList snapshotu"
        }
      >
        {connected ? "Odpojiť ServisList" : "Pripojiť ServisList"}
      </button>
    </form>
  );
}
