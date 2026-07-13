/**
 * Shared Shiki 4 highlighting for HTML pipelines.
 * Theme ids live in `THEMES` (imported by `astro.config` `markdown.shikiConfig`)
 * with `defaultColor: false` so the theme toggle can use `--shiki-light*` /
 * `--shiki-dark*` (see `global.css`).
 *
 * Pipelines emit ordinary Markdown HTML, then call `finalizeDocHtml` so fences
 * and indented blocks get the same treatment.
 */
import { createHighlighter, type Highlighter } from 'shiki';

/** Light/dark theme ids — source of truth for highlight + astro markdown.shikiConfig. */
export const THEMES = {
  light: 'github-light',
  dark: 'github-dark',
} as const;

/**
 * Languages loaded into the shared highlighter.
 * Keep aligned with fences in `content/` (nix/astro dominate; js/ts/svelte next).
 * Unknown fences fall back to `text` in `highlightCode`.
 */
const LANGS = [
  'astro',
  'bash',
  'bat',
  'c',
  'cmake',
  'console',
  'cpp',
  'csharp',
  'css',
  'cue',
  'diff',
  'docker',
  'go',
  'graphql',
  'html',
  'ini',
  'java',
  'javascript',
  'json',
  'jsonc',
  'jsx',
  'kotlin',
  'make',
  'makefile',
  'markdown',
  'md',
  'mdx',
  'mermaid',
  'nginx',
  'nix',
  'perl',
  'php',
  'plaintext',
  'python',
  'ruby',
  'rust',
  'shell',
  'shellscript',
  'shellsession',
  'sql',
  'svelte',
  'text',
  'toml',
  'tsx',
  'typescript',
  'vue',
  'xml',
  'yaml',
  'zsh',
] as const;

let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: [THEMES.light, THEMES.dark],
      langs: [...LANGS],
    });
  }
  return highlighterPromise;
}

function normalizeLang(lang: string | undefined | null): string {
  if (!lang) return 'text';
  const base = lang.trim().split(/[\s{,]/)[0]?.replace(/^\./, '') ?? 'text';
  const aliases: Record<string, string> = {
    py: 'python',
    python3: 'python',
    js: 'javascript',
    ts: 'typescript',
    rs: 'rust',
    sh: 'bash',
    shell: 'bash',
    shellscript: 'bash',
    zsh: 'bash',
    'shell-session': 'shellsession',
    terminal: 'console',
    yml: 'yaml',
    dockerfile: 'docker',
    txt: 'text',
    plain: 'text',
    plaintext: 'text',
    'c++': 'cpp',
    cxx: 'cpp',
    'c#': 'csharp',
    cs: 'csharp',
  };
  const key = base.toLowerCase();
  return aliases[key] ?? key;
}

function decodeBasicEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

/** Highlight source (not HTML) to a themed `<pre class="astro-code shiki">...</pre>`. */
export async function highlightCode(code: string, lang?: string | null): Promise<string> {
  const highlighter = await getHighlighter();
  const normalized = normalizeLang(lang ?? undefined);
  const loaded = highlighter.getLoadedLanguages();
  const useLang = loaded.includes(normalized as never) ? normalized : 'text';

  const html = highlighter.codeToHtml(code.replace(/\n$/, ''), {
    lang: useLang,
    themes: THEMES,
    defaultColor: false,
  });

  // Match Astro MD output class prefix for shared theme CSS.
  return html.replace(/<pre class="shiki\b/g, '<pre class="astro-code shiki');
}

function attrValue(attrs: string, name: string): string | null {
  return (
    attrs.match(new RegExp(`${name}="([^"]*)"`, 'i'))?.[1] ??
    attrs.match(new RegExp(`${name}='([^']*)'`, 'i'))?.[1] ??
    null
  );
}

function langFromPreCodeAttrs(preAttrs: string, codeAttrs: string): string | null {
  for (const attrs of [codeAttrs, preAttrs]) {
    const classNames = attrValue(attrs, 'class') ?? '';
    const langClass = classNames
      .split(/\s+/)
      .find((c) => c.startsWith('language-') || c.startsWith('lang-'));
    if (langClass) return langClass.replace(/^language-|^lang-/, '');
    const dataLang = attrValue(attrs, 'data-language');
    if (dataLang) return dataLang;
  }
  return null;
}

/**
 * Replace unhighlighted `<pre><code>...</code></pre>` blocks with Shiki output.
 * Skips blocks that already have `.astro-code` / `.shiki` (e.g. astro-md).
 * Uses match indices so identical snippets each get highlighted.
 */
export async function finalizeDocHtml(html: string): Promise<string> {
  if (!html || !html.includes('<pre')) return html;

  const preCodeRe =
    /<pre(\b[^>]*)>\s*<code(\b[^>]*)>([\s\S]*?)<\/code>\s*<\/pre>/gi;

  const matches = [...html.matchAll(preCodeRe)];
  if (matches.length === 0) return html;

  const replacements = await Promise.all(
    matches.map(async (m) => {
      const start = m.index;
      if (start == null) return null;

      const full = m[0];
      const preAttrs = m[1] ?? '';
      const codeAttrs = m[2] ?? '';
      const inner = m[3] ?? '';

      if (/\b(astro-code|shiki)\b/i.test(preAttrs) || /\b(astro-code|shiki)\b/i.test(codeAttrs)) {
        return null;
      }

      const code = decodeBasicEntities(inner.replace(/<[^>]+>/g, ''));
      const to = await highlightCode(code, langFromPreCodeAttrs(preAttrs, codeAttrs));
      return { start, end: start + full.length, to };
    }),
  );

  let out = '';
  let cursor = 0;
  for (const rep of replacements) {
    if (!rep) continue;
    out += html.slice(cursor, rep.start);
    out += rep.to;
    cursor = rep.end;
  }
  out += html.slice(cursor);
  return out;
}
