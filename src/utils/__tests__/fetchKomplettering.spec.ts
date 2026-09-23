import { describe, expect, it, vi } from "vitest";
import { fetchKomplettering } from "../fetchKomplettering";
import { useKompletteringStore } from "../../stores/KompletteringStore";
import { TOMT_UNDERLAG, mockResponse, stubFetch, uppskjutetSvar } from "./testHelpers";

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
    stubFetch(mockResponse({ body: { personnummer: "19900101-1239", avsikt: "Sjukpenning" } }));
    await expect(fetchKomplettering("h-123")).resolves.toEqual({
      personnummer: "19900101-1239",
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

  it("passes the abort signal on to the request", async () => {
    const fetchMock = stubFetch(mockResponse({ body: TOMT_UNDERLAG }));
    const controller = new AbortController();
    await fetchKomplettering("h-123", controller.signal);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ signal: controller.signal }),
    );
  });

  // The store is the host's Pinia singleton: a superseded load shares it with
  // the load that replaced it, so it must write nothing once it is aborted.
  describe("once the call has been aborted", () => {
    /** Starts a load, aborts it, and hands back the still-pending response. */
    function paboradOchAvbruten() {
      const svar = uppskjutetSvar<ReturnType<typeof mockResponse>>();
      vi.stubGlobal("fetch", vi.fn().mockReturnValue(svar.promise));
      const controller = new AbortController();
      const laddning = fetchKomplettering("h-123", controller.signal);
      controller.abort();
      return { svar, laddning };
    }

    it("returns null instead of the data it fetched", async () => {
      const { svar, laddning } = paboradOchAvbruten();
      svar.losUt(mockResponse({ body: { personnummer: "19900101-1239", avsikt: "Sjukpenning" } }));
      await expect(laddning).resolves.toBeNull();
    });

    it("leaves the loading flag to the call that replaced it", async () => {
      const { svar, laddning } = paboradOchAvbruten();
      const store = useKompletteringStore();
      // What the replacing call has already done by the time this one lands.
      store.loading = true;
      svar.losUt(mockResponse({ body: TOMT_UNDERLAG }));
      await laddning;
      expect(store.loading).toBe(true);
    });

    it("reports no error of its own when it fails", async () => {
      const { svar, laddning } = paboradOchAvbruten();
      svar.avvisa(new DOMException("The operation was aborted.", "AbortError"));
      await expect(laddning).resolves.toBeNull();
      expect(useKompletteringStore().error).toBeNull();
    });
  });
});
