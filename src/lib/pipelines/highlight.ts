/**
 * Shiki highlighting aligned with astro.config markdown.shikiConfig
 * (github-light / github-dark, defaultColor: false for theme switching).
 */
import { createHighlighter, type Highlighter } from 'shiki';

const THEMES = ['github-light', 'github-dark'] as const;

/** Common langs in vendored docs (OpenCV, Renovate-style samples, shells). */
const LANGS = [
  'text',
  'plaintext',
  'markdown',
  'md',
  'c',
  'cpp',
  'csharp',
  'python',
  'py',
  'bash',
  'shell',
  'sh',
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
  'yml',
  'toml',
  'javascript',
  'js',
  'typescript',
  'ts',
  'java',
  'kotlin',
  'rust',
  'go',
  'ruby',
  'php',
  'sql',
  'diff',
  'ini',
  'dockerfile',
  'docker',
  'graphql',
  'vue',
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

function normalizeLang(lang: string | undefined): string {
  if (!lang) return 'text';
  const base = lang.trim().split(/\s+/)[0]?.replace(/^\./, '') ?? 'text';
  const aliases: Record<string, string> = {
    py: 'python',
    python3: 'python',
    js: 'javascript',
    ts: 'typescript',
    rs: 'rust',
    sh: 'bash',
    shell: 'bash',
    zsh: 'bash',
    yml: 'yaml',
    dockerfile: 'docker',
    txt: 'text',
    plain: 'text',
    plaintext: 'text',
    'c++': 'cpp',
    'c#': 'csharp',
    cs: 'csharp',
  };
  const key = base.toLowerCase();
  return aliases[key] ?? key;
}

/**
 * Highlight a fenced code block to HTML with dual themes (CSS vars),
 * compatible with our global.css dark-mode rules for .astro-code / .shiki.
 */
export async function highlightCode(code: string, lang?: string): Promise<string> {
  const highlighter = await getHighlighter();
  const normalized = normalizeLang(lang);
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

  // Align with Astro MD output class so existing CSS applies.
  return html.replace(/<pre class="shiki/g, '<pre class="astro-code shiki');
}

/** Ensure highlighter is warm before sync-style build paths. */
export async function warmHighlighter(): Promise<void> {
  await getHighlighter();
}
