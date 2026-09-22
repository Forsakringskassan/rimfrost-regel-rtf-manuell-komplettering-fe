/**
 * User-facing copy that more than one path needs to agree on.
 *
 * The incomplete-data message has two sources: this app's own check before
 * calling the BFF, and the rule service's 422. A handläggare should not be able
 * to tell which one answered, so both use the same wording.
 */
export const OFULLSTANDIGA_UPPGIFTER =
  "Uppgifterna är ofullständiga. Både personnummer och avsikt måste vara ifyllda för att uppgiften ska kunna klarmarkeras.";

/**
 * Klarmarkering only: a half-typed personnummer is a perfectly good thing to
 * save and come back to, so Spara never shows this.
 */
export const OGILTIGT_PERSONNUMMER =
  "Personnumret är inte giltigt. Kontrollera att det är rätt ifyllt.";

/**
 * Spara with an entirely empty form. The PATCH rewrites both fields on the
 * yrkande, so saving nothing is not a no-op — it would erase what is already
 * registered.
 */
export const INGET_ATT_SPARA =
  "Det finns inget att spara. Fyll i personnummer eller avsikt.";
