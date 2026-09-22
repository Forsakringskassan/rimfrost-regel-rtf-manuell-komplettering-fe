import { parsePersonnummer } from "@fkui/logic";
import {
  INGET_ATT_SPARA,
  OFULLSTANDIGA_UPPGIFTER,
  OGILTIGT_PERSONNUMMER,
} from "../meddelanden";
import type { RtfKompletteringData } from "../types";

/**
 * What the two buttons demand of the form, in one place so the component and
 * the call helpers cannot drift apart: the component reports on the click,
 * because FKUI's own validation only speaks when the host registered its
 * validators against the same @fkui/logic instance this remote renders with,
 * and the helpers check again before anything reaches the BFF.
 *
 * Both return the message to show, or null when the data passes.
 */

/** Blank, not just missing: the rule service counts whitespace as missing too. */
function harVarde(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}

/**
 * Spara asks for one field, not both — RTFKF-FR-02.2 exists so half-filled work
 * can be put away. The one field is what separates saving progress from
 * overwriting the yrkande with two empty strings.
 */
export function valideraForSpara(data: RtfKompletteringData): string | null {
  if (!harVarde(data.personnummer) && !harVarde(data.avsikt)) {
    return INGET_ATT_SPARA;
  }
  return null;
}

/**
 * Klarmarkera asks for both fields, and for the personnummer to be shaped like
 * one: `done` closes the task on what is registered, so a value the rule
 * service cannot read at all would be registered on the yrkande with nothing
 * left to catch it.
 *
 * The check digit is deliberately not verified, so the numbers the test
 * environments hand out go through. config/validation.ts drops the same check
 * from the field, so the two still agree; a mistyped digit now reaches the rule
 * service, which is the only thing left that can catch it.
 */
export function valideraForKlarmarkering(data: RtfKompletteringData): string | null {
  if (!harVarde(data.personnummer) || !harVarde(data.avsikt)) {
    return OFULLSTANDIGA_UPPGIFTER;
  }
  if (!parsePersonnummer(data.personnummer)) {
    return OGILTIGT_PERSONNUMMER;
  }
  return null;
}
