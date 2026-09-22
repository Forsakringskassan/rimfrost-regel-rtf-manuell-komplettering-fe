import { flushPromises } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { useKompletteringStore } from "../../stores/KompletteringStore";
import {
  TOMT_UNDERLAG,
  knapp,
  mockResponse,
  montera,
  stubFetch,
} from "../../utils/__tests__/testHelpers";

/**
 * Which status messages may share the screen. Kept in its own file: the flows in
 * RtfKomplettering.spec.ts submit the real form, and FKUI validates
 * asynchronously against a module-global registry, so a submit can still settle
 * after its test ended and write into whichever pinia is active by then.
 */
describe("RtfKomplettering meddelanden", () => {
  async function mountaMedUnderlag() {
    stubFetch(mockResponse({ body: TOMT_UNDERLAG }));
    const wrapper = montera();
    await flushPromises();
    return { wrapper, store: useKompletteringStore() };
  }

  it("never claims the data is saved while an error is on screen", async () => {
    const { wrapper, store } = await mountaMedUnderlag();

    store.sparad = true;
    await flushPromises();
    expect(wrapper.text()).toContain("Uppgifterna är sparade");

    // Reachable for real: Spara succeeds, Klarmarkera then fails. Both facts are
    // true at once, but shown together they read as a contradiction.
    store.error = "Uppgifterna är ofullständiga.";
    await flushPromises();

    expect(wrapper.text()).toContain("Uppgifterna är ofullständiga");
    expect(wrapper.text()).not.toContain("Uppgifterna är sparade");
  });

  it.each([true, false])(
    "reports incomplete data on Klarmarkera, host ValidationPlugin installed: %s",
    async (medValidationPlugin) => {
      // Without the plugin FValidationForm swallows the submit and renders no
      // message of its own — the dead-button case. The report must survive both.
      const fetchMock = stubFetch(mockResponse({ body: TOMT_UNDERLAG }));
      const wrapper = montera("h-123", { medValidationPlugin });
      await flushPromises();

      await knapp(wrapper, "Klarmarkera")?.trigger("click");
      await flushPromises();

      const boxes = wrapper
        .findAllComponents({ name: "FMessageBox" })
        .map((box) => box.text())
        .join(" ");
      expect(boxes).toContain("Uppgifterna är ofullständiga");
      // Nothing beyond the initial GET: incomplete data never reaches the BFF.
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );

  it("names the personnummer as the problem when it fails its check digit", async () => {
    const { wrapper } = await mountaMedUnderlag();

    await wrapper.find("input").setValue("19900101-1234");
    await wrapper.find("textarea").setValue("Sjukpenning");
    await knapp(wrapper, "Klarmarkera")?.trigger("click");
    await flushPromises();

    // Both fields are filled, so "ofullständiga" would send the handläggare
    // looking for an empty field that is not there.
    expect(wrapper.text()).toContain("Personnumret är inte giltigt");
    expect(wrapper.text()).not.toContain("Uppgifterna är ofullständiga");
  });

  it("brings the saved confirmation back once the error clears", async () => {
    const { wrapper, store } = await mountaMedUnderlag();

    store.sparad = true;
    store.error = "Något gick fel";
    await flushPromises();
    expect(wrapper.text()).not.toContain("Uppgifterna är sparade");

    store.error = null;
    await flushPromises();
    expect(wrapper.text()).toContain("Uppgifterna är sparade");
  });
});
