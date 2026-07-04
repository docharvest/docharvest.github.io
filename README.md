# docharvest.github.io

GitHub Pages site for the [docharvest](https://github.com/docharvest) org. Vendored documentation packs; each tech has its own [`llms.txt`](https://llmstxt.org/) for agents.

## Routes

| Path | Purpose |
|------|---------|
| `/` | Pack list |
| `/docs/` | Pack index |
| `/docs/:tech/` | Pack overview and nav |
| `/docs/:tech/...` | Pages from vendored markdown |
| `/docs/:tech/llms.txt` | Agent index for that tech |
| `/docs/:tech/llms-full.txt` | Full markdown dump for that tech |

No site-wide `/llms.txt`.

## Adding a documentation pack

Source of truth: [`workspaced.cue`](workspaced.cue) `#docs`.

1. Add an entry under `#docs` (`from`, `github`, `version`, `origin`, `destination`, `title`, `description`, `pipeline`).
2. Each entry becomes a `docs_*` module; `config.pack` shows up in `workspaced codebase config dump`.
3. [`.workspaced/config/content/manifest.json.tmpl`](.workspaced/config/content/manifest.json.tmpl) renders [`content/manifest.json`](content/manifest.json) on `workspaced codebase apply` (same config-tree mechanism as lewtec/skills README).
4. If `pipeline` is `astro-md`, add a static `import.meta.glob` for that pack in [`src/lib/pipelines/astro-md.ts`](src/lib/pipelines/astro-md.ts).
5. New pipelines: `src/lib/pipelines/` + `registry.ts`, and allow the id in the `#docs` `pipeline` union.
6. `workspaced mod lock` && `workspaced codebase apply`.

Do not hand-edit `content/manifest.json`.

## Develop

```bash
npm ci
npm run dev
```

```bash
npm run build   # also writes per-tech llms.txt under dist/docs/<tech>/
```

Node is pinned via [mise](https://mise.jdx.dev/) (`mise.toml`). Deploy workflow builds on push to `main` and publishes with GitHub Pages.
