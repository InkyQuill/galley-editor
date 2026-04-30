import { afterEach, describe, expect, it } from 'vitest';
import type { EditorView } from '@codemirror/view';
import { createEditorView, destroyViews } from '../../test-utils/editor';
import { findInDocument } from './findInDocument';

const views: EditorView[] = [];

afterEach(() => {
  destroyViews(views);
});

function viewOf(doc: string) {
  const view = createEditorView({ doc });
  views.push(view);
  return view;
}

describe('findInDocument', () => {
  it('finds plain-text matches case-insensitively by default', () => {
    const view = viewOf('Alpha beta\nalpha');

    expect(findInDocument(view, 'alpha')).toEqual([
      { from: 0, to: 5, line: 1 },
      { from: 11, to: 16, line: 2 },
    ]);
  });

  it('supports case-sensitive search', () => {
    const view = viewOf('Alpha beta\nalpha');

    expect(findInDocument(view, 'alpha', { caseSensitive: true })).toEqual([
      { from: 11, to: 16, line: 2 },
    ]);
  });

  it('supports whole-word search', () => {
    const view = viewOf('cat catalog cat');

    expect(findInDocument(view, 'cat', { wholeWord: true })).toEqual([
      { from: 0, to: 3, line: 1 },
      { from: 12, to: 15, line: 1 },
    ]);
  });

  it('supports regex search', () => {
    const view = viewOf('v1 v22 v333');

    expect(findInDocument(view, 'v\\d+', { regex: true })).toEqual([
      { from: 0, to: 2, line: 1 },
      { from: 3, to: 6, line: 1 },
      { from: 7, to: 11, line: 1 },
    ]);
  });

  it('returns an empty array for empty needles and no matches', () => {
    const view = viewOf('alpha');

    expect(findInDocument(view, '')).toEqual([]);
    expect(findInDocument(view, 'omega')).toEqual([]);
  });
});
