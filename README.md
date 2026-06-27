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

1. Add an entry under `#docs` (and mirror metadata in [`content/manifest.json`](content/manifest.json) for titles shown on the site).
2. Run `workspaced mod lock` (or let Renovate refresh [`workspaced.lock.json`](workspaced.lock.json)).
3. Run `workspaced codebase apply` to place files under `content/<destination>/`.
4. Build the site — Astro picks up `content/**/*.{md,mdx}`.

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
