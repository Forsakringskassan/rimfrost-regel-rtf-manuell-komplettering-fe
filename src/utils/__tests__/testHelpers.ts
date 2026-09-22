import { mount } from "@vue/test-utils";
import { ValidationPlugin } from "@fkui/vue";
import { vi } from "vitest";
import RtfKomplettering from "../../components/RtfKomplettering.vue";

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

/**
 * The one place the component's mount contract lives, so a new plugin or prop
 * is a one-line change rather than a hunt through both component specs.
 *
 * No pinia is created here: test-setup.ts activates one before every test, and
 * the component and the test body both resolve the store through it.
 *
 * `medValidationPlugin: false` reproduces the host that never installed
 * ValidationPlugin — the plugin has to be genuinely absent, so the directive is
 * stubbed instead to keep the template compiling.
 */
export function montera(
  handlaggningId: string | null = "h-123",
  { medValidationPlugin = true }: { medValidationPlugin?: boolean } = {},
) {
  return mount(RtfKomplettering, {
    props: { handlaggningId },
    global: {
      plugins: medValidationPlugin ? [ValidationPlugin] : [],
      directives: medValidationPlugin ? {} : { validation: {} },
    },
    attachTo: document.body,
  });
}

/** Buttons are found by their visible text, as a handläggare reads them. */
export function knapp(wrapper: ReturnType<typeof montera>, text: string) {
  return wrapper.findAll("button").find((button) => button.text().includes(text));
}
