import { defineConfig } from "vite";
import { federation } from "@module-federation/vite";
import vue from "@vitejs/plugin-vue";
import vueDevTools from "vite-plugin-vue-devtools";

export default defineConfig({
  plugins: [
    federation({
      // Unique per remote: the portal addresses remotes by scope, so this must
      // not collide with the other rule micro-frontends (e.g. "remoteApp").
      name: "remoteKompletteringApp",
      filename: "remoteEntry.js",
      exposes: {
        "./RtfKomplettering": "./src/components/RtfKomplettering.vue",
      },
      shared: {
        vue: { singleton: true, requiredVersion: "^3.5.24" },
        "@fkui/vue": { singleton: true, requiredVersion: "^6.24.1" },
        // @fkui/logic holds ValidationService, the module-level registry the
        // portal's ValidationPlugin writes the validators into. A second copy
        // here means the fields validate against an empty registry.
        "@fkui/logic": { singleton: true, requiredVersion: "^6.24.1" },
        pinia: { singleton: true, requiredVersion: "^3.0.4" },
      },
      manifest: true,
      publicPath: "auto",
      dts: false,
    }),
    vue(),
    vueDevTools(),
  ],
  preview: {
    // Same port as the dev server below — you never run both at once, and
    // 3033 is already bekraftabeslut-fe's dev port (see the portal's
    // remotes.json devEntry), which strictPort would turn into a hard failure.
    port: 3032,
    strictPort: true,
    cors: true,
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  },
  server: {
    // With VITE_BFF_URL unset the app fetches relative "/api/..." paths, which
    // this proxy forwards to the BFF — same origin, so no CORS setup needed.
    proxy: {
      "/api": {
        target: "http://localhost:9004",
        changeOrigin: true,
      },
    },
    port: 3032,
    strictPort: true,
    cors: true,
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  },
  base: "./",
  build: {
    target: "esnext",
    // Per-entry CSS. With a single merged stylesheet the standalone entry's
    // @fkui/design reset and main.scss font import land in the remote's sync
    // assets and restyle whatever host page loads it.
    cssCodeSplit: true,
    // The oversized chunk is Module Federation's fallback copy of the shared
    // @fkui/vue, which a host that provides its own never downloads.
    chunkSizeWarningLimit: 900,
  },
});
