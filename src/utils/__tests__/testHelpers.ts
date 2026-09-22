import { vi } from "vitest";

interface MockResponseOptions {
  ok?: boolean;
  status?: number;
  contentType?: string | null;
  body?: unknown;
  text?: string;
}

/** Minimal stand-in for the parts of `Response` the call helpers touch. */
export function mockResponse({
  ok = true,
  status = ok ? 200 : 500,
  contentType = "application/json",
  body = {},
  text = "",
}: MockResponseOptions = {}) {
  return {
    ok,
    status,
    headers: {
      get: (key: string) => (key.toLowerCase() === "content-type" ? contentType : null),
    },
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(text),
  };
}

export function stubFetch(...responses: ReturnType<typeof mockResponse>[]) {
  const fetchMock = vi.fn();
  for (const response of responses) {
    fetchMock.mockResolvedValueOnce(response);
  }
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

/** An empty komplettering, the state a freshly opened task is in. */
export const TOMT_UNDERLAG = { personnummer: null, avsikt: null };
