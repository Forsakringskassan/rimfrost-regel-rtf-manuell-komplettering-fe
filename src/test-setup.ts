import { enableAutoUnmount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, vi } from "vitest";
import { useKompletteringStore } from "./stores/KompletteringStore";
import { TOKEN } from "./utils/__tests__/testToken";

// Seeding the runtime global makes ensureEnvLoaded short-circuit instead of
// injecting a <script> tag, which happy-dom refuses to load and reports as an
// unhandled DOMException. It also gives the call helpers a stable base URL to
// assert against.
(window as unknown as Record<string, unknown>).__RTF_MANUELL_KOMPLETTERING_FE_ENV__ = {
  RUNTIME_BFF_URL: "http://bff.test",
};

beforeEach(() => {
  setActivePinia(createPinia());
  // As if the portal had passed a token: the call helpers refuse to run without
  // one. Tests about a missing token clear it themselves.
  useKompletteringStore().authorization = TOKEN;
  // The helpers log the failure paths on purpose; the suite exercises them.
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// FKUI's ValidationPlugin keeps a registry outside the component, so a wrapper
// left mounted makes the next test's form validate against stale fields.
enableAutoUnmount(afterEach);
