import { afterEach, describe, expect, it } from 'vitest';
import { EditorSelection, EditorState } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import { createEditorView, destroyViews } from '../../test-utils/editor';
import { duplicateLine } from './duplicateLine';

const views: EditorView[] = [];

afterEach(() => {
  destroyViews(views);
});

function viewOf(doc: string, selection: EditorSelection | { anchor: number; head?: number }) {
  const view = createEditorView({
    doc,
    selection,
    extensions: [EditorState.allowMultipleSelections.of(true)],
  });
  views.push(view);
  return view;
}

describe('duplicateLine', () => {
  it('duplicates the current line and moves the cursor to the duplicated line', () => {
    const view = viewOf('one\ntwo\nthree', { anchor: 5 });

    expect(duplicateLine(view)).toBe(true);

    expect(view.state.doc.toString()).toBe('one\ntwo\ntwo\nthree');
    expect(view.state.doc.lineAt(view.state.selection.main.head).number).toBe(3);
    expect(view.state.selection.main.head).toBe(9);
  });

  it('duplicates every line touched by a multiline selection', () => {
    const view = viewOf('one\ntwo\nthree\nfour', EditorSelection.range(4, 13));

    duplicateLine(view);

    expect(view.state.doc.toString()).toBe('one\ntwo\nthree\ntwo\nthree\nfour');
    expect(view.state.sliceDoc(view.state.selection.main.from, view.state.selection.main.to)).toBe(
      'two\nthree',
    );
  });

  it('duplicates each multicursor line once in document order', () => {
    const selection = EditorSelection.create([
      EditorSelection.cursor(1),
      EditorSelection.cursor(5),
    ]);
    const view = viewOf('one\ntwo\nthree', selection);

    duplicateLine(view);

    expect(view.state.doc.toString()).toBe('one\none\ntwo\ntwo\nthree');
    expect(view.state.selection.ranges.map((range) => view.state.doc.lineAt(range.head).number)).toEqual([
      2,
      4,
    ]);
  });
});
