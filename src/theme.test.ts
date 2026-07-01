import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const cssPath = resolve(dirname(fileURLToPath(import.meta.url)), 'galley-base.css');

const lightVariables = {
  '--ge-color-text': '#1a1a1a',
  '--ge-color-text-muted': '#6b7280',
  '--ge-color-transparent': 'transparent',
  '--ge-color-bg': '#ffffff',
  '--ge-color-surface': '#f8fafc',
  '--ge-color-surface-elevated': '#ffffff',
  '--ge-color-border': '#dbe4ef',
  '--ge-color-link': '#2563eb',
  '--ge-color-link-hover': '#1d4ed8',
  '--ge-color-code-fg': '#1a1a1a',
  '--ge-color-code-bg': 'rgba(127, 127, 127, 0.12)',
  '--ge-color-code-fence-bg': 'rgba(127, 127, 127, 0.08)',
  '--ge-color-code-header-bg': 'rgba(15, 23, 42, 0.04)',
  '--ge-color-token-keyword': '#7c3aed',
  '--ge-color-token-string': '#047857',
  '--ge-color-token-number': '#b45309',
  '--ge-color-token-comment': '#6b7280',
  '--ge-color-blockquote-border': 'rgba(127, 127, 127, 0.4)',
  '--ge-color-blockquote-fg': '#4b5563',
  '--ge-color-divider': 'rgba(127, 127, 127, 0.3)',
  '--ge-color-table-border': 'rgba(127, 127, 127, 0.3)',
  '--ge-color-checkbox-accent': '#2563eb',
  '--ge-color-selection': 'rgba(37, 99, 235, 0.2)',
  '--ge-color-caret': 'currentColor',
  '--ge-color-focus-ring': '#2563eb',
  '--ge-color-tooltip-bg': '#0f172a',
  '--ge-color-tooltip-fg': '#ffffff',
  '--ge-color-scrollbar-track': 'transparent',
  '--ge-color-scrollbar-thumb': 'rgba(100, 116, 139, 0.34)',
  '--ge-color-scrollbar-thumb-hover': 'rgba(100, 116, 139, 0.54)',
  '--ge-font-body': 'ui-sans-serif, system-ui, -apple-system, sans-serif',
  '--ge-font-mono': 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
  '--ge-font-size': '1rem',
  '--ge-line-height': '1.6',
  '--ge-h1-size': '2em',
  '--ge-h1-weight': '700',
  '--ge-h1-leading': '1.2',
  '--ge-h2-size': '1.5em',
  '--ge-h2-weight': '700',
  '--ge-h2-leading': '1.3',
  '--ge-h3-size': '1.25em',
  '--ge-h3-weight': '700',
  '--ge-h3-leading': '1.4',
  '--ge-h4-size': '1.1em',
  '--ge-h4-weight': '700',
  '--ge-h4-leading': '1.4',
  '--ge-h5-size': '1em',
  '--ge-h5-weight': '700',
  '--ge-h5-leading': '1.4',
  '--ge-h6-size': '0.9em',
  '--ge-h6-weight': '700',
  '--ge-h6-leading': '1.4',
  '--ge-radius-code': '3px',
  '--ge-radius-editor': '8px',
  '--ge-radius-block': '6px',
  '--ge-spacing-block': '0.5em',
  '--ge-spacing-inline-padding': '0.125em 0.25em',
  '--ge-blockquote-indent': '1em',
  '--ge-content-padding': '42px 56px',
  '--ge-toolbar-padding': '10px 14px',
  '--ge-footer-padding': '4px 10px',
  '--ge-backdrop-filter': 'none',
  '--ge-scrollbar-size': '10px',
  '--ge-scrollbar-radius': '999px',
  '--ge-code-font-size': '0.9em',
  '--ge-shadow-editor': '0 12px 30px rgba(15, 23, 42, 0.06)',
};

const darkVariables = {
  '--ge-color-text': '#e5e7eb',
  '--ge-color-text-muted': '#9ca3af',
  '--ge-color-bg': '#0f172a',
  '--ge-color-surface': '#111827',
  '--ge-color-surface-elevated': '#172033',
  '--ge-color-border': 'rgba(148, 163, 184, 0.22)',
  '--ge-color-code-fg': '#e5e7eb',
  '--ge-color-code-bg': 'rgba(148, 163, 184, 0.18)',
  '--ge-color-code-fence-bg': 'rgba(15, 23, 42, 0.72)',
  '--ge-color-code-header-bg': 'rgba(148, 163, 184, 0.08)',
  '--ge-color-token-keyword': '#c4b5fd',
  '--ge-color-token-string': '#86efac',
  '--ge-color-token-number': '#fbbf24',
  '--ge-color-token-comment': '#9ca3af',
  '--ge-color-link': '#60a5fa',
  '--ge-color-link-hover': '#93c5fd',
  '--ge-color-blockquote-fg': '#9ca3af',
  '--ge-color-checkbox-accent': '#60a5fa',
  '--ge-color-selection': 'rgba(96, 165, 250, 0.3)',
  '--ge-color-focus-ring': '#60a5fa',
  '--ge-color-tooltip-bg': '#f8fafc',
  '--ge-color-tooltip-fg': '#0f172a',
  '--ge-color-scrollbar-thumb': 'rgba(148, 163, 184, 0.42)',
  '--ge-color-scrollbar-thumb-hover': 'rgba(203, 213, 225, 0.62)',
};

function readCss() {
  return readFileSync(cssPath, 'utf8');
}

function getBlock(css: string, selectorPattern: RegExp) {
  const match = selectorPattern.exec(css);
  expect(match?.groups?.body).toBeDefined();
  return match?.groups?.body ?? '';
}

function parseVariables(block: string) {
  return Object.fromEntries(
    Array.from(block.matchAll(/(--ge-[\w-]+)\s*:\s*([^;]+);/g)).map((match) => [
      match[1],
      match[2].trim().replace(/\s+/g, ' '),
    ]),
  );
}

function stripVariableDeclarations(css: string) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*--ge-[\w-]+\s*:\s*[^;]+;\s*$/gm, '');
}

function getSelectors(css: string) {
  const cssWithoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');

  return Array.from(cssWithoutComments.matchAll(/(?:^|})\s*([^{}]+)\s*\{/g))
    .flatMap((match) => match[1].split(','))
    .map((selector) => selector.trim())
    .filter(Boolean);
}

describe('galley-base.css theme contract', () => {
  it('defines the canonical light variable defaults', () => {
    const css = readCss();
    const lightBlock = getBlock(
      css,
      /:root\s*,\s*\[data-theme="light"\]\s*\{(?<body>[\s\S]*?)\}/,
    );

    expect(parseVariables(lightBlock)).toEqual(lightVariables);
  });

  it('keeps color literals inside CSS variable declarations only', () => {
    const cssWithoutVariables = stripVariableDeclarations(readCss()).replace(
      /var\(--ge-[\w-]+\)/g,
      '',
    );

    expect(
      cssWithoutVariables.match(
        /#[0-9a-fA-F]{3,8}\b|\b(?:rgb|rgba|hsl|hsla|color-mix)\([^)]*\)|\b(?:transparent|currentcolor|currentColor)\b/g,
      ),
    ).toBeNull();
  });

  it('declares only canonical theme custom properties', () => {
    const canonicalVariables = new Set(Object.keys(lightVariables));
    const declaredVariables = Array.from(
      readCss().matchAll(/(^|\s)(--[\w-]+)\s*:/g),
      (match) => match[2],
    );

    expect(declaredVariables.filter((name) => !canonicalVariables.has(name))).toEqual([]);
  });

  it('defines dark theme overrides for key color variables', () => {
    const css = readCss();
    const darkBlock = getBlock(css, /\[data-theme="dark"\]\s*\{(?<body>[\s\S]*?)\}/);

    expect(parseVariables(darkBlock)).toEqual(darkVariables);
  });

  it('does not leak global CodeMirror root selectors', () => {
    const leakedSelectors = getSelectors(readCss()).filter((selector) =>
      /^\.cm-(?:editor|content)(?:\b|:|\.|#|\[)/.test(selector),
    );

    expect(leakedSelectors).toEqual([]);
  });

  it('keeps the table cell editor from forcing column width through padding or fixed width', () => {
    const css = readCss();
    const block = getBlock(css, /\.ge-table-cell-editor\s*\{(?<body>[\s\S]*?)\}/);

    expect(block).toContain('padding: 0;');
    expect(block).toContain('width: auto;');
    expect(block).not.toMatch(/min-width:\s*12ch/);
    expect(block).not.toMatch(/width:\s*100%/);
  });

  it('constrains rendered tables to the editor content width', () => {
    const css = readCss();
    const widgetBlock = getBlock(css, /\.ge-table-widget\s*\{(?<body>[\s\S]*?)\}/);
    const scrollBlock = getBlock(css, /\.ge-table-scroll\s*\{(?<body>[\s\S]*?)\}/);

    expect(widgetBlock).toContain('box-sizing: border-box;');
    expect(widgetBlock).toContain('max-width: 100%;');
    expect(widgetBlock).toContain('min-width: 0;');
    expect(scrollBlock).toContain('max-width: 100%;');
    expect(scrollBlock).toContain('min-width: 0;');
  });

  it('lets fill layout stretch the CodeMirror content area', () => {
    const css = readCss();
    const fillBlock = getBlock(css, /\.ge-layout-fill\s+\.cm-content\s*\{(?<body>[\s\S]*?)\}/);

    expect(fillBlock).toContain('min-height: 100%;');
  });

  it('uses CodeMirror drawSelection without adding a native selection layer', () => {
    expect(readCss()).not.toContain('::selection');
  });

  it('uses syntax token variables for exposed comment token classes', () => {
    const css = readCss();
    const renderedCommentBlock = getBlock(css, /\.ge-token-comment\s*\{(?<body>[\s\S]*?)\}/);
    const lezerCommentBlock = getBlock(
      css,
      /\.tok-url\s*,\s*\.tok-meta\s*,\s*\.tok-comment\s*\{(?<body>[\s\S]*?)\}/,
    );

    expect(renderedCommentBlock).toContain('color: var(--ge-color-token-comment);');
    expect(lezerCommentBlock).toContain('color: var(--ge-color-token-comment);');
  });
});
