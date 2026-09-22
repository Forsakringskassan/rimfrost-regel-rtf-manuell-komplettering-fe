import { createPinia, setActivePinia } from "pinia";
import { describe, expect, it } from "vitest";
import { slutforKomplettering } from "../slutforKomplettering";
import { useKompletteringStore } from "../../stores/KompletteringStore";
import { KlarmarkeraResultat } from "../../types";
import { mockResponse, stubFetch } from "./testHelpers";

const DATA = { personnummer: "19900101-1239", avsikt: "Sjukpenning" };

function methodsOf(fetchMock: ReturnType<typeof stubFetch>) {
  return fetchMock.mock.calls.map((call) => call[1]?.method);
}

describe("slutforKomplettering", () => {
  // FKUI's required-validation should stop these before they reach here, but it
  // only does so when the host registered the validators against the same
  // @fkui/logic instance this remote renders with. These cover the case it did not.
  it.each([
    ["both fields empty", { personnummer: "", avsikt: "" }],
    ["personnummer empty", { personnummer: "", avsikt: "Sjukpenning" }],
    ["avsikt empty", { personnummer: "19900101-1239", avsikt: "" }],
    ["both null", { personnummer: null, avsikt: null }],
    ["whitespace only", { personnummer: "  ", avsikt: "   " }],
  ])("reports incomplete data without calling the BFF: %s", async (_name, data) => {
    const fetchMock = stubFetch();

    await expect(slutforKomplettering("h-123", data)).resolves.toBe(
      KlarmarkeraResultat.OFULLSTANDIG,
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(useKompletteringStore().error).toContain("Uppgifterna är ofullständiga");
  });

  it("rejects a personnummer that fails its check digit without calling the BFF", async () => {
    const fetchMock = stubFetch();

    await expect(
      slutforKomplettering("h-123", { personnummer: "19900101-1234", avsikt: "Sjukpenning" }),
    ).resolves.toBe(KlarmarkeraResultat.OFULLSTANDIG);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(useKompletteringStore().error).toContain("Personnumret är inte giltigt");
  });

  it("says the same thing whether this app or the rule service rejected it", async () => {
    const egetMeddelande = await (async () => {
      stubFetch();
      await slutforKomplettering("h-123", { personnummer: "", avsikt: "" });
      return useKompletteringStore().error;
    })();

    setActivePinia(createPinia());
    const franRegeltjansten = await (async () => {
      stubFetch(mockResponse({ status: 204 }), mockResponse({ ok: false, status: 422 }));
      await slutforKomplettering("h-123", DATA);
      return useKompletteringStore().error;
    })();

    expect(egetMeddelande).toBe(franRegeltjansten);
  });

  it("saves before completing", async () => {
    const fetchMock = stubFetch(mockResponse({ status: 204 }), mockResponse({ status: 204 }));
    await expect(slutforKomplettering("h-123", DATA)).resolves.toBe(KlarmarkeraResultat.KLAR);
    expect(methodsOf(fetchMock)).toEqual(["PATCH", "POST"]);
  });

  it("does not complete when the save failed", async () => {
    const fetchMock = stubFetch(mockResponse({ ok: false, status: 400 }));
    await expect(slutforKomplettering("h-123", DATA)).resolves.toBe(KlarmarkeraResultat.FEL);
    expect(methodsOf(fetchMock)).toEqual(["PATCH"]);
    expect(useKompletteringStore().error).toContain("Kunde inte spara");
  });

  it("skips the redundant save when the form is already saved", async () => {
    const store = useKompletteringStore();
    store.sparad = true;
    const fetchMock = stubFetch(mockResponse({ status: 204 }));

    await expect(slutforKomplettering("h-123", DATA)).resolves.toBe(KlarmarkeraResultat.KLAR);

    expect(methodsOf(fetchMock)).toEqual(["POST"]);
  });

  it("passes the completion outcome through unchanged", async () => {
    stubFetch(mockResponse({ status: 204 }), mockResponse({ ok: false, status: 422 }));
    await expect(slutforKomplettering("h-123", DATA)).resolves.toBe(
      KlarmarkeraResultat.OFULLSTANDIG,
    );
  });
});
