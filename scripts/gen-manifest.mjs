#!/usr/bin/env node
/**
 * Generate content/manifest.json from workspaced.cue `#docs` (single source of truth).
 * Parses the #docs entries we author (double-quoted string fields).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cuePath = join(root, 'workspaced.cue');
const outPath = join(root, 'content', 'manifest.json');

/** Minimal parser for our #docs: { name: { key: "value" } } entries (double-quoted strings only). */
function parseDocsFromCue(src) {
  const start = src.search(/^#docs:\s*\{/m);
  if (start === -1) throw new Error('workspaced.cue: #docs block not found');

  // End at schema redefinition `#docs: [string]:` or `siteManifest:` or `workspaced:`
  const rest = src.slice(start);
  const endMatch = rest.search(/\n#docs:\s*\[string\]:|\nsiteManifest:|\nworkspaced:/);
  const block = endMatch === -1 ? rest : rest.slice(0, endMatch);

  const packs = [];
  // entry: name: { ... }
  const entryRe = /^\t([A-Za-z_][A-Za-z0-9_]*):\s*\{([\s\S]*?)^\t\}/gm;
  let m;
  while ((m = entryRe.exec(block)) !== null) {
    const key = m[1];
    if (key === 'docs') continue;
    const body = m[2];
    const fields = {};
    for (const line of body.split('\n')) {
      const fm = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*:\s*"((?:\\.|[^"\\])*)"\s*$/);
      if (fm) fields[fm[1]] = fm[2].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    }
    const id = fields.destination || key;
    const from = fields.from || '';
    const version = fields.version || 'HEAD';
    const origin = fields.origin || 'docs';
    const treeRef = version === 'HEAD' ? 'main' : version;
    const gh = from.startsWith('github:') ? from.slice('github:'.length) : from;
    packs.push({
      id,
      title: fields.title || id,
      description: fields.description || '',
      pipeline: fields.pipeline || 'astro-md',
      repo: gh ? `https://github.com/${gh}` : '',
      source: gh ? `https://github.com/${gh}/tree/${treeRef}/${origin}` : '',
    });
  }

  if (packs.length === 0) throw new Error('workspaced.cue: no #docs entries parsed');
  // stable order: by id
  packs.sort((a, b) => a.id.localeCompare(b.id));
  return { packs };
}

const fromCue = tryCueExport();
const manifest = fromCue ?? parseDocsFromCue(readFileSync(cuePath, 'utf8'));
const text = `${JSON.stringify(manifest, null, 2)}\n`;
writeFileSync(outPath, text);
const via = fromCue ? 'cue export' : 'cue-file parser';
console.log(`wrote ${outPath} (${manifest.packs.length} packs, via ${via})`);
for (const p of manifest.packs) {
  console.log(`  - ${p.id}  pipeline=${p.pipeline}`);
}
