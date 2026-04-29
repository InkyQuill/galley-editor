import { afterEach, describe, expect, it, vi } from 'vitest';
import { EditorSelection } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import { createEditorView, destroyViews, lineElement } from '../test-utils/editor';
import { resolveClassNames } from '../types';
import codeFencePlugin from './code-fence';

const views: EditorView[] = [];

afterEach(() => {
  destroyViews(views);
  vi.unstubAllGlobals();
});

describe('codeFencePlugin', () => {
  it('renders an inactive fenced code block as a visual block widget', () => {
    const doc = '```ts\nconst answer = 42;\n```\n\nplain';
    const view = createEditorView({
      doc,
      selection: EditorSelection.cursor(doc.indexOf('plain')),
      extensions: codeFencePlugin.extensions(resolveClassNames(), { theme: 'light' }),
    });
    views.push(view);

    const block = view.dom.querySelector('.ne-code-block');
    expect(block).toBeInstanceOf(HTMLElement);
    expect(block?.querySelector('.ne-code-language')?.textContent).toBe('ts');
    expect(block?.querySelector('.ne-code-copy')?.textContent).toBe('Copy');
    expect(block?.querySelector('.ne-token-keyword')?.textContent).toBe('const');
    expect(block?.textContent).toContain('answer');
  });

  it('shows raw fenced markdown when the cursor is inside the block', () => {
    const doc = '```ts\nconst answer = 42;\n```\n\nplain';
    const view = createEditorView({
      doc,
      selection: EditorSelection.cursor(doc.indexOf('answer')),
      extensions: codeFencePlugin.extensions(resolveClassNames(), { theme: 'light' }),
    });
    views.push(view);

    expect(view.dom.querySelector('.ne-code-block')).toBeNull();
    expect(lineElement(view, 1).textContent).toBe('```ts');
  });

  it('uses a consumer-provided highlighter when one is configured', () => {
    const doc = '```js\nconsole.log("hi");\n```\n\nplain';
    const view = createEditorView({
      doc,
      selection: EditorSelection.cursor(doc.indexOf('plain')),
      extensions: codeFencePlugin.extensions(resolveClassNames(), {
        theme: 'dark',
        codeHighlighter: ({ code, language, theme }) =>
          `<mark data-language="${language}" data-theme="${theme}">${code}</mark>`,
      }),
    });
    views.push(view);

    const mark = view.dom.querySelector('.ne-code-body mark');
    expect(mark).toBeInstanceOf(HTMLElement);
    expect(mark?.getAttribute('data-language')).toBe('js');
    expect(mark?.getAttribute('data-theme')).toBe('dark');
    expect(mark?.textContent).toBe('console.log("hi");');
  });

  it('copies code from the copy button without collapsing the widget', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', {
      ...navigator,
      clipboard: { writeText },
    });
    const doc = '```ts\nconst answer = 42;\n```\n\nplain';
    const view = createEditorView({
      doc,
      selection: EditorSelection.cursor(doc.indexOf('plain')),
      extensions: codeFencePlugin.extensions(resolveClassNames(), { theme: 'light' }),
    });
    views.push(view);

    const copy = view.dom.querySelector('.ne-code-copy');
    expect(copy).toBeInstanceOf(HTMLButtonElement);

    copy?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    copy?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await Promise.resolve();

    expect(writeText).toHaveBeenCalledWith('const answer = 42;');
    expect(view.dom.querySelector('.ne-code-block')).toBeInstanceOf(HTMLElement);
  });
});
