import { describe, expect, it } from "vitest";
import { sparaKomplettering } from "../sparaKomplettering";
import { useKompletteringStore } from "../../stores/KompletteringStore";
import { mockResponse, stubFetch } from "./testHelpers";

describe("sparaKomplettering", () => {
  it("PATCHes both fields to the komplettering endpoint", async () => {
    const fetchMock = stubFetch(mockResponse({ status: 204 }));
    await sparaKomplettering("h-123", { personnummer: "19900101-1234", avsikt: "Sjukpenning" });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/h-123/komplettering"),
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ personnummer: "19900101-1234", avsikt: "Sjukpenning" }),
      }),
    );
  });

  it("sends an empty string rather than null for a missing field", async () => {
    const fetchMock = stubFetch(mockResponse({ status: 204 }));
    await sparaKomplettering("h-123", { personnummer: null, avsikt: null });
    expect(fetchMock.mock.calls[0]?.[1]?.body).toBe(
      JSON.stringify({ personnummer: "", avsikt: "" }),
    );
  });

  it("marks the form as saved on success", async () => {
    stubFetch(mockResponse({ status: 204 }));
    await expect(
      sparaKomplettering("h-123", { personnummer: "19900101-1234", avsikt: "Sjukpenning" }),
    ).resolves.toBe(true);
    expect(useKompletteringStore().sparad).toBe(true);
  });

  it("reports failure and sets an error on HTTP error", async () => {
    stubFetch(mockResponse({ ok: false, status: 400 }));
    await expect(
      sparaKomplettering("h-123", { personnummer: "x", avsikt: "y" }),
    ).resolves.toBe(false);
    const store = useKompletteringStore();
    expect(store.sparad).toBe(false);
    expect(store.error).toContain("Kunde inte spara");
  });

  it("clears the saving flag whichever way the call ends", async () => {
    stubFetch(mockResponse({ ok: false }));
    await sparaKomplettering("h-123", { personnummer: "x", avsikt: "y" });
    expect(useKompletteringStore().saving).toBe(false);
  });
});
