import { afterEach, describe, expect, it } from 'vitest';
import { EditorState, EditorSelection } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import { makeSmartEnterTransaction } from './smartEnter';

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

describe('smartEnter', () => {
  it('continues bullet list with matching marker', () => {
    const view = tracked(createView('- hello', 7));
    view.dispatch(makeSmartEnterTransaction(view.state));
    expect(view.state.doc.toString()).toBe('- hello\n- ');
    expect(view.state.selection.main.from).toBe(10);
  });

  it('continues ordered list with incremented marker', () => {
    const view = tracked(createView('1. hello', 8));
    view.dispatch(makeSmartEnterTransaction(view.state));
    expect(view.state.doc.toString()).toBe('1. hello\n2. ');
    expect(view.state.selection.main.from).toBe(12);
  });

  it('continues task list as unchecked', () => {
    const view = tracked(createView('- [x] finished', 14));
    view.dispatch(makeSmartEnterTransaction(view.state));
    expect(view.state.doc.toString()).toBe('- [x] finished\n- [ ] ');
    expect(view.state.selection.main.from).toBe(21);
  });

  it('exits an empty list marker', () => {
    const view = tracked(createView('- ', 2));
    view.dispatch(makeSmartEnterTransaction(view.state));
    expect(view.state.doc.toString()).toBe('');
    expect(view.state.selection.main.from).toBe(0);
  });

  it('leaves text after cursor on newline for middle-of-line lists', () => {
    const view = tracked(createView('- hello world', 7));
    view.dispatch(makeSmartEnterTransaction(view.state));
    expect(view.state.doc.toString()).toBe('- hello\n- world');
    expect(view.state.selection.main.from).toBe(10);
  });

  it('falls back to default Enter when not in a list', () => {
    const view = tracked(createView('hello', 5));
    view.dispatch(makeSmartEnterTransaction(view.state));
    expect(view.state.doc.toString()).toBe('hello\n');
    expect(view.state.selection.main.from).toBe(6);
  });

  it('handles selection by replacing it and inserting list marker', () => {
    const state = EditorState.create({
      doc: '- [x] todo item',
      extensions: [markdown()],
      selection: EditorSelection.range(2, 6),
    });
    const view = tracked(new EditorView({ state }));
    view.dispatch(makeSmartEnterTransaction(view.state));
    expect(view.state.doc.toString()).toBe('- \n- [ ] todo item');
  });
});
