import { getJson, kompletteringPath } from "./bffClient";
import { useKompletteringStore } from "../stores/KompletteringStore";
import type { RtfKompletteringData } from "../types";

/**
 * GET /api/{handlaggningId}/komplettering
 *
 * Returns whatever the yrkande already holds. Both fields may come back null —
 * that absence is precisely why the komplettering task exists — so an empty
 * payload is a success, not an error. Returns null when the load failed.
 *
 * Pass `signal` when the load can be superseded: the store is the host's Pinia
 * singleton, so a call that has been aborted must leave `loading` and `error`
 * to whoever replaced it.
 */
export async function fetchKomplettering(
  handlaggningId: string,
  signal?: AbortSignal,
): Promise<RtfKompletteringData | null> {
  const store = useKompletteringStore();
  store.loading = true;

  try {
    const data = await getJson<RtfKompletteringData>(
      kompletteringPath(handlaggningId),
      signal,
    );
    if (signal?.aborted) {
      return null;
    }
    store.error = null;
    return { personnummer: data?.personnummer ?? null, avsikt: data?.avsikt ?? null };
  } catch (error) {
    // Superseded, not failed: the caller that replaced this one has already
    // reset the store and set loading for its own call. An error message here
    // would land on top of a load that is doing fine.
    if (signal?.aborted) {
      return null;
    }
    console.error("Error fetching komplettering:", error);
    store.error = "Kunde inte hämta uppgiftsdata. Försök igen senare.";
    return null;
  } finally {
    // Same reason: the loader on screen belongs to the newer call.
    if (!signal?.aborted) {
      store.loading = false;
    }
  }
}
