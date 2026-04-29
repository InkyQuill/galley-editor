import { afterEach, describe, expect, it } from 'vitest';
import { EditorSelection, type Transaction } from '@codemirror/state';
import { EditorView, type ViewUpdate } from '@codemirror/view';
import { createEditorView, destroyViews } from '../test-utils/editor';
import { resolveClassNames } from '../types';
import checkboxesPlugin from './checkboxes';

const views: EditorView[] = [];

afterEach(() => {
  destroyViews(views);
});

describe('checkboxesPlugin', () => {
  it('changes only the task marker and preserves an end-of-line cursor', () => {
    const doc = '- [ ] finish this task';
    const transactions: Transaction[] = [];
    const view = createEditorView({
      doc,
      selection: EditorSelection.cursor(doc.length),
      extensions: [
        ...checkboxesPlugin.extensions(resolveClassNames()),
        EditorView.updateListener.of((update: ViewUpdate) => {
          transactions.push(...update.transactions.filter((tr) => !tr.changes.empty));
        }),
      ],
    });
    views.push(view);

    const checkbox = view.dom.querySelector('.ne-checkbox input');
    expect(checkbox).toBeInstanceOf(HTMLInputElement);

    (checkbox as HTMLInputElement).checked = true;
    checkbox?.dispatchEvent(new Event('input', { bubbles: true }));

    expect(view.state.doc.toString()).toBe('- [x] finish this task');
    expect(view.state.selection.main.from).toBe(doc.length);
    expect(view.state.selection.main.to).toBe(doc.length);

    const changedRanges: Array<[number, number, string]> = [];
    for (const transaction of transactions) {
      transaction.changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
        changedRanges.push([fromA, toA, inserted.toString()]);
      });
    }

    const markerFrom = doc.indexOf('[ ]');
    expect(changedRanges).toEqual([[markerFrom, markerFrom + '[ ]'.length, '[x]']]);
  });
});
