import { flushPromises, mount } from "@vue/test-utils";
import { ValidationPlugin } from "@fkui/vue";
import { defineComponent, h } from "vue";
import RtfKomplettering from "../RtfKomplettering.vue";
import { describe, expect, it } from "vitest";
import { useKompletteringStore } from "../../stores/KompletteringStore";
import { SAKNAR_BEHORIGHET } from "../../meddelanden";
import {
  TOKEN,
  TOMT_UNDERLAG,
  knapp,
  mockResponse,
  montera,
  stubFetch,
} from "../../utils/__tests__/testHelpers";

// In a file of its own: FKUI's validation registry is module-global and grows
// with every mount in a file (see docs/teknisk-spec.md), and these mounts have
// nothing to do with field validation.
describe("RtfKomplettering and the portal's token (PORT-FR-03.6)", () => {
  it("loads the underlag with the token as Authorization", async () => {
    const fetchMock = stubFetch(mockResponse({ body: TOMT_UNDERLAG }));
    montera();
    await flushPromises();

    expect(new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get("Authorization")).toBe(
      TOKEN,
    );
  });

  it("saves with the token as Authorization", async () => {
    const fetchMock = stubFetch(
      mockResponse({ body: TOMT_UNDERLAG }),
      mockResponse({ status: 204 }),
    );
    const wrapper = montera();
    await flushPromises();
    await wrapper.find("input").setValue("19900101-1239");
    await wrapper.find("textarea").setValue("Sjukpenning");
    await knapp(wrapper, "Spara")?.trigger("click");
    await flushPromises();

    const patch = fetchMock.mock.calls.find((call) => call[1]?.method === "PATCH");
    expect(new Headers(patch?.[1]?.headers).get("Authorization")).toBe(TOKEN);
  });

  it("calls nothing and says why when the portal passes no token", async () => {
    const fetchMock = stubFetch();
    const wrapper = montera("h-123", { authorization: null });
    await flushPromises();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain(SAKNAR_BEHORIGHET);
    expect(wrapper.find("form").exists()).toBe(false);
  });

  it("shows the login message, not a generic failure, when the BFF answers 401", async () => {
    stubFetch(mockResponse({ ok: false, status: 401 }));
    const wrapper = montera();
    await flushPromises();

    expect(wrapper.text()).toContain(SAKNAR_BEHORIGHET);
    expect(wrapper.text()).not.toContain("Kunde inte hämta uppgiftsdata");
    expect(wrapper.find("form").exists()).toBe(false);
  });

  it("reloads with the new token when the handläggare changes", async () => {
    const fetchMock = stubFetch(
      mockResponse({ body: { personnummer: "19900101-1239", avsikt: "Sjukpenning" } }),
      mockResponse({ body: TOMT_UNDERLAG }),
    );
    const wrapper = montera();
    await flushPromises();

    await wrapper.setProps({ authorization: "Bearer 1:annan-handlaggare" });
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(new Headers(fetchMock.mock.calls[1]?.[1]?.headers).get("Authorization")).toBe(
      "Bearer 1:annan-handlaggare",
    );
    expect(wrapper.find("input").element.value).toBe("");
  });

  it("clears the underlag when the handläggare logs out", async () => {
    stubFetch(mockResponse({ body: { personnummer: "19900101-1239", avsikt: "Sjukpenning" } }));
    const wrapper = montera();
    await flushPromises();

    await wrapper.setProps({ authorization: null });
    await flushPromises();

    expect(wrapper.find("form").exists()).toBe(false);
    expect(wrapper.text()).toContain(SAKNAR_BEHORIGHET);
  });

  it("leaves no token in the portal's shared store once unmounted", async () => {
    stubFetch(mockResponse({ body: TOMT_UNDERLAG }));
    const wrapper = montera();
    await flushPromises();
    expect(useKompletteringStore().authorization).toBe(TOKEN);

    wrapper.unmount();

    expect(useKompletteringStore().authorization).toBeNull();
  });

  it("keeps the new token when the portal remounts by changing the key", async () => {
    // Like OppnadUppgift.vue in the portal: a new key means a new instance,
    // and Vue sets that up before it runs the old instance's unmounted hooks.
    const Vard = defineComponent({
      props: { nyckel: { type: String, required: true }, token: { type: String, required: true } },
      setup(props) {
        return () =>
          h(RtfKomplettering, {
            key: props.nyckel,
            handlaggningId: "h-123",
            authorization: props.token,
          });
      },
    });
    stubFetch(mockResponse({ body: TOMT_UNDERLAG }), mockResponse({ body: TOMT_UNDERLAG }));
    const wrapper = mount(Vard, {
      props: { nyckel: "1", token: TOKEN },
      global: { plugins: [ValidationPlugin] },
    });
    await flushPromises();

    await wrapper.setProps({ nyckel: "2", token: "Bearer 1:ny" });
    await flushPromises();

    expect(useKompletteringStore().authorization).toBe("Bearer 1:ny");
  });

  it("asks for a new login when the help text is refused with 401", async () => {
    stubFetch(mockResponse({ body: TOMT_UNDERLAG }), mockResponse({ ok: false, status: 401 }));
    const wrapper = montera();
    await flushPromises();

    wrapper.findComponent({ name: "FTooltip" }).vm.$emit("toggle", { isOpen: true });
    await flushPromises();

    expect(wrapper.text()).toContain(SAKNAR_BEHORIGHET);
  });
});
