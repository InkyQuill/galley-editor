import { afterEach, describe, expect, it, vi } from 'vitest';
import { EditorSelection } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import { createEditorView, destroyViews, lineElement } from '../test-utils/editor';
import { resolveClassNames } from '../types';
import linksPlugin from './links';

const views: EditorView[] = [];

afterEach(() => {
  destroyViews(views);
  vi.unstubAllGlobals();
});

describe('linksPlugin', () => {
  it('hides link markdown when the cursor is outside the link', () => {
    const doc = '[Visit](https://example.com)\n\nplain';
    const view = createEditorView({
      doc,
      selection: EditorSelection.cursor(doc.length),
      extensions: linksPlugin.extensions(resolveClassNames()),
    });
    views.push(view);

    expect(lineElement(view, 1).textContent).toBe('Visit');
  });

  it('reveals the full link markdown when the cursor is inside the link label', () => {
    const doc = '[Visit](https://example.com)\n\nplain';
    const view = createEditorView({
      doc,
      selection: EditorSelection.cursor(2),
      extensions: linksPlugin.extensions(resolveClassNames()),
    });
    views.push(view);

    expect(lineElement(view, 1).textContent).toBe('[Visit](https://example.com)');
  });

  it('renders reference-style links and hides the reference label', () => {
    const doc = 'This is a [link to something][ref].\n\n[ref]: https://example.com "Optional title"';
    const view = createEditorView({
      doc,
      selection: EditorSelection.cursor(0),
      extensions: linksPlugin.extensions(resolveClassNames()),
    });
    views.push(view);

    expect(lineElement(view, 1).textContent).toBe('This is a link to something.');
    expect(lineElement(view, 1).querySelector('.ge-link')).toBeInstanceOf(HTMLElement);
    expect(lineElement(view, 3).textContent).toBe('');
  });

  it('renders shorthand reference links', () => {
    const doc = '[ref]\n\n[ref]: https://example.com';
    const view = createEditorView({
      doc,
      selection: EditorSelection.cursor(doc.length),
      extensions: linksPlugin.extensions(resolveClassNames()),
    });
    views.push(view);

    expect(lineElement(view, 1).textContent).toBe('ref');
    expect(lineElement(view, 1).querySelector('.ge-link')).toBeInstanceOf(HTMLElement);
  });

  it('opens inline links on Cmd/Ctrl-click', () => {
    const open = vi.fn();
    vi.stubGlobal('open', open);
    const doc = '[Visit](https://example.com)\n\nplain';
    const view = createEditorView({
      doc,
      selection: EditorSelection.cursor(doc.length),
      extensions: linksPlugin.extensions(resolveClassNames()),
    });
    views.push(view);

    const link = lineElement(view, 1).querySelector('.ge-link');
    link?.dispatchEvent(new MouseEvent('click', { bubbles: true, metaKey: true }));

    expect(open).toHaveBeenCalledWith('https://example.com', '_blank', 'noopener,noreferrer');
  });

  it('lets onLinkClick intercept link activation', () => {
    const open = vi.fn();
    const onLinkClick = vi.fn(() => true);
    vi.stubGlobal('open', open);
    const doc = '[Visit](https://example.com)\n\nplain';
    const view = createEditorView({
      doc,
      selection: EditorSelection.cursor(doc.length),
      extensions: linksPlugin.extensions(resolveClassNames(), {
        theme: 'light',
        onLinkClick,
      }),
    });
    views.push(view);

    const link = lineElement(view, 1).querySelector('.ge-link');
    link?.dispatchEvent(new MouseEvent('click', { bubbles: true, ctrlKey: true }));

    expect(onLinkClick).toHaveBeenCalledWith('https://example.com', expect.any(MouseEvent));
    expect(open).not.toHaveBeenCalled();
  });

  it('opens resolved reference links on Cmd/Ctrl-click', () => {
    const open = vi.fn();
    vi.stubGlobal('open', open);
    const doc = '[Read][ref]\n\n[ref]: https://example.com';
    const view = createEditorView({
      doc,
      selection: EditorSelection.cursor(doc.length),
      extensions: linksPlugin.extensions(resolveClassNames()),
    });
    views.push(view);

    const link = lineElement(view, 1).querySelector('.ge-link');
    link?.dispatchEvent(new MouseEvent('click', { bubbles: true, metaKey: true }));

    expect(open).toHaveBeenCalledWith('https://example.com', '_blank', 'noopener,noreferrer');
  });
});
