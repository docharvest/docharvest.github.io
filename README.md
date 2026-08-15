# docharvest.github.io

GitHub Pages site for the [docharvest](https://github.com/docharvest) org. Documentation packs are placed under `content/` by `workspaced codebase apply` and are gitignored. Each tech has its own [`llms.txt`](https://llmstxt.org/) for agents.

## Routes

| Path | Purpose |
|------|---------|
| `/` | Pack list |
| `/docs/` | Pack index |
| `/docs/:tech/` | Pack overview and nav |
| `/docs/:tech/...` | Pages from pack markdown |
| `/docs/:tech/llms.txt` | Agent index for that tech |
| `/docs/:tech/llms-full.txt` | Full markdown dump for that tech |

No site-wide `/llms.txt`.

## Adding a documentation pack

Source of truth: [`workspaced.cue`](workspaced.cue) `#docs`.

1. Add an entry under `#docs` (`from`, `github`, `version`, `origin`, `destination`, `title`, `description`, `pipeline`).
2. Each entry becomes a `docs_*` module; `config.pack` shows up in `workspaced codebase config dump`.
3. [`.workspaced/config/content/manifest.json.tmpl`](.workspaced/config/content/manifest.json.tmpl) renders `content/manifest.json` on `workspaced codebase apply` (same config-tree mechanism as lewtec/skills README).
4. If `pipeline` is `astro-md`, add a static `import.meta.glob` for that pack in [`src/lib/pipelines/astro-md.ts`](src/lib/pipelines/astro-md.ts).
5. New pipelines: `src/lib/pipelines/` + `registry.ts`, and allow the id in the `#docs` `pipeline` union.
6. `workspaced mod lock` && `workspaced codebase apply`.

`content/` is gitignored. Apply writes the files on disk; they stay out of `state.json` and git. Renovate updates `workspaced.lock.json`. Do not hand-edit `content/manifest.json`.

## Develop

```bash
workspaced codebase apply
npm ci
npm run dev
```

```bash
npm run check   # astro check (strict TS on src/)
npm run build   # also writes per-tech llms.txt under dist/docs/<tech>/
```

Node is pinned via [mise](https://mise.jdx.dev/) (`mise.toml`). Deploy runs `workspaced codebase apply` before the build, then publishes from `main`.
