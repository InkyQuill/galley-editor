import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const cssPath = resolve(dirname(fileURLToPath(import.meta.url)), 'galley-base.css');
const themeSourcePath = resolve(dirname(fileURLToPath(import.meta.url)), 'theme.ts');

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
  it('leaves horizontal scroller overflow to the layout compartment', () => {
    const source = readFileSync(themeSourcePath, 'utf8');

    expect(source).not.toContain("overflowX: 'hidden'");
    expect(source).not.toContain("overflowX: 'auto'");
  });

  it('defines the canonical light variable defaults', () => {
    const css = readCss();
    const lightBlock = getBlock(
      css,
      /^:root\s*,\s*\[data-theme="light"\]\s*\{(?<body>[\s\S]*?)\}/m,
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
    const darkBlock = getBlock(css, /^\[data-theme="dark"\]\s*\{(?<body>[\s\S]*?)\}/m);

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
    const block = getBlock(css, /^\.ge-table-cell-editor\s*\{(?<body>[\s\S]*?)\}/m);

    expect(block).toContain('max-width: 100%;');
    expect(block).toContain('padding: 0;');
    expect(block).toContain('width: auto;');
    expect(block).not.toMatch(/min-width:\s*12ch/);
    expect(block).not.toMatch(/(^|\n)\s*width:\s*100%/);
  });

  it('constrains rendered tables to the editor content width', () => {
    const css = readCss();
    const widgetBlock = getBlock(css, /^\.ge-table-widget\s*\{(?<body>[\s\S]*?)\}/m);
    const scrollBlock = getBlock(css, /^\.ge-table-scroll\s*\{(?<body>[\s\S]*?)\}/m);
    const tableBlock = getBlock(css, /^\.ge-table-rendered\s*\{(?<body>[\s\S]*?)\}/m);
    const cellBlock = getBlock(css, /^\.ge-table-rendered th,\n\.ge-table-rendered td\s*\{(?<body>[\s\S]*?)\}/m);

    expect(widgetBlock).toContain('box-sizing: border-box;');
    expect(widgetBlock).toContain('max-width: 100%;');
    expect(widgetBlock).toContain('min-width: 0;');
    expect(scrollBlock).toContain('box-sizing: border-box;');
    expect(scrollBlock).toContain('max-width: 100%;');
    expect(scrollBlock).toContain('min-width: 0;');
    expect(tableBlock).toContain('table-layout: fixed;');
    expect(tableBlock).toContain('width: 100%;');
    expect(tableBlock).not.toContain('width: max-content;');
    expect(cellBlock).toContain('overflow-wrap: anywhere;');
    expect(cellBlock).toContain('word-break: normal;');
  });

  it('lets constrained CodeMirror children and rendered blocks shrink', () => {
    const css = readCss();
    const childBlock = getBlock(
      css,
      /^\.ge-width-constrained \.cm-content > \*\s*\{(?<body>[\s\S]*?)\}/m,
    );
    const codeBlock = getBlock(css, /^\.ge-code-block\s*\{(?<body>[\s\S]*?)\}/m);

    expect(childBlock).toContain('box-sizing: border-box;');
    expect(childBlock).toContain('max-width: 100%;');
    expect(childBlock).toContain('min-width: 0;');
    expect(codeBlock).toContain('box-sizing: border-box;');
    expect(codeBlock).toContain('max-width: 100%;');
    expect(codeBlock).toContain('min-width: 0;');
    expect(codeBlock).toContain('width: 100%;');
  });

  it('wraps code blocks in constrained mode without a nested scrollbar', () => {
    const css = readCss();
    const bodyBlock = getBlock(
      css,
      /^\.ge-width-constrained \.ge-code-body\s*\{(?<body>[\s\S]*?)\}/m,
    );
    const codeBlock = getBlock(
      css,
      /^\.ge-width-constrained \.ge-code-body code\s*\{(?<body>[\s\S]*?)\}/m,
    );

    expect(bodyBlock).toContain('overflow-x: clip;');
    expect(codeBlock).toContain('overflow-wrap: anywhere;');
    expect(codeBlock).toContain('white-space: pre-wrap;');
  });

  it('lets code blocks widen the main scroller in horizontal mode', () => {
    const css = readCss();
    const wrapperBlock = getBlock(
      css,
      /^\.ge-horizontal-scroll \.ge-code-block\s*\{(?<body>[\s\S]*?)\}/m,
    );
    const bodyBlock = getBlock(
      css,
      /^\.ge-horizontal-scroll \.ge-code-body\s*\{(?<body>[\s\S]*?)\}/m,
    );
    const codeBlock = getBlock(
      css,
      /^\.ge-horizontal-scroll \.ge-code-body code\s*\{(?<body>[\s\S]*?)\}/m,
    );

    expect(wrapperBlock).toContain('max-width: none;');
    expect(wrapperBlock).toContain('overflow: visible;');
    expect(wrapperBlock).toContain('width: max-content;');
    expect(bodyBlock).toContain('overflow-x: visible;');
    expect(codeBlock).toContain('overflow-wrap: normal;');
    expect(codeBlock).toContain('white-space: pre;');
  });

  it('gates table sizing and overflow by editor layout mode', () => {
    const css = readCss();
    const constrainedScroll = getBlock(
      css,
      /^\.ge-width-constrained \.ge-table-scroll\s*\{(?<body>[\s\S]*?)\}/m,
    );
    const horizontalWidget = getBlock(
      css,
      /^\.ge-horizontal-scroll \.ge-table-widget\s*\{(?<body>[\s\S]*?)\}/m,
    );
    const horizontalScroll = getBlock(
      css,
      /^\.ge-horizontal-scroll \.ge-table-scroll\s*\{(?<body>[\s\S]*?)\}/m,
    );
    const horizontalTable = getBlock(
      css,
      /^\.ge-horizontal-scroll \.ge-table-rendered\s*\{(?<body>[\s\S]*?)\}/m,
    );

    expect(constrainedScroll).toContain('overflow-x: clip;');
    expect(horizontalWidget).toContain('max-width: none;');
    expect(horizontalWidget).toContain('width: max-content;');
    expect(horizontalScroll).toContain('max-width: none;');
    expect(horizontalScroll).toContain('overflow-x: visible;');
    expect(horizontalTable).toContain('table-layout: auto;');
    expect(horizontalTable).toContain('width: max-content;');
  });

  it('sizes table block controls like toolbar icon buttons', () => {
    const css = readCss();
    const controlBlock = getBlock(css, /^\.ge-table-control\s*\{(?<body>[\s\S]*?)\}/m);
    const iconBlock = getBlock(css, /^\.ge-table-control svg\s*\{(?<body>[\s\S]*?)\}/m);

    expect(controlBlock).toContain('align-items: center;');
    expect(controlBlock).toContain('display: inline-flex;');
    expect(controlBlock).toContain('height: 34px;');
    expect(controlBlock).toContain('justify-content: center;');
    expect(controlBlock).toContain('min-width: 34px;');
    expect(iconBlock).toContain('height: 16px;');
    expect(iconBlock).toContain('width: 16px;');
  });

  it('lets fill layout stretch the CodeMirror content area', () => {
    const css = readCss();
    const fillBlock = getBlock(css, /^\.ge-layout-fill\s+\.cm-content\s*\{(?<body>[\s\S]*?)\}/m);

    expect(fillBlock).toContain('min-height: 100%;');
  });

  it('uses CodeMirror drawSelection without adding a native selection layer', () => {
    expect(readCss()).not.toContain('::selection');
  });

  it('uses syntax token variables for exposed comment token classes', () => {
    const css = readCss();
    const renderedCommentBlock = getBlock(css, /^\.ge-token-comment\s*\{(?<body>[\s\S]*?)\}/m);
    const lezerCommentBlock = getBlock(
      css,
      /^\.tok-url\s*,\s*\.tok-meta\s*,\s*\.tok-comment\s*\{(?<body>[\s\S]*?)\}/m,
    );

    expect(renderedCommentBlock).toContain('color: var(--ge-color-token-comment);');
    expect(lezerCommentBlock).toContain('color: var(--ge-color-token-comment);');
  });
});
