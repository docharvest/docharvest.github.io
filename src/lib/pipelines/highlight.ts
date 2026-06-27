/**
 * Shared Shiki highlighting for every HTML-producing pipeline.
 * Themes match astro.config markdown.shikiConfig (github-light / github-dark,
 * defaultColor: false) so the site theme toggle works.
 *
 * Pipelines should emit ordinary Markdown → HTML; call `finalizeDocHtml` on the
 * result so fences, indented blocks, and future backends all get the same treatment.
 */
import { createHighlighter, type Highlighter } from 'shiki';

const THEMES = ['github-light', 'github-dark'] as const;

const LANGS = [
  'text',
  'plaintext',
  'markdown',
  'md',
  'c',
  'cpp',
  'csharp',
  'python',
  'bash',
  'shellscript',
  'shell',
  'zsh',
  'console',
  'cmake',
  'make',
  'makefile',
  'xml',
  'html',
  'css',
  'json',
  'yaml',
  'toml',
  'javascript',
  'typescript',
  'java',
  'kotlin',
  'rust',
  'go',
  'ruby',
  'php',
  'sql',
  'diff',
  'ini',
  'docker',
  'graphql',
  'svelte',
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
    yml: 'yaml',
    dockerfile: 'docker',
    txt: 'text',
    plain: 'text',
    plaintext: 'text',
    'c++': 'cpp',
    cxx: 'cpp',
    'c#': 'csharp',
    cs: 'csharp',
    console: 'bash',
    terminal: 'bash',
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

  return html.replace(/<pre class="shiki/g, '<pre class="astro-code shiki');
}

/**
 * Walk an HTML fragment and replace every unhighlighted <pre><code>…</code></pre>
 * with Shiki output. Skips blocks already carrying .astro-code / .shiki (e.g. astro-md).
 * Safe to run on any backend’s HTML.
 */
export async function finalizeDocHtml(html: string): Promise<string> {
  if (!html || !html.includes('<pre')) return html;

  await warmHighlighter();

  // Match <pre…><code…>…</code></pre> including optional attrs on either tag.
  const preCodeRe =
    /<pre(\b[^>]*)>(\s*)<code(\b[^>]*)>([\s\S]*?)<\/code>(\s*)<\/pre>/gi;

  const matches = [...html.matchAll(preCodeRe)];
  if (matches.length === 0) return html;

  let out = html;
  // Replace from the end so indices stay valid… easier: rebuild via sequential async map on unique.
  // Do sequential replace of each full match string (may duplicate — replace one at a time from last).
  const replacements: { from: string; to: string }[] = [];

  for (const m of matches) {
    const full = m[0];
    const preAttrs = m[1] ?? '';
    const codeAttrs = m[3] ?? '';
    const inner = m[4] ?? '';

    if (/\b(astro-code|shiki)\b/i.test(preAttrs) || /\b(astro-code|shiki)\b/i.test(codeAttrs)) {
      continue;
    }

    let lang: string | null = null;
    const classLang =
      codeAttrs.match(/class="([^"]*)"/i)?.[1] ??
      codeAttrs.match(/class='([^']*)'/i)?.[1] ??
      preAttrs.match(/class="([^"]*)"/i)?.[1] ??
      '';
    const langClass = classLang.split(/\s+/).find((c) => c.startsWith('language-') || c.startsWith('lang-'));
    if (langClass) lang = langClass.replace(/^language-|^lang-/, '');

    const dataLang =
      codeAttrs.match(/data-language="([^"]*)"/i)?.[1] ??
      preAttrs.match(/data-language="([^"]*)"/i)?.[1];
    if (dataLang) lang = dataLang;

    const code = decodeBasicEntities(inner.replace(/<[^>]+>/g, ''));
    const highlighted = await highlightCode(code, lang);
    replacements.push({ from: full, to: highlighted });
  }

  for (const { from, to } of replacements) {
    out = out.replace(from, to);
  }

  return out;
}

export async function warmHighlighter(): Promise<void> {
  await getHighlighter();
}
