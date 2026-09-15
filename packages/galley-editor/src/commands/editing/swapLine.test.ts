import { afterEach, describe, expect, it } from 'vitest';
import { EditorSelection, EditorState } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import { createEditorView, destroyViews } from '../../test-utils/editor';
import { swapLineDown, swapLineUp } from './swapLine';

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

describe('swapLineUp', () => {
  it('swaps the current line with the line above and moves the cursor with it', () => {
    const view = viewOf('one\ntwo\nthree', { anchor: 5 });

    expect(swapLineUp(view)).toBe(true);

    expect(view.state.doc.toString()).toBe('two\none\nthree');
    expect(view.state.doc.lineAt(view.state.selection.main.head).number).toBe(1);
    expect(view.state.selection.main.head).toBe(1);
  });

  it('returns false at the top of the document', () => {
    const view = viewOf('one\ntwo', { anchor: 1 });

    expect(swapLineUp(view)).toBe(false);
    expect(view.state.doc.toString()).toBe('one\ntwo');
  });
});

describe('swapLineDown', () => {
  it('swaps the current line with the line below and moves the cursor with it', () => {
    const view = viewOf('one\ntwo\nthree', { anchor: 5 });

    expect(swapLineDown(view)).toBe(true);

    expect(view.state.doc.toString()).toBe('one\nthree\ntwo');
    expect(view.state.doc.lineAt(view.state.selection.main.head).number).toBe(3);
    expect(view.state.selection.main.head).toBe(11);
  });

  it('returns false at the bottom of the document', () => {
    const view = viewOf('one\ntwo', { anchor: 5 });

    expect(swapLineDown(view)).toBe(false);
    expect(view.state.doc.toString()).toBe('one\ntwo');
  });

  it('lets the lower-numbered cursor win on adjacent collisions', () => {
    const view = viewOf(
      'one\ntwo\nthree',
      EditorSelection.create([
        EditorSelection.cursor(1),
        EditorSelection.cursor(5),
      ]),
    );

    expect(swapLineDown(view)).toBe(true);

    expect(view.state.doc.toString()).toBe('two\none\nthree');
    expect(view.state.selection.ranges.map((range) => view.state.doc.lineAt(range.head).number)).toEqual(
      expect.arrayContaining([2]),
    );
  });
});
