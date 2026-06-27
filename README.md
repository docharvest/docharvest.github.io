# docharvest.github.io

GitHub Pages site for the [docharvest](https://github.com/docharvest) org: harvested documentation packs with **per-tech** [`llms.txt`](https://llmstxt.org/) for agents.

## Routes

| Path | Purpose |
|------|---------|
| `/` | Org landing — lists packs |
| `/docs/` | Pack index |
| `/docs/:tech/` | Pack overview + nav |
| `/docs/:tech/...` | Individual pages from vendored markdown |
| `/docs/:tech/llms.txt` | Lightweight agent index for that tech only |
| `/docs/:tech/llms-full.txt` | Full markdown dump for that tech only |

There is **no** site-wide `/llms.txt`.

## Adding a documentation pack

**Single source of truth:** [`workspaced.cue`](workspaced.cue) `#docs` (vendoring + site metadata + `pipeline`).

1. Add an entry under `#docs` (`from`, `version`, `origin`, `destination`, `title`, `description`, `pipeline`).
2. `npm run gen:manifest` (also runs on `predev` / `prebuild`) writes [`content/manifest.json`](content/manifest.json). With `cue` installed this uses `siteManifest`; otherwise a small parser reads `#docs`.
3. If `pipeline` is `astro-md`, add a static `import.meta.glob` for that pack under [`src/lib/pipelines/astro-md.ts`](src/lib/pipelines/astro-md.ts) (Vite requires literal globs).
4. New pipelines: implement under [`src/lib/pipelines/`](src/lib/pipelines/), register in `registry.ts`, allow the id in the `#docs` pipeline union in `workspaced.cue`.
5. `workspaced mod lock` && `workspaced codebase apply` → `content/<destination>/`.
6. `npm run build`.

Do **not** hand-edit `content/manifest.json`.

First pack: **renovate** from [`renovatebot/renovate` `docs/`](https://github.com/renovatebot/renovate/tree/main/docs).

## Develop

```bash
npm ci
npm run dev
```

```bash
npm run build   # also writes per-tech llms.txt under dist/docs/<tech>/
```

Node is pinned via [mise](https://mise.jdx.dev/) (`mise.toml`). Deploy workflow builds on push to `main` and publishes with GitHub Pages.
