import { getJson, kompletteringPath } from "./bffClient";
import { useKompletteringStore } from "../stores/KompletteringStore";
import type { RtfKompletteringData } from "../types";

/**
 * GET /api/{handlaggningId}/komplettering
 *
 * Returns whatever the yrkande already holds. Both fields may come back null —
 * that absence is precisely why the komplettering task exists — so an empty
 * payload is a success, not an error. Returns null when the load failed.
 */
export async function fetchKomplettering(
  handlaggningId: string,
): Promise<RtfKompletteringData | null> {
  const store = useKompletteringStore();
  store.loading = true;

  try {
    const data = await getJson<RtfKompletteringData>(kompletteringPath(handlaggningId));
    store.error = null;
    return { personnummer: data?.personnummer ?? null, avsikt: data?.avsikt ?? null };
  } catch (error) {
    console.error("Error fetching komplettering:", error);
    store.error = "Kunde inte hämta uppgiftsdata. Försök igen senare.";
    return null;
  } finally {
    store.loading = false;
  }
}
