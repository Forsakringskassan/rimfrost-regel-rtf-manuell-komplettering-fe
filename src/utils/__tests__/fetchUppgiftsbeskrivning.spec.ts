import { describe, expect, it } from "vitest";
import { fetchUppgiftsbeskrivning } from "../fetchUppgiftsbeskrivning";
import { useKompletteringStore } from "../../stores/KompletteringStore";
import { mockResponse, stubFetch } from "./testHelpers";

const UPPGIFTSTYP = "RTF_MANUELL_KOMPLETTERING";

describe("fetchUppgiftsbeskrivning", () => {
  it("requests the description for the given uppgiftstyp", async () => {
    const fetchMock = stubFetch(mockResponse({ body: { beskrivning: "Text" } }));
    await fetchUppgiftsbeskrivning(UPPGIFTSTYP);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(`/api/uppgiftsbeskrivning/${UPPGIFTSTYP}`),
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("stores the description on success", async () => {
    stubFetch(mockResponse({ body: { beskrivning: "Så här kompletterar du" } }));
    await fetchUppgiftsbeskrivning(UPPGIFTSTYP);
    const store = useKompletteringStore();
    expect(store.uppgiftsbeskrivning).toBe("Så här kompletterar du");
    expect(store.descriptionError).toBe(false);
  });

  it("flags a description error on HTTP error", async () => {
    stubFetch(mockResponse({ ok: false, status: 404 }));
    await fetchUppgiftsbeskrivning(UPPGIFTSTYP);
    const store = useKompletteringStore();
    expect(store.uppgiftsbeskrivning).toBe("");
    expect(store.descriptionError).toBe(true);
  });

  it("flags a description error when the payload has no beskrivning", async () => {
    stubFetch(mockResponse({ body: {} }));
    await fetchUppgiftsbeskrivning(UPPGIFTSTYP);
    expect(useKompletteringStore().descriptionError).toBe(true);
  });

  it("keeps the description failure off the main error field", async () => {
    stubFetch(mockResponse({ ok: false, status: 404 }));
    await fetchUppgiftsbeskrivning(UPPGIFTSTYP);
    expect(useKompletteringStore().error).toBeNull();
  });

  it("clears the loading flag whichever way the call ends", async () => {
    stubFetch(mockResponse({ ok: false }));
    await fetchUppgiftsbeskrivning(UPPGIFTSTYP);
    expect(useKompletteringStore().descriptionLoading).toBe(false);
  });
});
