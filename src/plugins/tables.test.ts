import { afterEach, describe, expect, it } from 'vitest';
import { EditorSelection, type Transaction, type TransactionSpec } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import { createEditorView, destroyViews, lineElement } from '../test-utils/editor';
import { resolveClassNames, type GalleyRenderContext } from '../types';
import tablesPlugin from './tables';

const views: EditorView[] = [];
const editableLiveContext: GalleyRenderContext = { theme: 'light', mode: 'live', canEdit: true };
const previewReadonlyContext: GalleyRenderContext = { theme: 'light', mode: 'preview', canEdit: false };

afterEach(() => {
  destroyViews(views);
});

function tableEditor(
  doc: string,
  selectionText = 'plain',
  context: GalleyRenderContext = editableLiveContext,
): EditorView {
  const view = createEditorView({
    doc,
    selection: EditorSelection.cursor(doc.indexOf(selectionText)),
    extensions: tablesPlugin.extensions(resolveClassNames(), context),
  });
  views.push(view);
  return view;
}

function cell(view: EditorView, ref: string): HTMLElement {
  const element = view.dom.querySelector(`[data-ge-table-cell="${ref}"]`);
  expect(element).toBeInstanceOf(HTMLElement);
  return element as HTMLElement;
}

function clickCell(view: EditorView, ref: string, init: MouseEventInit = {}): void {
  cell(view, ref).dispatchEvent(new MouseEvent('mousedown', { bubbles: true, ...init }));
}

function keydown(target: EventTarget, key: string, init: KeyboardEventInit = {}): void {
  target.dispatchEvent(new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    key,
    ...init,
  }));
}

function setEditorValue(input: HTMLInputElement, value: string): void {
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function activeInput(view: EditorView): HTMLInputElement {
  const input = view.dom.querySelector('.ge-table-cell-editor');
  expect(input).toBeInstanceOf(HTMLInputElement);
  return input as HTMLInputElement;
}

function pasteEvent(text: string): Event {
  const event = new Event('paste', { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'clipboardData', {
    value: {
      getData: (type: string) => type === 'text/plain' ? text : '',
    },
  });
  return event;
}

describe('tablesPlugin', () => {
  it('renders an inactive multiline table as a visual table widget', () => {
    const doc = '| A | B |\n| - | - |\n| 1 | 2 |\n\nplain';
    const view = tableEditor(doc);

    const table = view.dom.querySelector('.ge-table-widget table');
    expect(table).toBeInstanceOf(HTMLTableElement);
    expect(table?.querySelectorAll('thead th')).toHaveLength(2);
    expect(table?.querySelector('thead th')?.textContent).toBe('A');
    expect(table?.querySelector('tbody td')?.textContent).toBe('1');
  });

  it('keeps editable live parseable tables rendered when editor selection is inside source', () => {
    const doc = '| A | B |\n| - | - |\n| one | two |\n\nplain';
    const view = tableEditor(doc, 'one');

    expect(view.dom.querySelector('.ge-table-widget table')).toBeInstanceOf(HTMLTableElement);
    expect(lineElement(view, 1).textContent).not.toContain('| A | B |');
  });

  it('selects a rendered cell without revealing source on normal click', () => {
    const doc = '| A | B |\n| - | - |\n| one | two |\n\nplain';
    const view = tableEditor(doc);

    clickCell(view, '1:1');

    expect(view.dom.querySelector('.ge-table-widget table')).toBeInstanceOf(HTMLTableElement);
    expect(view.dom.querySelector('.ge-table-cell-selected')?.textContent).toBe('two');
    expect(lineElement(view, 1).textContent).not.toContain('| A | B |');
  });

  it('reveals cell source on ctrl-click', () => {
    const doc = '| A | B |\n| - | - |\n| one | two |\n\nplain';
    const view = tableEditor(doc);

    clickCell(view, '1:1', { ctrlKey: true });

    expect(view.state.selection.main.head).toBe(doc.indexOf('two'));
    expect(view.dom.querySelector('.ge-table-widget')).toBeNull();
  });

  it('reveals cell source on meta-click', () => {
    const doc = '| A | B |\n| - | - |\n| one | two |\n\nplain';
    const view = tableEditor(doc);

    clickCell(view, '1:1', { metaKey: true });

    expect(view.state.selection.main.head).toBe(doc.indexOf('two'));
    expect(view.dom.querySelector('.ge-table-widget')).toBeNull();
  });

  it('reveals table source from the edit source control', () => {
    const doc = '| A | B |\n| - | - |\n| one | two |\n\nplain';
    const view = tableEditor(doc);

    clickCell(view, '1:1');
    view.dom.querySelector('button[aria-label="Edit table source"]')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(view.state.selection.main.head).toBe(doc.indexOf('two'));
    expect(view.dom.querySelector('.ge-table-widget')).toBeNull();
    expect(lineElement(view, 1).textContent).toContain('| A | B |');
  });


  it('starts editing from a printable key and commits with Enter', () => {
    const doc = '| A | B |\n| - | - |\n| one | two |\n\nplain';
    const view = tableEditor(doc);

    clickCell(view, '1:1');
    keydown(view.contentDOM, 'x');
    setEditorValue(activeInput(view), 'done');
    keydown(activeInput(view), 'Enter');

    expect(view.state.doc.toString()).toContain('| one | done |');
  });

  it('cancels a draft with Escape', () => {
    const doc = '| A | B |\n| - | - |\n| one | two |\n\nplain';
    const view = tableEditor(doc);

    clickCell(view, '1:1');
    keydown(view.contentDOM, 'Enter');
    setEditorValue(activeInput(view), 'discard');
    keydown(activeInput(view), 'Escape');

    expect(view.state.doc.toString()).toBe(doc);
    expect(view.dom.querySelector('.ge-table-cell-editor')).toBeNull();
    expect(view.dom.querySelector('.ge-table-cell-selected')?.textContent).toBe('two');
  });

  it('keeps editing when mousedown originates from the active cell editor', () => {
    const doc = '| A | B |\n| - | - |\n| one | two |\n\nplain';
    const view = tableEditor(doc);

    clickCell(view, '1:1');
    keydown(view.contentDOM, 'Enter');
    const input = activeInput(view);
    input.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));

    expect(view.dom.querySelector('.ge-table-cell-editor')).toBe(input);
    expect(view.dom.querySelector('.ge-table-cell-selected .ge-table-cell-editor')).toBe(input);
  });

  it('keeps the active cell editor DOM stable while typing in the middle', () => {
    const doc = '| A | B |\n| - | - |\n| one | two |\n\nplain';
    const view = tableEditor(doc);

    clickCell(view, '1:1');
    keydown(view.contentDOM, 'Enter');
    const input = activeInput(view);
    input.value = 'tXwo';
    input.setSelectionRange(2, 2);
    input.dispatchEvent(new Event('input', { bubbles: true }));

    expect(activeInput(view)).toBe(input);
    expect(input.selectionStart).toBe(2);
    expect(input.selectionEnd).toBe(2);

    keydown(input, 'Enter');

    expect(view.state.doc.toString()).toContain('| one | tXwo |');
  });

  it('defocuses a selected cell with Escape without revealing source', () => {
    const doc = '| A | B |\n| - | - |\n| one | two |\n\nplain';
    const view = tableEditor(doc);

    clickCell(view, '1:1');
    keydown(view.contentDOM, 'Escape');

    expect(view.dom.querySelector('.ge-table-cell-selected')).toBeNull();
    expect(view.dom.querySelector('.ge-table-widget table')).toBeInstanceOf(HTMLTableElement);
  });

  it('commits with Tab and Shift+Tab while moving selection right and left', () => {
    const doc = '| A | B | C |\n| - | - | - |\n| one | two | three |\n\nplain';
    const view = tableEditor(doc);

    clickCell(view, '1:1');
    keydown(view.contentDOM, 'Enter');
    setEditorValue(activeInput(view), 'done');
    keydown(activeInput(view), 'Tab');

    expect(view.state.doc.toString()).toContain('| one | done | three |');
    expect(view.dom.querySelector('.ge-table-cell-selected')?.getAttribute('data-ge-table-cell')).toBe('1:2');

    keydown(view.contentDOM, 'Enter');
    setEditorValue(activeInput(view), 'last');
    keydown(activeInput(view), 'Tab', { shiftKey: true });

    expect(view.state.doc.toString()).toContain('| one | done | last |');
    expect(view.dom.querySelector('.ge-table-cell-selected')?.getAttribute('data-ge-table-cell')).toBe('1:1');
  });

  it('commits and navigates with arrow keys only at the input edge', () => {
    const doc = '| A | B |\n| - | - |\n| one | two |\n\nplain';
    const view = tableEditor(doc);

    clickCell(view, '1:0');
    keydown(view.contentDOM, 'Enter');
    const input = activeInput(view);
    setEditorValue(input, 'first');
    input.setSelectionRange(2, 2);
    keydown(input, 'ArrowRight');

    expect(view.state.doc.toString()).toBe(doc);
    expect(view.dom.querySelector('.ge-table-cell-selected .ge-table-cell-editor')).toBeInstanceOf(HTMLInputElement);

    input.setSelectionRange(input.value.length, input.value.length);
    keydown(input, 'ArrowRight');

    expect(view.state.doc.toString()).toContain('| first | two |');
    expect(view.dom.querySelector('.ge-table-cell-selected')?.getAttribute('data-ge-table-cell')).toBe('1:1');
  });

  it('replaces the active input with pasted plain text and commits it', () => {
    const doc = '| A | B |\n| - | - |\n| one | two |\n\nplain';
    const view = tableEditor(doc);

    clickCell(view, '1:1');
    keydown(view.contentDOM, 'Enter');
    activeInput(view).dispatchEvent(pasteEvent('pasted text'));
    keydown(activeInput(view), 'Enter');

    expect(view.state.doc.toString()).toContain('| one | pasted text |');
  });

  it('renders controls and calls table commands', () => {
    const doc = '| A | B |\n| - | - |\n| one | two |\n| three | four |\n\nplain';
    const view = tableEditor(doc);

    clickCell(view, '1:1');
    view.dom.querySelector('button[aria-label="Add row after"]')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(view.state.doc.toString()).toContain('| one | two |\n|  |  |\n| three | four |');
    expect(view.dom.querySelector('.ge-table-widget table')).toBeInstanceOf(HTMLTableElement);
    expect(view.dom.querySelector('.ge-table-cell-selected')).toBeInstanceOf(HTMLElement);
  });

  it('hides controls and ignores cell editing in preview/read-only context', () => {
    const doc = '| A | B |\n| - | - |\n| one | two |\n\nplain';
    const view = tableEditor(doc, 'one', previewReadonlyContext);

    expect(view.dom.querySelector('.ge-table-widget table')).toBeInstanceOf(HTMLTableElement);
    expect(view.dom.querySelector('button[aria-label="Add row after"]')).toBeNull();

    clickCell(view, '1:1');
    keydown(view.contentDOM, 'Enter');

    expect(view.dom.querySelector('.ge-table-cell-selected')).toBeNull();
    expect(view.dom.querySelector('.ge-table-cell-editor')).toBeNull();
  });

  it('does not request scrolling after committing a cell edit', () => {
    const doc = '| A | B |\n| - | - |\n| one | two |\n\nplain';
    const view = tableEditor(doc);
    const dispatch = view.dispatch.bind(view);
    const transactions: Transaction[] = [];
    view.dispatch = ((...specs: Parameters<EditorView['dispatch']>) => {
      const transaction = view.state.update(...(specs as [TransactionSpec, ...TransactionSpec[]]));
      transactions.push(transaction);
      dispatch(transaction);
    }) as EditorView['dispatch'];

    clickCell(view, '1:1');
    keydown(view.contentDOM, 'Enter');
    setEditorValue(activeInput(view), 'done');
    keydown(activeInput(view), 'Enter');

    expect(transactions.some((transaction) => transaction.scrollIntoView)).toBe(false);
  });

  it('applies separator alignment to rendered cells', () => {
    const doc = '| Left | Center | Right |\n| :--- | :---: | ---: |\n| a | b | c |\n\nplain';
    const view = tableEditor(doc);

    const cells = view.dom.querySelectorAll('.ge-table-widget tbody td');
    expect(cells.item(0).classList.contains('ge-align-left')).toBe(true);
    expect(cells.item(1).classList.contains('ge-align-center')).toBe(true);
    expect(cells.item(2).classList.contains('ge-align-right')).toBe(true);
  });

  it('does not render unsupported escaped-pipe tables as widgets', () => {
    const doc = '| A | B |\n| - | - |\n| one \\| two | three |\n\nplain';
    const view = tableEditor(doc);

    expect(view.dom.querySelector('.ge-table-widget')).toBeNull();
    expect(lineElement(view, 1).textContent).toContain('| A | B |');
  });
});
