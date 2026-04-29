import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const cssPath = resolve(dirname(fileURLToPath(import.meta.url)), 'neutrino-base.css');

const lightVariables = {
  '--ne-color-text': '#1a1a1a',
  '--ne-color-text-muted': '#6b7280',
  '--ne-color-transparent': 'transparent',
  '--ne-color-bg': '#ffffff',
  '--ne-color-surface': '#f8fafc',
  '--ne-color-surface-elevated': '#ffffff',
  '--ne-color-border': '#dbe4ef',
  '--ne-color-link': '#2563eb',
  '--ne-color-link-hover': '#1d4ed8',
  '--ne-color-code-fg': '#1a1a1a',
  '--ne-color-code-bg': 'rgba(127, 127, 127, 0.12)',
  '--ne-color-code-fence-bg': 'rgba(127, 127, 127, 0.08)',
  '--ne-color-code-header-bg': 'rgba(15, 23, 42, 0.04)',
  '--ne-color-token-keyword': '#7c3aed',
  '--ne-color-token-string': '#047857',
  '--ne-color-token-number': '#b45309',
  '--ne-color-blockquote-border': 'rgba(127, 127, 127, 0.4)',
  '--ne-color-blockquote-fg': '#4b5563',
  '--ne-color-divider': 'rgba(127, 127, 127, 0.3)',
  '--ne-color-table-border': 'rgba(127, 127, 127, 0.3)',
  '--ne-color-checkbox-accent': '#2563eb',
  '--ne-color-selection': 'rgba(37, 99, 235, 0.2)',
  '--ne-color-caret': 'currentColor',
  '--ne-color-focus-ring': '#2563eb',
  '--ne-color-tooltip-bg': '#0f172a',
  '--ne-color-tooltip-fg': '#ffffff',
  '--ne-font-body': 'ui-sans-serif, system-ui, -apple-system, sans-serif',
  '--ne-font-mono': 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
  '--ne-font-size': '1rem',
  '--ne-line-height': '1.6',
  '--ne-h1-size': '2em',
  '--ne-h1-weight': '700',
  '--ne-h1-leading': '1.2',
  '--ne-h2-size': '1.5em',
  '--ne-h2-weight': '700',
  '--ne-h2-leading': '1.3',
  '--ne-h3-size': '1.25em',
  '--ne-h3-weight': '700',
  '--ne-h3-leading': '1.4',
  '--ne-h4-size': '1.1em',
  '--ne-h4-weight': '700',
  '--ne-h4-leading': '1.4',
  '--ne-h5-size': '1em',
  '--ne-h5-weight': '700',
  '--ne-h5-leading': '1.4',
  '--ne-h6-size': '0.9em',
  '--ne-h6-weight': '700',
  '--ne-h6-leading': '1.4',
  '--ne-radius-code': '3px',
  '--ne-radius-editor': '8px',
  '--ne-radius-block': '6px',
  '--ne-spacing-block': '0.5em',
  '--ne-spacing-inline-padding': '0.125em 0.25em',
  '--ne-blockquote-indent': '1em',
  '--ne-code-font-size': '0.9em',
  '--ne-shadow-editor': '0 12px 30px rgba(15, 23, 42, 0.06)',
};

const darkVariables = {
  '--ne-color-text': '#e5e7eb',
  '--ne-color-text-muted': '#9ca3af',
  '--ne-color-bg': '#0f172a',
  '--ne-color-surface': '#111827',
  '--ne-color-surface-elevated': '#172033',
  '--ne-color-border': 'rgba(148, 163, 184, 0.22)',
  '--ne-color-code-fg': '#e5e7eb',
  '--ne-color-code-bg': 'rgba(148, 163, 184, 0.18)',
  '--ne-color-code-fence-bg': 'rgba(15, 23, 42, 0.72)',
  '--ne-color-code-header-bg': 'rgba(148, 163, 184, 0.08)',
  '--ne-color-token-keyword': '#c4b5fd',
  '--ne-color-token-string': '#86efac',
  '--ne-color-token-number': '#fbbf24',
  '--ne-color-link': '#60a5fa',
  '--ne-color-link-hover': '#93c5fd',
  '--ne-color-blockquote-fg': '#9ca3af',
  '--ne-color-checkbox-accent': '#60a5fa',
  '--ne-color-selection': 'rgba(96, 165, 250, 0.3)',
  '--ne-color-focus-ring': '#60a5fa',
  '--ne-color-tooltip-bg': '#f8fafc',
  '--ne-color-tooltip-fg': '#0f172a',
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
    Array.from(block.matchAll(/(--ne-[\w-]+)\s*:\s*([^;]+);/g)).map((match) => [
      match[1],
      match[2].trim().replace(/\s+/g, ' '),
    ]),
  );
}

function stripVariableDeclarations(css: string) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*--ne-[\w-]+\s*:\s*[^;]+;\s*$/gm, '');
}

function getSelectors(css: string) {
  const cssWithoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');

  return Array.from(cssWithoutComments.matchAll(/(?:^|})\s*([^{}]+)\s*\{/g))
    .flatMap((match) => match[1].split(','))
    .map((selector) => selector.trim())
    .filter(Boolean);
}

describe('neutrino-base.css theme contract', () => {
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
      /var\(--ne-[\w-]+\)/g,
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
});
