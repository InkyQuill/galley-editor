import { afterEach, describe, expect, it } from 'vitest';
import { EditorSelection } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import { createEditorView, destroyViews, lineElement } from '../test-utils/editor';
import { resolveClassNames } from '../types';
import blockquotePlugin from './blockquote';

const views: EditorView[] = [];

afterEach(() => {
  destroyViews(views);
});

describe('blockquotePlugin', () => {
  it('applies the blockquote line class to every line in a multiline blockquote', () => {
    const doc = '> one\n> two\n> three\n\nplain';
    const view = createEditorView({
      doc,
      selection: EditorSelection.cursor(doc.indexOf('plain')),
      extensions: blockquotePlugin.extensions(resolveClassNames()),
    });
    views.push(view);

    expect(lineElement(view, 1).classList.contains('ge-blockquote')).toBe(true);
    expect(lineElement(view, 2).classList.contains('ge-blockquote')).toBe(true);
    expect(lineElement(view, 3).classList.contains('ge-blockquote')).toBe(true);
  });
});
