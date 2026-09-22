import { describe, expect, it } from "vitest";
import { fetchKomplettering } from "../fetchKomplettering";
import { useKompletteringStore } from "../../stores/KompletteringStore";
import { TOMT_UNDERLAG, mockResponse, stubFetch } from "./testHelpers";

describe("fetchKomplettering", () => {
  it("requests the komplettering endpoint for the given handlaggning", async () => {
    const fetchMock = stubFetch(mockResponse({ body: TOMT_UNDERLAG }));
    await fetchKomplettering("h-123");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/h-123/komplettering"),
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("returns the loaded data", async () => {
    stubFetch(mockResponse({ body: { personnummer: "19121212-1212", avsikt: "Sjukpenning" } }));
    await expect(fetchKomplettering("h-123")).resolves.toEqual({
      personnummer: "19121212-1212",
      avsikt: "Sjukpenning",
    });
  });

  it("treats null fields as data, not as failure", async () => {
    stubFetch(mockResponse({ body: TOMT_UNDERLAG }));
    await expect(fetchKomplettering("h-123")).resolves.toEqual(TOMT_UNDERLAG);
    expect(useKompletteringStore().error).toBeNull();
  });

  it("returns null and sets an error on HTTP error", async () => {
    stubFetch(mockResponse({ ok: false, status: 500 }));
    await expect(fetchKomplettering("h-123")).resolves.toBeNull();
    expect(useKompletteringStore().error).toContain("Kunde inte hämta");
  });

  it("returns null and sets an error when the response is not JSON", async () => {
    stubFetch(mockResponse({ contentType: "text/html", text: "<html>error</html>" }));
    await expect(fetchKomplettering("h-123")).resolves.toBeNull();
    expect(useKompletteringStore().error).toContain("Kunde inte hämta");
  });

  it("clears the loading flag whichever way the call ends", async () => {
    stubFetch(mockResponse({ ok: false }));
    await fetchKomplettering("h-123");
    expect(useKompletteringStore().loading).toBe(false);
  });
});
