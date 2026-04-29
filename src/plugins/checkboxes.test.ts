import { afterEach, describe, expect, it } from 'vitest';
import { EditorSelection, type Transaction } from '@codemirror/state';
import { EditorView, type ViewUpdate } from '@codemirror/view';
import { createEditorView, destroyViews } from '../test-utils/editor';
import { resolveClassNames } from '../types';
import checkboxesPlugin, { CheckboxWidget } from './checkboxes';

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

  it('changes only the task marker when unchecking a checked task', () => {
    const doc = '- [x] finish this task';
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

    (checkbox as HTMLInputElement).checked = false;
    checkbox?.dispatchEvent(new Event('input', { bubbles: true }));

    expect(view.state.doc.toString()).toBe('- [ ] finish this task');
    expect(view.state.selection.main.from).toBe(doc.length);
    expect(view.state.selection.main.to).toBe(doc.length);

    const changedRanges: Array<[number, number, string]> = [];
    for (const transaction of transactions) {
      transaction.changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
        changedRanges.push([fromA, toA, inserted.toString()]);
      });
    }

    const markerFrom = doc.indexOf('[x]');
    expect(changedRanges).toEqual([[markerFrom, markerFrom + '[x]'.length, '[ ]']]);
  });

  it('normalizes uppercase checked task markers when unchecking', () => {
    const doc = '- [X] finish this task';
    const view = createEditorView({
      doc,
      selection: EditorSelection.cursor(doc.length),
      extensions: checkboxesPlugin.extensions(resolveClassNames()),
    });
    views.push(view);

    const checkbox = view.dom.querySelector('.ne-checkbox input');
    expect(checkbox).toBeInstanceOf(HTMLInputElement);

    (checkbox as HTMLInputElement).checked = false;
    checkbox?.dispatchEvent(new Event('input', { bubbles: true }));

    expect(view.state.doc.toString()).toBe('- [ ] finish this task');
  });

  it('updates checkbox DOM metadata when reused', () => {
    const previousWidget = new CheckboxWidget(false, 1, ' old task', 'ne-checkbox');
    const nextWidget = new CheckboxWidget(true, 2, ' new task', 'ne-checkbox-next');
    const dom = previousWidget.toDOM({} as EditorView);
    const reusableWidget = nextWidget as unknown as {
      updateDOM(dom: HTMLElement, view: EditorView, from: CheckboxWidget): boolean;
    };

    expect(reusableWidget.updateDOM(dom, {} as EditorView, previousWidget)).toBe(true);

    const input = dom.querySelector('input');
    expect(input).toBeInstanceOf(HTMLInputElement);
    expect(dom.className).toBe('ne-checkbox-next ne-depth-2');
    expect((input as HTMLInputElement).checked).toBe(true);
    expect((input as HTMLInputElement).ariaLabel).toBe(' new task');
    expect((input as HTMLInputElement).title).toBe(' new task');
  });
});
