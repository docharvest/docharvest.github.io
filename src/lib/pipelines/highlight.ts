/**
 * Shared Shiki 4 highlighting for every HTML-producing pipeline.
 * Themes match astro.config markdown.shikiConfig (github-light / github-dark,
 * defaultColor: false) so the site theme toggle works via --shiki-light* /
 * --shiki-dark* CSS variables (see global.css).
 *
 * Pipelines should emit ordinary Markdown → HTML; call `finalizeDocHtml` on the
 * result so fences, indented blocks, and future backends all get the same treatment.
 */
import { createHighlighter, type Highlighter } from 'shiki';

const THEMES = ['github-light', 'github-dark'] as const;

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
      themes: [...THEMES],
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

/**
 * Highlight a source string (not HTML) to a themed <pre class="astro-code shiki">…</pre>.
 */
export async function highlightCode(code: string, lang?: string | null): Promise<string> {
  const highlighter = await getHighlighter();
  const normalized = normalizeLang(lang ?? undefined);
  const loaded = highlighter.getLoadedLanguages();
  const useLang = loaded.includes(normalized as never) ? normalized : 'text';

  const html = highlighter.codeToHtml(code.replace(/\n$/, ''), {
    lang: useLang,
    themes: {
      light: 'github-light',
      dark: 'github-dark',
    },
    defaultColor: false,
  });

  // Match Astro MD output class prefix for shared theme CSS.
  return html.replace(/<pre class="shiki\b/g, '<pre class="astro-code shiki');
}

function langFromPreCodeAttrs(preAttrs: string, codeAttrs: string): string | null {
  const classLang =
    codeAttrs.match(/class="([^"]*)"/i)?.[1] ??
    codeAttrs.match(/class='([^']*)'/i)?.[1] ??
    preAttrs.match(/class="([^"]*)"/i)?.[1] ??
    preAttrs.match(/class='([^']*)'/i)?.[1] ??
    '';
  const langClass = classLang.split(/\s+/).find((c) => c.startsWith('language-') || c.startsWith('lang-'));
  if (langClass) return langClass.replace(/^language-|^lang-/, '');

  return (
    codeAttrs.match(/data-language="([^"]*)"/i)?.[1] ??
    codeAttrs.match(/data-language='([^']*)'/i)?.[1] ??
    preAttrs.match(/data-language="([^"]*)"/i)?.[1] ??
    preAttrs.match(/data-language='([^']*)'/i)?.[1] ??
    null
  );
}

/**
 * Walk an HTML fragment and replace every unhighlighted <pre><code>…</code></pre>
 * with Shiki output. Skips blocks already carrying .astro-code / .shiki (e.g. astro-md).
 * Uses match indices (not String.replace) so identical snippets each get highlighted.
 */
export async function finalizeDocHtml(html: string): Promise<string> {
  if (!html || !html.includes('<pre')) return html;

  await warmHighlighter();

  const preCodeRe =
    /<pre(\b[^>]*)>(\s*)<code(\b[^>]*)>([\s\S]*?)<\/code>(\s*)<\/pre>/gi;

  const matches = [...html.matchAll(preCodeRe)];
  if (matches.length === 0) return html;

  const replacements: { start: number; end: number; to: string }[] = [];

  for (const m of matches) {
    const full = m[0];
    const start = m.index;
    if (start == null) continue;

    const preAttrs = m[1] ?? '';
    const codeAttrs = m[3] ?? '';
    const inner = m[4] ?? '';

    if (/\b(astro-code|shiki)\b/i.test(preAttrs) || /\b(astro-code|shiki)\b/i.test(codeAttrs)) {
      continue;
    }

    const code = decodeBasicEntities(inner.replace(/<[^>]+>/g, ''));
    const highlighted = await highlightCode(code, langFromPreCodeAttrs(preAttrs, codeAttrs));
    replacements.push({ start, end: start + full.length, to: highlighted });
  }

  if (replacements.length === 0) return html;

  let out = '';
  let cursor = 0;
  for (const { start, end, to } of replacements) {
    out += html.slice(cursor, start);
    out += to;
    cursor = end;
  }
  out += html.slice(cursor);
  return out;
}

export async function warmHighlighter(): Promise<void> {
  await getHighlighter();
}
