/**
 * Mirrors `RtfKompletteringData` in rimfrost-regel-rtf-manuell-komplettering-openapi.
 *
 * Both fields are required in the spec but nullable: the whole point of the
 * komplettering task is that one or both are missing when it opens.
 */
export interface RtfKompletteringData {
  personnummer: string | null;
  avsikt: string | null;
}

/**
 * Mirrors `GetUtokadUppgiftsbeskrivningResponse` in
 * rimfrost-framework-regel-oul-openapi.
 */
export interface UppgiftsbeskrivningResponse {
  beskrivning?: string;
}

/** Outcome of POST /api/{handlaggningId}/komplettering/done. */
export const KlarmarkeraResultat = {
  /** 204 — komplettering registered, OUL task closed. */
  KLAR: "KLAR",
  /** 422 — the yrkande is still incomplete. */
  OFULLSTANDIG: "OFULLSTANDIG",
  /** 409 — the correlation state was already cleared by a timeout. */
  UTGANGEN: "UTGANGEN",
  /** Anything else: network failure or an unexpected status. */
  FEL: "FEL",
} as const;

export type KlarmarkeraResultat =
  (typeof KlarmarkeraResultat)[keyof typeof KlarmarkeraResultat];
