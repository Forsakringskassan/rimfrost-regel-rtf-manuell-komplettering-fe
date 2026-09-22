import { klarmarkeraKomplettering } from "./klarmarkeraKomplettering";
import { sparaKomplettering } from "./sparaKomplettering";
import { valideraForKlarmarkering } from "./validering";
import { useKompletteringStore } from "../stores/KompletteringStore";
import { KlarmarkeraResultat } from "../types";
import type { RtfKompletteringData } from "../types";

/**
 * Validate, register, then complete, which is the sequence RTFKF-FR-03.1/03.2/03.3
 * describe.
 *
 * `done` acts on what is registered, so completing without first saving would
 * act on something other than what the handläggare has in front of them. The
 * save is skipped when the store already knows the form is saved, which spares
 * a redundant write of identical data on the ordinary Spara-then-Klarmarkera
 * path; any edit since that Spara has cleared `sparad`, so a changed form is
 * always written before it is completed. A failed save stops the sequence with
 * its own message already set.
 *
 * Incomplete or invalid data is rejected here rather than being sent and
 * bounced back as a 422. FKUI's own validation should already have stopped the
 * submit, but that depends on the host app having registered the validators
 * against the same @fkui/logic instance this remote renders with — when it has
 * not, the submit goes through and a handläggare is left with a button that
 * does nothing. This check does not depend on any of that.
 *
 * This lives outside the component so the sequencing can be tested directly
 * rather than only through a mounted form.
 */
export async function slutforKomplettering(
  handlaggningId: string,
  data: RtfKompletteringData,
): Promise<KlarmarkeraResultat> {
  const store = useKompletteringStore();

  const valideringsfel = valideraForKlarmarkering(data);
  if (valideringsfel) {
    store.error = valideringsfel;
    return KlarmarkeraResultat.OFULLSTANDIG;
  }

  if (!store.sparad && !(await sparaKomplettering(handlaggningId, data))) {
    return KlarmarkeraResultat.FEL;
  }

  return klarmarkeraKomplettering(handlaggningId);
}
