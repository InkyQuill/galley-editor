import { afterEach, describe, expect, it } from 'vitest';
import { EditorSelection } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import { createEditorView, destroyViews, lineElement } from '../test-utils/editor';
import { resolveClassNames } from '../types';
import tablesPlugin from './tables';

const views: EditorView[] = [];

afterEach(() => {
  destroyViews(views);
});

describe('tablesPlugin', () => {
  it('applies the table line class to every line in a multiline table', () => {
    const doc = '| A | B |\n| - | - |\n| 1 | 2 |\n\nplain';
    const view = createEditorView({
      doc,
      selection: EditorSelection.cursor(doc.indexOf('plain')),
      extensions: tablesPlugin.extensions(resolveClassNames()),
    });
    views.push(view);

    expect(lineElement(view, 1).classList.contains('ne-table')).toBe(true);
    expect(lineElement(view, 2).classList.contains('ne-table')).toBe(true);
    expect(lineElement(view, 3).classList.contains('ne-table')).toBe(true);
  });
});
