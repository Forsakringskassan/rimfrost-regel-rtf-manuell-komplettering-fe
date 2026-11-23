import { SaknarBehorighetError, getJson } from "./bffClient";
import { SAKNAR_BEHORIGHET } from "../meddelanden";
import { useKompletteringStore } from "../stores/KompletteringStore";
import type { UppgiftsbeskrivningResponse } from "../types";

/**
 * GET /api/uppgiftsbeskrivning/{uppgiftstyp}
 *
 * The BFF ignores the uppgiftstyp and always returns the one general
 * description the rule service offers, but it is kept in the path so the
 * contract survives type-specific descriptions being added later.
 */
export async function fetchUppgiftsbeskrivning(uppgiftstyp: string): Promise<void> {
  const store = useKompletteringStore();
  store.descriptionLoading = true;
  store.descriptionError = false;

  try {
    const data = await getJson<UppgiftsbeskrivningResponse>(
      `/api/uppgiftsbeskrivning/${uppgiftstyp}`,
    );
    if (typeof data?.beskrivning !== "string") {
      throw new Error("Invalid response format from backend");
    }
    store.uppgiftsbeskrivning = data.beskrivning;
  } catch (error) {
    console.error("Error fetching description:", error);
    store.uppgiftsbeskrivning = "";
    store.descriptionError = true;
    // A token problem is not about the help text: say it where it can be seen
    // and acted on (RTFKF-NFR-01.5).
    if (error instanceof SaknarBehorighetError) {
      store.error = SAKNAR_BEHORIGHET;
    }
  } finally {
    store.descriptionLoading = false;
  }
}
