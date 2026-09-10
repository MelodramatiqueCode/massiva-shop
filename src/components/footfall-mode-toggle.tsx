import { setFootfallModeAction } from "@/lib/actions";
import { FOOTFALL_MODE_LABEL } from "@/lib/massiva/footfall-model";
import { getMassivaClient } from "@/lib/massiva/client";

export async function FootfallModeToggle() {
  const api = getMassivaClient();
  const mode = await api.getFootfallMode();
  const usingProviderStub = mode === "provider";

  return (
    <form action={setFootfallModeAction} className="flex items-center gap-2">
      <input
        type="hidden"
        name="mode"
        value={usingProviderStub ? "model" : "provider"}
      />
      <button
        type="submit"
        className="btn btn-ghost"
        title={FOOTFALL_MODE_LABEL[mode]}
      >
        {usingProviderStub ? "Footfall: provider*" : "Footfall: model"}
      </button>
    </form>
  );
}
