import { flushPromises } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { useKompletteringStore } from "../../stores/KompletteringStore";
import {
  TOMT_UNDERLAG,
  knapp,
  mockResponse,
  montera,
  stubFetch,
} from "../../utils/__tests__/testHelpers";

/** The id montera() defaults to; asserted against in the request paths. */
const HANDLAGGNING_ID = "h-123";

type Wrapper = ReturnType<typeof montera>;

/**
 * Submits the real form, so FKUI's validation gets its say, then waits for the
 * outcome to settle. FKUI validates asynchronously and the handler chains PATCH
 * into POST, so the caller says what it is waiting for rather than guessing a
 * number of microtask turns — a fixed count passes alone and fails under load.
 */
async function submitFormular(wrapper: Wrapper, settled: () => void): Promise<void> {
  // Through the button, as a handläggare does: it carries its own click handler
  // for the case where FKUI swallows the submit without reporting anything.
  await knapp(wrapper, "Klarmarkera")?.trigger("click");
  await vi.waitFor(async () => {
    await flushPromises();
    settled();
  });
}

async function fyllIFormular(wrapper: Wrapper): Promise<void> {
  await wrapper.find("input").setValue("19121212-1212");
  await wrapper.find("textarea").setValue("Sjukpenning");
}

/**
 * FTooltip emits toggle for both directions, so the tests drive it the way the
 * component reads it — a close must not count as an open.
 */
async function vaxlaTooltip(wrapper: Wrapper, isOpen: boolean): Promise<void> {
  wrapper.findComponent({ name: "FTooltip" }).vm.$emit("toggle", { isOpen });
  await flushPromises();
}

const oppna = (wrapper: Wrapper) => vaxlaTooltip(wrapper, true);
const stang = (wrapper: Wrapper) => vaxlaTooltip(wrapper, false);

/** Counting only the description requests keeps this immune to unrelated calls. */
function beskrivningAnrop(fetchMock: ReturnType<typeof stubFetch>) {
  return fetchMock.mock.calls.filter((call) =>
    String(call[0]).includes("/api/uppgiftsbeskrivning/"),
  );
}

describe("RtfKomplettering", () => {
  it("loads the komplettering for the given handlaggning on mount", async () => {
    const fetchMock = stubFetch(mockResponse({ body: TOMT_UNDERLAG }));
    montera();
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(`/api/${HANDLAGGNING_ID}/komplettering`),
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("shows the loaded values in the form", async () => {
    stubFetch(mockResponse({ body: { personnummer: "19121212-1212", avsikt: "Sjukpenning" } }));
    const wrapper = montera();
    await flushPromises();

    // FKUI renders a personnummer in the 10-digit form it asks people to type,
    // while the bound value stays the 12-digit one the BFF exchanges.
    expect(wrapper.find("input").element.value).toBe("121212+1212");
    expect(wrapper.find("textarea").element.value).toBe("Sjukpenning");
  });

  it("renders an empty form when the yrkande has no values yet", async () => {
    stubFetch(mockResponse({ body: TOMT_UNDERLAG }));
    const wrapper = montera();
    await flushPromises();

    expect(wrapper.find("form").exists()).toBe(true);
    expect(wrapper.find("input").element.value).toBe("");
    expect(wrapper.find("textarea").element.value).toBe("");
  });

  it("shows an error and no form when no handlaggning was passed", async () => {
    const fetchMock = stubFetch();
    const wrapper = montera(null);
    await flushPromises();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain("Ingen handläggning angiven");
    expect(wrapper.find("form").exists()).toBe(false);
  });

  it("shows an error instead of hiding the failure when loading fails", async () => {
    stubFetch(mockResponse({ ok: false, status: 500 }));
    const wrapper = montera();
    await flushPromises();

    expect(wrapper.text()).toContain("Kunde inte hämta uppgiftsdata");
  });

  it("offers no form when the load failed, so nothing can be saved over the yrkande", async () => {
    stubFetch(mockResponse({ ok: false, status: 500 }));
    const wrapper = montera();
    await flushPromises();

    // An empty form here would let Spara PATCH two empty strings over whatever
    // is already registered.
    expect(wrapper.find("form").exists()).toBe(false);
    expect(knapp(wrapper, "Spara")).toBeUndefined();
  });

  it("does not inherit state from a previous task on the host's shared store", async () => {
    // The store is the host's Pinia singleton and outlives a single mount.
    const store = useKompletteringStore();
    store.sparad = true;
    store.error = "Fel från förra uppgiften";

    stubFetch(mockResponse({ body: TOMT_UNDERLAG }));
    const wrapper = montera();
    await flushPromises();

    expect(store.sparad).toBe(false);
    expect(store.error).toBeNull();
    expect(wrapper.text()).not.toContain("Fel från förra uppgiften");
  });

  it("reloads when the host swaps in another task", async () => {
    const fetchMock = stubFetch(
      mockResponse({ body: { personnummer: "19121212-1212", avsikt: "Sjukpenning" } }),
      mockResponse({ body: { personnummer: "19900101-1234", avsikt: "Föräldrapenning" } }),
    );
    const wrapper = montera();
    await flushPromises();

    await wrapper.setProps({ handlaggningId: "h-456" });
    await flushPromises();

    expect(fetchMock.mock.calls[1]?.[0]).toContain("/api/h-456/komplettering");
    expect(wrapper.find("textarea").element.value).toBe("Föräldrapenning");
  });

  it("Spara sends the current field values without completing the task", async () => {
    const fetchMock = stubFetch(
      mockResponse({ body: TOMT_UNDERLAG }),
      mockResponse({ status: 204 }),
    );
    const wrapper = montera();
    await flushPromises();

    await fyllIFormular(wrapper);
    await knapp(wrapper, "Spara")?.trigger("click");
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      method: "PATCH",
      body: JSON.stringify({ personnummer: "19121212-1212", avsikt: "Sjukpenning" }),
    });
    expect(wrapper.text()).toContain("Uppgifterna är sparade");
  });

  it("Spara saves a form where only one field is filled in", async () => {
    const fetchMock = stubFetch(
      mockResponse({ body: TOMT_UNDERLAG }),
      mockResponse({ status: 204 }),
    );
    const wrapper = montera();
    await flushPromises();

    // Half-filled work is the case Spara exists for.
    await wrapper.find("textarea").setValue("Sjukpenning");
    await knapp(wrapper, "Spara")?.trigger("click");
    await flushPromises();

    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      method: "PATCH",
      body: JSON.stringify({ personnummer: "", avsikt: "Sjukpenning" }),
    });
    expect(wrapper.text()).toContain("Uppgifterna är sparade");
  });

  it("Spara refuses an entirely empty form rather than blanking the yrkande", async () => {
    const fetchMock = stubFetch(mockResponse({ body: TOMT_UNDERLAG }));
    const wrapper = montera();
    await flushPromises();

    await knapp(wrapper, "Spara")?.trigger("click");
    await flushPromises();

    // Only the initial GET: the PATCH would have rewritten both fields as empty.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(wrapper.text()).toContain("Det finns inget att spara");
    expect(useKompletteringStore().sparad).toBe(false);
  });

  it("clears the saved marker as soon as a field is edited again", async () => {
    stubFetch(mockResponse({ body: TOMT_UNDERLAG }), mockResponse({ status: 204 }));
    const wrapper = montera();
    await flushPromises();

    await fyllIFormular(wrapper);
    await knapp(wrapper, "Spara")?.trigger("click");
    await flushPromises();
    expect(useKompletteringStore().sparad).toBe(true);

    await wrapper.find("textarea").setValue("Föräldrapenning");
    expect(useKompletteringStore().sparad).toBe(false);
  });

  it("replaces the form with a confirmation once the task is completed", async () => {
    const fetchMock = stubFetch(
      mockResponse({ body: TOMT_UNDERLAG }),
      mockResponse({ status: 204 }),
      mockResponse({ status: 204 }),
    );
    const wrapper = montera();
    await flushPromises();
    await fyllIFormular(wrapper);

    await submitFormular(wrapper, () => {
      expect(wrapper.text()).toContain("uppgiften är klarmarkerad");
    });

    expect(fetchMock.mock.calls.map((call) => call[1]?.method)).toEqual([
      "GET",
      "PATCH",
      "POST",
    ]);
    expect(wrapper.find("form").exists()).toBe(false);
  });

  it("blocks completion and points at the empty fields when nothing is filled in", async () => {
    const fetchMock = stubFetch(mockResponse({ body: TOMT_UNDERLAG }));
    const wrapper = montera();
    await flushPromises();

    await submitFormular(wrapper, () => {
      expect(wrapper.text()).toContain("Uppgifterna är ofullständiga");
    });

    // Only the initial GET: nothing was sent to the BFF.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    // The summary names the fields, and each field says what it wants.
    expect(wrapper.text()).toContain("Gå till fältet som är markerat");
    expect(wrapper.text()).toContain("Fyll i personnumret");
    expect(wrapper.text()).toContain("Fyll i text");
  });

  it("saves again before completing when a field changed after the last Spara", async () => {
    const fetchMock = stubFetch(
      mockResponse({ body: TOMT_UNDERLAG }),
      mockResponse({ status: 204 }),
      mockResponse({ status: 204 }),
      mockResponse({ status: 204 }),
    );
    const wrapper = montera();
    await flushPromises();
    await fyllIFormular(wrapper);

    await knapp(wrapper, "Spara")?.trigger("click");
    await flushPromises();
    await wrapper.find("textarea").setValue("Föräldrapenning");

    await submitFormular(wrapper, () => {
      expect(wrapper.text()).toContain("uppgiften är klarmarkerad");
    });

    // The edit cleared the saved marker, so the change is written before done.
    expect(fetchMock.mock.calls.map((call) => call[1]?.method)).toEqual([
      "GET",
      "PATCH",
      "PATCH",
      "POST",
    ]);
    expect(fetchMock.mock.calls[2]?.[1]?.body).toBe(
      JSON.stringify({ personnummer: "19121212-1212", avsikt: "Föräldrapenning" }),
    );
  });

  it("fetches the help text the first time the tooltip is opened, and only then", async () => {
    const fetchMock = stubFetch(
      mockResponse({ body: TOMT_UNDERLAG }),
      mockResponse({ body: { beskrivning: "Hjälptext" } }),
    );
    const wrapper = montera();
    await flushPromises();
    expect(beskrivningAnrop(fetchMock)).toHaveLength(0);

    await oppna(wrapper);
    await stang(wrapper);
    await oppna(wrapper);

    // Reopening a tooltip that already has its text must not fetch again.
    expect(beskrivningAnrop(fetchMock)).toHaveLength(1);
  });

  it("does not refetch the help text when the tooltip is closed", async () => {
    const fetchMock = stubFetch(
      mockResponse({ body: TOMT_UNDERLAG }),
      mockResponse({ ok: false, status: 500 }),
    );
    const wrapper = montera();
    await flushPromises();

    await oppna(wrapper);
    // FTooltip emits toggle in both directions, so a close must not be read as
    // another open — least of all after a failure, with nothing on screen.
    await stang(wrapper);

    expect(beskrivningAnrop(fetchMock)).toHaveLength(1);
  });

  it("retries the help text on reopen after a failed fetch", async () => {
    const fetchMock = stubFetch(
      mockResponse({ body: TOMT_UNDERLAG }),
      mockResponse({ ok: false, status: 500 }),
      mockResponse({ body: { beskrivning: "Hjälptext" } }),
    );
    const wrapper = montera();
    await flushPromises();

    await oppna(wrapper);
    expect(useKompletteringStore().descriptionError).toBe(true);

    // A transient failure must not pin the tooltip to the error for the session.
    await stang(wrapper);
    await oppna(wrapper);

    expect(beskrivningAnrop(fetchMock)).toHaveLength(2);
    expect(useKompletteringStore().uppgiftsbeskrivning).toBe("Hjälptext");
  });
});
