import { afterEach, describe, expect, it } from 'vitest';
import { EditorSelection } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import { createEditorView, destroyViews } from '../../test-utils/editor';
import { sortSelectedLines } from './sortSelectedLines';

const views: EditorView[] = [];

afterEach(() => {
  destroyViews(views);
});

function viewOf(doc: string, selection: EditorSelection | { anchor: number; head?: number }) {
  const view = createEditorView({ doc, selection });
  views.push(view);
  return view;
}

describe('sortSelectedLines', () => {
  it('sorts selected lines ascending by default', () => {
    const view = viewOf('pear\napple\nbanana\nzebra', EditorSelection.range(0, 17));

    expect(sortSelectedLines(view)).toBe(true);

    expect(view.state.doc.toString()).toBe('apple\nbanana\npear\nzebra');
  });

  it('sorts selected lines descending', () => {
    const view = viewOf('pear\napple\nbanana\nzebra', EditorSelection.range(0, 17));

    sortSelectedLines(view, 'desc');

    expect(view.state.doc.toString()).toBe('pear\nbanana\napple\nzebra');
  });

  it('does nothing for a cursor-only selection by default', () => {
    const view = viewOf('pear\napple\nbanana', { anchor: 2 });

    expect(sortSelectedLines(view)).toBe(false);
    expect(view.state.doc.toString()).toBe('pear\napple\nbanana');
  });

  it('sorts the whole document when explicitly requested', () => {
    const view = viewOf('pear\napple\nbanana', { anchor: 2 });

    expect(sortSelectedLines(view, { wholeDocument: true })).toBe(true);

    expect(view.state.doc.toString()).toBe('apple\nbanana\npear');
  });
});
