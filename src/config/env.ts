const RUNTIME_GLOBAL = "__RTF_MANUELL_KOMPLETTERING_FE_ENV__";

type RuntimeEnv = Partial<Record<string, string>>;

function readRuntimeGlobal(): RuntimeEnv {
  return (window as unknown as Record<string, RuntimeEnv | undefined>)[RUNTIME_GLOBAL] ?? {};
}

/**
 * Whether runtime-config.js has run. Not the same as "it set any values": the
 * shipped file assigns an empty object, so counting keys would keep reporting
 * "not loaded" and inject a redundant second copy of the script on every
 * standalone run.
 */
function runtimeConfigHasRun(): boolean {
  return RUNTIME_GLOBAL in window;
}

/**
 * Resolves the whole config in one place, so a new variable is added once
 * rather than here and again in ensureEnvLoaded — where forgetting it would
 * mean the variable silently never picks up its runtime value inside a Module
 * Federation host, the very case this module exists for.
 */
function readEnv() {
  const runtime = readRuntimeGlobal();
  return {
    bffUrl: runtime.RUNTIME_BFF_URL || import.meta.env.VITE_BFF_URL || "",
    devHandlaggningId:
      runtime.RUNTIME_DEV_HANDLAGGNING_ID || import.meta.env.VITE_DEV_HANDLAGGNING_ID || "",
  };
}

/**
 * Centralized environment configuration.
 *
 * In development (npm run dev): values come from VITE_* in .env via Vite.
 * In containers: RUNTIME_* values are set via a mounted runtime-config.js
 * (ConfigMap in OpenShift, volume mount in Docker) and take precedence.
 *
 * An empty bffUrl is a valid, and the default, local setting: requests then go
 * to relative "/api/..." paths, which the Vite dev server proxies to the BFF.
 *
 * Namespaced (not window._env_): this app is loaded as a Module Federation
 * remote inside a shell that shares one window with it, so a shared global
 * would let this app's config leak into — or be clobbered by — the shell's.
 */
export const env = readEnv();

// Standalone (npm run dev / preview): index.html's own <script> tag has
// already run runtime-config.js before this module executes, so `env`
// above is already correct.
//
// As a Module Federation remote inside a shell (e.g. loaded by
// portal-handlaggare): only this JS chunk is loaded, never this app's own
// index.html, so that <script> tag never runs and the global stays unset.
// ensureEnvLoaded self-loads runtime-config.js from this app's own origin
// instead, resolved via import.meta.url — which always points at this
// module's own deployed URL, regardless of which host imported it.
let runtimeEnvReady: Promise<void> | null = null;

export function ensureEnvLoaded(): Promise<void> {
  if (!runtimeEnvReady) {
    runtimeEnvReady = new Promise<void>((resolve) => {
      if (runtimeConfigHasRun()) {
        resolve();
        return;
      }
      try {
        const ownOrigin = new URL(import.meta.url).origin;
        const script = document.createElement("script");
        script.src = `${ownOrigin}/runtime-config.js`;
        script.onload = () => resolve();
        script.onerror = () => resolve();
        document.head.appendChild(script);
      } catch {
        // Loading runtime-config.js is best-effort: e.g. some test
        // environments disable script loading and throw synchronously
        // instead of firing onerror. Fall back to the VITE_*/default value.
        resolve();
      }
    }).then(() => {
      Object.assign(env, readEnv());
    });
  }
  return runtimeEnvReady;
}

// Started at import time rather than on the first BFF call: the promise is
// memoized, so the later await in bffFetch is free, and the script download
// overlaps app startup instead of being serialized ahead of the first GET.
void ensureEnvLoaded();
