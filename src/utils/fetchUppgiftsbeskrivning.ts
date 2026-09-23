import { getJson } from "./bffClient";
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
  } finally {
    store.descriptionLoading = false;
  }
}
