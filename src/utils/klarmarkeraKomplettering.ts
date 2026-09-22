import { bffFetch, kompletteringPath } from "./bffClient";
import { useKompletteringStore } from "../stores/KompletteringStore";
import { KlarmarkeraResultat } from "../types";
import { OFULLSTANDIGA_UPPGIFTER } from "../meddelanden";

/**
 * POST /api/{handlaggningId}/komplettering/done
 *
 * Closes the OUL task. The BFF passes the rule service's status through
 * unchanged, and 409 and 422 are both meaningful outcomes here rather than
 * plain failures, so they get their own result and message.
 *
 * On success the host portal is notified via a `task-done` event so it can drop
 * the task from the handläggare's list.
 */
export async function klarmarkeraKomplettering(
  handlaggningId: string,
): Promise<KlarmarkeraResultat> {
  const store = useKompletteringStore();
  store.saving = true;
  store.error = null;

  try {
    const response = await bffFetch(`${kompletteringPath(handlaggningId)}/done`, {
      method: "POST",
    });

    if (response.ok) {
      window.dispatchEvent(new CustomEvent("task-done", { detail: { handlaggningId } }));
      return KlarmarkeraResultat.KLAR;
    }

    if (response.status === 422) {
      // Deliberately says nothing about saving: this is reachable right after a
      // successful save, and telling someone to do what they just did is worse
      // than saying nothing.
      store.error = OFULLSTANDIGA_UPPGIFTER;
      return KlarmarkeraResultat.OFULLSTANDIG;
    }

    if (response.status === 409) {
      store.error = "Tiden för komplettering har gått ut och uppgiften kan inte längre klarmarkeras.";
      return KlarmarkeraResultat.UTGANGEN;
    }

    throw new Error(`HTTP error! status: ${response.status}`);
  } catch (error) {
    console.error("Error completing komplettering:", error);
    store.error = "Kunde inte klarmarkera uppgiften. Försök igen senare.";
    return KlarmarkeraResultat.FEL;
  } finally {
    store.saving = false;
  }
}
