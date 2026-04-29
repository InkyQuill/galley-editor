import { afterEach, describe, expect, it } from 'vitest';
import { EditorSelection } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import { createEditorView, destroyViews, lineElement } from '../test-utils/editor';
import { resolveClassNames } from '../types';
import linksPlugin from './links';

const views: EditorView[] = [];

afterEach(() => {
  destroyViews(views);
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
});
