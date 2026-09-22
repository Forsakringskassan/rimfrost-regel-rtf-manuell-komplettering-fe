import { bffFetch, kompletteringPath } from "./bffClient";
import { useKompletteringStore } from "../stores/KompletteringStore";
import type { RtfKompletteringData } from "../types";

/**
 * PATCH /api/{handlaggningId}/komplettering
 *
 * Both fields are always sent, and an empty field is sent as "" rather than
 * null. The rule service rewrites personnummer and avsikt on the yrkande from
 * whatever the request carries, so omitting a field would erase already
 * registered data rather than leave it untouched — which is why the generated
 * type carries @NotNull on both and the BFF answers 400 for a null. An empty
 * string does pass that validation, and the rule service still counts it as
 * missing, which is what lets a handläggare save half-filled work and have
 * `done` refuse with 422 until it is complete.
 */
export async function sparaKomplettering(
  handlaggningId: string,
  data: RtfKompletteringData,
): Promise<boolean> {
  const store = useKompletteringStore();
  store.saving = true;
  store.error = null;

  try {
    const response = await bffFetch(kompletteringPath(handlaggningId), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personnummer: data.personnummer ?? "",
        avsikt: data.avsikt ?? "",
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    store.sparad = true;
    return true;
  } catch (error) {
    console.error("Error saving komplettering:", error);
    store.error = "Kunde inte spara uppgifterna. Försök igen senare.";
    return false;
  } finally {
    store.saving = false;
  }
}
