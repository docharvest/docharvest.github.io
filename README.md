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

Packs are managed like [lewtec/skills](https://github.com/lewtec/skills) but under `#docs` in [`workspaced.cue`](workspaced.cue).

1. Add an entry under `#docs` (destination id = pack id).
2. Mirror metadata in [`content/manifest.json`](content/manifest.json), including **`pipeline`**:
   - `astro-md` — Astro/Vite Markdown & MDX (default for normal `.md` trees).
   - `marked` — plain `marked` on file text (`.md` / `.markdown`; no dialect transforms). Use when Astro’s MD loader cannot handle the tree.
3. Implement extra pipelines under [`src/lib/pipelines/`](src/lib/pipelines/) and register them in `registry.ts` if needed.
4. Run `workspaced mod lock` then `workspaced codebase apply` → `content/<id>/`.
5. `npm run build`.

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
