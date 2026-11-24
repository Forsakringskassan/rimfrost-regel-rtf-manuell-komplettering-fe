import { describe, expect, it } from "vitest";
import { SaknarBehorighetError, bffFetch, felmeddelande, getJson } from "../bffClient";
import { useKompletteringStore } from "../../stores/KompletteringStore";
import { SAKNAR_BEHORIGHET } from "../../meddelanden";
import { TOKEN, mockResponse, stubFetch } from "./testHelpers";

/** The headers a stubbed fetch was called with, whatever shape they were passed in. */
function skickadeHeaders(fetchMock: ReturnType<typeof stubFetch>): Headers {
  return new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
}

describe("bffFetch", () => {
  it("sends the portal's token unchanged as Authorization", async () => {
    const fetchMock = stubFetch(mockResponse({ status: 204 }));
    await bffFetch("/api/h-123/komplettering", { method: "PATCH" });
    expect(skickadeHeaders(fetchMock).get("Authorization")).toBe(TOKEN);
  });

  it("keeps the caller's own headers next to Authorization", async () => {
    const fetchMock = stubFetch(mockResponse({ status: 204 }));
    await bffFetch("/api/x", { headers: { "Content-Type": "application/json" } });
    const headers = skickadeHeaders(fetchMock);
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(headers.get("Authorization")).toBe(TOKEN);
  });

  it("sends Authorization on GETs through getJson too", async () => {
    const fetchMock = stubFetch(mockResponse({ body: {} }));
    await getJson("/api/x");
    const headers = skickadeHeaders(fetchMock);
    expect(headers.get("Authorization")).toBe(TOKEN);
    expect(headers.get("Accept")).toBe("application/json");
  });

  it("makes no request at all without a token", async () => {
    useKompletteringStore().authorization = null;
    const fetchMock = stubFetch();
    await expect(bffFetch("/api/x")).rejects.toBeInstanceOf(SaknarBehorighetError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("turns a 401 from the BFF into SaknarBehorighetError", async () => {
    stubFetch(mockResponse({ ok: false, status: 401 }));
    await expect(bffFetch("/api/x")).rejects.toBeInstanceOf(SaknarBehorighetError);
  });

  it("passes other failures through for the caller to judge", async () => {
    stubFetch(mockResponse({ ok: false, status: 422 }));
    await expect(bffFetch("/api/x")).resolves.toMatchObject({ status: 422 });
  });
});

describe("felmeddelande", () => {
  it("gives the login message for a token problem", () => {
    expect(felmeddelande(new SaknarBehorighetError(), "Annat fel")).toBe(SAKNAR_BEHORIGHET);
  });

  it("gives the caller's fallback for anything else", () => {
    expect(felmeddelande(new Error("boom"), "Annat fel")).toBe("Annat fel");
  });
});
