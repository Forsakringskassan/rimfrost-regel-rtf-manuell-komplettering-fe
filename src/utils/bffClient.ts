import { env, ensureEnvLoaded } from "../config/env";

/**
 * Every call to the BFF goes through here, so the base URL, the runtime-config
 * handshake and the JSON contract have one home. The Authorization header this
 * app does not yet forward (see docs/teknisk-spec.md) becomes a one-line change
 * rather than a four-file change.
 */
export async function bffFetch(path: string, init?: RequestInit): Promise<Response> {
  await ensureEnvLoaded();
  return fetch(`${env.bffUrl}${path}`, init);
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
