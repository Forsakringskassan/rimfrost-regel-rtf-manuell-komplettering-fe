import { ValidationService, availableValidators } from "@fkui/logic";

/**
 * FKUI's validators live in a registry on `ValidationService`, a module-level
 * singleton inside @fkui/logic, and `ValidationPlugin` fills that registry when
 * a host app calls `app.use(ValidationPlugin)`.
 *
 * As a Module Federation remote we only expose the component, never an app, so
 * that install happens in the portal — against the portal's own copy of
 * @fkui/logic. Unless @fkui/logic is deduplicated to one shared instance, the
 * fields rendered here read an empty registry and every field throws
 * "Validator 'x' does not exist or is not registered" as it mounts, leaving the
 * form unable to validate and Klarmarkera doing nothing at all.
 *
 * vite.config.ts now shares @fkui/logic as a singleton, which fixes it when the
 * host shares it too. This registration is the belt to that braces: it costs a
 * few map writes and makes the remote work against a host that does not.
 */
let registered = false;

/**
 * FPersonnummerTextField hardcodes `personnummerLuhn` onto its input in
 * `mounted()`, with no prop to turn it off, so the only seam for dropping the
 * check digit is the registry the field reads the validator out of. This
 * replacement keeps the name and passes everything; `personnummerFormat` still
 * runs, so a value that is not shaped like a personnummer is still caught.
 *
 * Registering it here overwrites whatever the host put under that name in the
 * shared @fkui/logic singleton, so every personnummer field in the portal stops
 * verifying its check digit once this remote has mounted, not only ours.
 */
const UTAN_KONTROLLSIFFRA = {
  name: "personnummerLuhn",
  validation: () => true,
};

export function ensureValidatorsRegistered(): void {
  if (!registered) {
    registered = true;
    for (const validator of availableValidators) {
      ValidationService.registerValidator(validator);
    }
  }
  ValidationService.registerValidator(UTAN_KONTROLLSIFFRA);
}
