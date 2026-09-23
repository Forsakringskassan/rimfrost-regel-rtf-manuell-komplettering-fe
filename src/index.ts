import type { App } from "vue";
import { createApp } from "vue";
import { ValidationPlugin } from "@fkui/vue";
import { createPinia } from "pinia";
import AppComponent from "./App.vue";

export function init(mount: string | Element, params?: { handlaggningId?: string | null }): App {
  const container = typeof mount === "string" ? document.querySelector(mount) : mount;

  if (!container) {
    throw new Error(
      `Container element not found: ${typeof mount === "string" ? mount : "[Element]"}`,
    );
  }

  // FKUI bubbles these up to the host, which has its own validation and
  // lifecycle handling; stopping them here keeps the remote self-contained.
  container.addEventListener("component-validity", (event: Event) => event.stopPropagation());
  container.addEventListener("component-unmount", (event: Event) => event.stopPropagation());

  const app = createApp(AppComponent, { handlaggningId: params?.handlaggningId ?? null });

  app.use(ValidationPlugin);
  app.use(createPinia());
  app.mount(container);

  return app;
}
