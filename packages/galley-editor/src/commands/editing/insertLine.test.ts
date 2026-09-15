import { afterEach, describe, expect, it } from 'vitest';
import { EditorSelection, EditorState } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import { createEditorView, destroyViews } from '../../test-utils/editor';
import { insertLineAfter, insertLineBefore } from './insertLine';

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

describe('insertLineAfter', () => {
  it('inserts a blank line after the current line and moves the cursor there', () => {
    const view = viewOf('one\ntwo', { anchor: 1 });

    expect(insertLineAfter(view)).toBe(true);

    expect(view.state.doc.toString()).toBe('one\n\ntwo');
    expect(view.state.selection.main.head).toBe(4);
  });

  it('handles multiple cursors in document order', () => {
    const view = viewOf(
      'one\ntwo\nthree',
      EditorSelection.create([
        EditorSelection.cursor(1),
        EditorSelection.cursor(5),
      ]),
    );

    insertLineAfter(view);

    expect(view.state.doc.toString()).toBe('one\n\ntwo\n\nthree');
    expect(view.state.selection.ranges.map((range) => range.head)).toEqual([4, 9]);
  });
});

describe('insertLineBefore', () => {
  it('inserts a blank line before the current line and moves the cursor there', () => {
    const view = viewOf('one\ntwo', { anchor: 5 });

    expect(insertLineBefore(view)).toBe(true);

    expect(view.state.doc.toString()).toBe('one\n\ntwo');
    expect(view.state.selection.main.head).toBe(4);
  });
});
