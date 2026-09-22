# rimfrost-regel-rtf-manuell-komplettering-fe

Micro frontend for completing an incomplete yrkande before a manual RTF check. When a yrkande
is missing a personnummer or an avsikt the manual check cannot run, and a komplettering task
lands on the handläggare. This app is the form they fill in, loaded into
`rimfrost-portal-handlaggare` via Module Federation.

It talks only to `rimfrost-regel-rtf-manuell-komplettering-bff`, which in turn fronts the
`rimfrost-regel-rtf-manuell-komplettering` rule service.

```
[Portal (host)] ──Module Federation──> [This app] ──REST──> [Komplettering BFF] ──> [Rule service]
```

## Running it

You need Node 22+ and the BFF on port 9004.

```bash
npm install
cp .env.example .env     # then set VITE_DEV_HANDLAGGNING_ID
npm run dev              # http://localhost:3032
```

With `VITE_BFF_URL` left empty the app calls relative `/api/...` paths and Vite's dev proxy
forwards them to `http://localhost:9004`. Same origin, so there is nothing to configure for
CORS. If you instead point `VITE_BFF_URL` at an absolute URL, add this app's origin to the
BFF's allowed origins:

```bash
CORS_ORIGINS=http://localhost:3032 ./mvnw quarkus:dev
```

Standalone there is no host to supply a task, so set `VITE_DEV_HANDLAGGNING_ID` to a
handlaggningId that has an open komplettering task in the OUL.

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on 3032 |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Build, then serve the result on 3033 |
| `npm test` | Vitest in watch mode |
| `npm run test:run` | Vitest once |
| `npm run test:coverage` | Vitest once with coverage |

> If `npm install` fails with `Cannot read properties of null (reading 'edgesOut')`, npm 10 is
> tripping over the vitest peer graph while resolving from scratch. Install from the committed
> `package-lock.json` with `npm ci`.

## Registering with the portal

The portal resolves remotes at runtime from its `public/route-manifest.json`:

```json
{
  "routes": {
    "rtf-manuell-komplettering": {
      "scope": "remoteKompletteringApp",
      "module": "RtfKomplettering",
      "devEntry": "http://localhost:3032/mf-manifest.json",
      "prodEntry": "https://your-prod-url.example.com/mf-manifest.json"
    }
  }
}
```

That entry is the only change needed to register or update the remote — no portal rebuild, in
any environment. The scope must stay unique: `rimfrost-regel-rtf-manuell-fe` publishes itself
as `remoteApp`, and two remotes sharing a scope overwrite each other in the portal's container.

The portal passes `handlaggningId` as a prop, and gets a `task-done` event on `window` when the
task is completed so it can drop it from the list.

## Configuration

Split between local development and container deployments.

**Local development** — `.env`, baked into the bundle at build time:

```env
VITE_BFF_URL=
VITE_DEV_HANDLAGGNING_ID=<a handlaggningId from the OUL>
```

**Docker** — mount a `runtime-config.js`:

```js
window.__RTF_MANUELL_KOMPLETTERING_FE_ENV__ = {
  "RUNTIME_BFF_URL": "http://your-bff-url"
};
```

```bash
docker run -p 8080:8080 \
  -v ./runtime-config.js:/usr/local/apache2/htdocs/runtime-config.js \
  your-image-name
```

**OpenShift** — a ConfigMap mounted with `subPath`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rtf-manuell-komplettering-config
data:
  runtime-config.js: |
    window.__RTF_MANUELL_KOMPLETTERING_FE_ENV__ = {
      "RUNTIME_BFF_URL": "https://your-bff.internal.example.com"
    };
```

```yaml
volumeMounts:
  - name: runtime-config
    mountPath: /usr/local/apache2/htdocs/runtime-config.js
    subPath: runtime-config.js
volumes:
  - name: runtime-config
    configMap:
      name: rtf-manuell-komplettering-config
```

| Variable | Dev (`.env`) | Container (`runtime-config.js`) | Description |
|---|---|---|---|
| BFF URL | `VITE_BFF_URL` | `RUNTIME_BFF_URL` | BFF base URL; empty means use the dev proxy |
| Dev task id | `VITE_DEV_HANDLAGGNING_ID` | — | Standalone development only |

The global is namespaced per app because a Module Federation remote shares one `window` with
its host — a shared `window._env_` would let the two clobber each other's config.

## What it calls

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/{handlaggningId}/komplettering` | Load what is already registered |
| PATCH | `/api/{handlaggningId}/komplettering` | Save personnummer and avsikt |
| POST | `/api/{handlaggningId}/komplettering/done` | Complete the task |
| GET | `/api/uppgiftsbeskrivning/{uppgiftstyp}` | Help text for the tooltip |

Save and complete are deliberately separate: `Spara` only PATCHes, so half-filled work can be
put away and picked up later, while `Klarmarkera` PATCHes and then completes. A 422 from the
completion means the yrkande is still incomplete and a 409 means the correlation window has
already expired; both are shown as their own message rather than a generic failure.

There is no fallback data here — all resilience against the rule service lives in the BFF. The
one piece of sequencing this app does own is save-then-complete, which leaves a window where
the data is saved but the task is not completed; the handläggare gets an error and the task
stays open for another attempt.

## Tech stack

- Vue 3 + TypeScript
- Vite with `@module-federation/vite`
- Pinia for state
- FKUI design system
- Vitest + happy-dom for tests

See [docs/krav.md](docs/krav.md) for requirements and
[docs/teknisk-spec.md](docs/teknisk-spec.md) for the technical specification.
