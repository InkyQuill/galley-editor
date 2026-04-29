import { afterEach, describe, expect, it } from 'vitest';
import { EditorSelection, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import { makeSmartTabTransaction } from './smartTab';
import { parseListLine } from './list-syntax';

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

function parseFirstLine(view: EditorView) {
  const firstLine = view.state.doc.lineAt(0);
  return parseListLine(firstLine.text);
}

describe('smartTab', () => {
  it('indents bullet list items', () => {
    const view = tracked(createView('- item', 2));
    view.dispatch(
      makeSmartTabTransaction(view.state, false),
    );

    const parsed = parseFirstLine(view);
    expect(parsed?.indent).toBe('  ');
    expect(parsed?.bullet).toBe('-');
  });

  it('outdents indented list items', () => {
    const state = EditorState.create({
      doc: '  - item',
      extensions: [markdown()],
      selection: EditorSelection.cursor(0),
    });
    const view = tracked(new EditorView({ state }));

    view.dispatch(makeSmartTabTransaction(view.state, true));

    expect(parseFirstLine(view)).toMatchObject({
      indent: '',
      bullet: '-',
      marker: '- ',
    });
  });

  it('resets ordered sublist markers when indenting', () => {
    const state = EditorState.create({
      doc: '1. one\n2. two',
      extensions: [markdown()],
      selection: EditorSelection.range(0, '1. one\n2. two'.length),
    });
    const view = tracked(new EditorView({ state }));

    view.dispatch(makeSmartTabTransaction(view.state, false));

    const result = view.state.doc.toString();
    expect(result).toBe('  1. one\n  1. two');
  });

  it('outdents ordered list items without renumbering', () => {
    const state = EditorState.create({
      doc: '  2. one\n  5. two',
      extensions: [markdown()],
      selection: EditorSelection.range(0, '  2. one\n  5. two'.length),
    });
    const view = tracked(new EditorView({ state }));

    view.dispatch(makeSmartTabTransaction(view.state, true));

    expect(view.state.doc.toString()).toBe('2. one\n5. two');
  });
});
