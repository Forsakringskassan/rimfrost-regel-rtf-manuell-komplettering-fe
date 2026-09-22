import { parsePersonnummerLuhn } from "@fkui/logic";
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
 * Klarmarkera asks for both fields, and for the personnummer to be a real one:
 * `done` closes the task on what is registered, so a number that fails its
 * check digit would be registered on the yrkande with nothing left to catch it.
 *
 * The Luhn check is the same one FPersonnummerTextField applies in the field,
 * from the same @fkui/logic function, so the two never disagree about what a
 * personnummer is.
 */
export function valideraForKlarmarkering(data: RtfKompletteringData): string | null {
  if (!harVarde(data.personnummer) || !harVarde(data.avsikt)) {
    return OFULLSTANDIGA_UPPGIFTER;
  }
  if (!parsePersonnummerLuhn(data.personnummer)) {
    return OGILTIGT_PERSONNUMMER;
  }
  return null;
}
