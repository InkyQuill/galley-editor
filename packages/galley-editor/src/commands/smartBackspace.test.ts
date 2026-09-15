import { afterEach, describe, expect, it } from 'vitest';
import { EditorSelection, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import { makeSmartBackspaceTransaction } from './smartBackspace';

let activeView: EditorView | null = null;

function createView(doc: string, cursor = doc.length): EditorView {
  const state = EditorState.create({
    doc,
    extensions: [markdown()],
    selection: { anchor: cursor },
  });
  return new EditorView({ state });
}

function tracked(view: EditorView): EditorView {
  activeView = view;
  return view;
}

afterEach(() => {
  activeView?.destroy();
  activeView = null;
});

describe('smartBackspace', () => {
  it('removes empty list marker instead of deleting list content', () => {
    const view = tracked(createView('- ', 2));
    view.dispatch(makeSmartBackspaceTransaction(view.state));

    expect(view.state.doc.toString()).toBe('');
    expect(view.state.selection.main.from).toBe(0);
  });

  it('keeps indentation when removing an empty indented marker', () => {
    const view = tracked(createView('  - ', 4));
    view.dispatch(makeSmartBackspaceTransaction(view.state));

    expect(view.state.doc.toString()).toBe('  ');
  });

  it('falls back to default behavior for non-list content', () => {
    const state = EditorState.create({
      doc: 'hello',
      extensions: [markdown()],
      selection: EditorSelection.cursor(5),
    });
    const view = tracked(new EditorView({ state }));

    view.dispatch(makeSmartBackspaceTransaction(view.state));

    expect(view.state.doc.toString()).toBe('hell');
  });
});
