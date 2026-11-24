import { env, ensureEnvLoaded } from "../config/env";
import { useKompletteringStore } from "../stores/KompletteringStore";
import { SAKNAR_BEHORIGHET } from "../meddelanden";

/**
 * Thrown when there is no token to send, or when the BFF rejects the one sent
 * (401). Callers show SAKNAR_BEHORIGHET instead of their generic message, so a
 * missing login never looks like a broken service.
 */
export class SaknarBehorighetError extends Error {
  constructor(message = "Missing or rejected Authorization") {
    super(message);
    this.name = "SaknarBehorighetError";
  }
}

/** What a failed call shows: the login message for a token problem, otherwise `fallback`. */
export function felmeddelande(error: unknown, fallback: string): string {
  return error instanceof SaknarBehorighetError ? SAKNAR_BEHORIGHET : fallback;
}

/**
 * Every call to the BFF goes through here, so the base URL, the runtime-config
 * handshake, the Authorization header and the JSON contract have one home.
 *
 * The token is the logged-in handläggare's, passed by the portal as the
 * `authorization` prop (PORT-FR-03.6) and kept in the store by
 * RtfKomplettering.vue. It is the full header value and goes out unchanged:
 * its content belongs to FK's identity service and is not parsed here.
 * Without a token no request is made (RTFKF-NFR-01.5).
 */
export async function bffFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const authorization = useKompletteringStore().authorization;
  if (!authorization) {
    throw new SaknarBehorighetError("No Authorization from the portal");
  }

  await ensureEnvLoaded();
  const headers = new Headers(init.headers);
  headers.set("Authorization", authorization);
  const response = await fetch(`${env.bffUrl}${path}`, { ...init, headers });

  if (response.status === 401) {
    throw new SaknarBehorighetError("BFF responded 401");
  }
  return response;
}

/** The one place the BFF's non-2xx answers become an exception. */
export function assertOk(response: Response): void {
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
}

/**
 * For the endpoints that answer with a body. 204-returning calls use bffFetch
 * directly.
 *
 * `signal` lets a caller drop a load it no longer wants — see
 * fetchKomplettering, where a task swap supersedes the call in flight.
 */
export async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await bffFetch(path, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  });

  assertOk(response);

  const contentType = response.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    const text = await response.text();
    throw new Error(`Response is not JSON. Got: ${text.substring(0, 100)}`);
  }

  return (await response.json()) as T;
}

export function kompletteringPath(handlaggningId: string): string {
  return `/api/${handlaggningId}/komplettering`;
}
