import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  Compartment,
  EditorSelection,
  type Transaction,
  type TransactionSpec,
} from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import { createEditorView, destroyViews, lineElement } from '../test-utils/editor';
import { resolveClassNames, type GalleyRenderContext } from '../types';
import tablesPlugin, { safeTableCellHref } from './tables';

const views: EditorView[] = [];
const editableLiveContext: GalleyRenderContext = { theme: 'light', mode: 'live', canEdit: true };
const previewReadonlyContext: GalleyRenderContext = { theme: 'light', mode: 'preview', canEdit: false };

afterEach(() => {
  vi.restoreAllMocks();
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

  it('renders bold and code spans in inactive table cells', () => {
    const doc = '| A | B |\n| - | - |\n| **bold** | `code` |\n\nplain';
    const view = tableEditor(doc);

    const bold = cell(view, '1:0').querySelector('.ge-table-cell-bold');
    const code = cell(view, '1:1').querySelector('.ge-table-cell-code');

    expect(bold).toBeInstanceOf(HTMLElement);
    expect(bold?.tagName).toBe('STRONG');
    expect(bold?.textContent).toBe('bold');
    expect(code).toBeInstanceOf(HTMLElement);
    expect(code?.tagName).toBe('CODE');
    expect(code?.textContent).toBe('code');

    clickCell(view, '1:0');

    const selectedBold = cell(view, '1:0').querySelector('.ge-table-cell-bold');
    expect(selectedBold).toBeInstanceOf(HTMLElement);
    expect(selectedBold?.textContent).toBe('bold');
  });

  it('renders links in inactive table cells', () => {
    const doc = '| A |\n| - |\n| [label](https://example.com/path?q=1) |\n\nplain';
    const view = tableEditor(doc);

    const link = cell(view, '1:0').querySelector('.ge-table-cell-link');

    expect(link).toBeInstanceOf(HTMLAnchorElement);
    expect(link?.textContent).toBe('label');
    expect(link?.getAttribute('href')).toBe('https://example.com/path?q=1');
  });

  it.each([
    ['javascript:alert(1)'],
    ['JaVaScRiPt:alert(1)'],
    ['java\tscript:alert(1)'],
  ])('omits unsafe hrefs from inactive table cell links for %s', (href) => {
    const doc = `| A |\n| - |\n| [x](${href}) |\n\nplain`;
    const view = tableEditor(doc);

    const renderedCell = cell(view, '1:0');
    const link = renderedCell.querySelector('.ge-table-cell-link');

    expect(link).toBeInstanceOf(HTMLAnchorElement);
    expect(link?.textContent).toBe('x');
    expect(link?.hasAttribute('href')).toBe(false);
    expect(renderedCell.querySelector('[href*="javascript:"]')).toBeNull();
  });

  it.each([
    ['http://example.com'],
    ['https://example.com'],
    ['mailto:test@example.com'],
    ['/docs'],
    ['./page'],
    ['../page'],
    ['page.md'],
    ['#section'],
  ])('allows safe table cell href %s', (href) => {
    expect(safeTableCellHref(href)).toBe(href);
  });

  it.each([
    ['javascript:alert(1)'],
    ['JaVaScRiPt:alert(1)'],
    ['java\tscript:alert(1)'],
    ['java\nscript:alert(1)'],
    ['data:text/html,<svg>'],
    ['DaTa:text/html,<svg>'],
    ['da\tta:text/html,<svg>'],
    ['da\nta:text/html,<svg>'],
  ])('rejects unsafe table cell href %s', (href) => {
    expect(safeTableCellHref(href)).toBeNull();
  });

  it('escapes raw HTML in inactive table cells', () => {
    const doc = '| A |\n| - |\n| <img src=x onerror=alert(1)> |\n\nplain';
    const view = tableEditor(doc);
    const renderedCell = cell(view, '1:0');

    expect(renderedCell.querySelector('img')).toBeNull();
    expect(renderedCell.textContent).toBe('<img src=x onerror=alert(1)>');
  });

  it('keeps raw Markdown in the active cell editor', () => {
    const doc = '| A |\n| - |\n| **bold** |\n\nplain';
    const view = tableEditor(doc);

    clickCell(view, '1:0');
    keydown(view.contentDOM, 'Enter');

    expect(activeInput(view).value).toBe('**bold**');
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

  it('starts editing the existing cell text from a second click on the selected cell', () => {
    const doc = '| A | B |\n| - | - |\n| one | two |\n\nplain';
    const view = tableEditor(doc);

    clickCell(view, '1:1');
    expect(view.dom.querySelector('.ge-table-cell-editor')).toBeNull();

    clickCell(view, '1:1');
    const input = activeInput(view);

    expect(input.value).toBe('two');
    expect(input.size).toBe(3);

    setEditorValue(input, 'updated');
    keydown(input, 'Enter');

    expect(view.state.doc.toString()).toContain('| one | updated |');
  });

  it('commits the active cell edit before selecting another cell', () => {
    const doc = '| A | B |\n| - | - |\n| one | two |\n\nplain';
    const view = tableEditor(doc);

    clickCell(view, '1:1');
    clickCell(view, '1:1');
    setEditorValue(activeInput(view), 'changed');
    clickCell(view, '1:0');

    expect(view.state.doc.toString()).toContain('| one | changed |');
    expect(view.dom.querySelector('.ge-table-cell-editor')).toBeNull();
    expect(view.dom.querySelector('.ge-table-cell-selected')?.getAttribute('data-ge-table-cell')).toBe('1:0');
  });

  it('sizes the active cell editor from its text instead of forcing the column width', () => {
    const doc = '| A | B |\n| - | - |\n| one | two |\n\nplain';
    const view = tableEditor(doc);

    clickCell(view, '1:1');
    clickCell(view, '1:1');
    const input = activeInput(view);

    expect(input.size).toBe(3);

    setEditorValue(input, 'ok');
    expect(input.size).toBe(2);

    setEditorValue(input, '');
    expect(input.size).toBe(1);
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

  it('keeps active input printable keydown from reaching CodeMirror', () => {
    const doc = '| A | B |\n| - | - |\n| one | two |\n\nplain';
    const view = tableEditor(doc);
    let reachedCodeMirror = false;

    clickCell(view, '1:1');
    keydown(view.contentDOM, 'Enter');
    const input = activeInput(view);
    view.contentDOM.addEventListener('keydown', () => {
      reachedCodeMirror = true;
    });
    keydown(input, 'x');

    expect(reachedCodeMirror).toBe(false);
    expect(activeInput(view)).toBe(input);
  });

  it('keeps non-edge arrow keydown inside the active input', () => {
    const doc = '| A | B |\n| - | - |\n| one | two |\n\nplain';
    const view = tableEditor(doc);
    let reachedCodeMirror = false;

    clickCell(view, '1:0');
    keydown(view.contentDOM, 'Enter');
    const input = activeInput(view);
    input.value = 'first';
    input.setSelectionRange(2, 2);
    view.contentDOM.addEventListener('keydown', () => {
      reachedCodeMirror = true;
    });
    keydown(input, 'ArrowRight');

    expect(reachedCodeMirror).toBe(false);
    expect(view.state.doc.toString()).toBe(doc);
    expect(activeInput(view)).toBe(input);
    expect(input.selectionStart).toBe(2);
    expect(input.selectionEnd).toBe(2);
  });

  it('pastes plain text into the active input selection', () => {
    const doc = '| A | B |\n| - | - |\n| one | two |\n\nplain';
    const view = tableEditor(doc);

    clickCell(view, '1:1');
    keydown(view.contentDOM, 'Enter');
    const input = activeInput(view);
    input.value = 'hello world';
    input.setSelectionRange(6, 11);
    input.dispatchEvent(pasteEvent('table'));

    expect(input.value).toBe('hello table');
    expect(input.selectionStart).toBe(11);
    expect(input.selectionEnd).toBe(11);

    keydown(input, 'Enter');

    expect(view.state.doc.toString()).toContain('| one | hello table |');
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
    const input = activeInput(view);
    input.setSelectionRange(0, input.value.length);
    input.dispatchEvent(pasteEvent('pasted text'));
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

  it('uses custom table control icons from render context', () => {
    const doc = '| A | B |\n| - | - |\n| one | two |\n\nplain';
    const view = tableEditor(doc, 'plain', {
      ...editableLiveContext,
      tableControlIcons: {
        insertRowAfter: ({ label }) => {
          const icon = document.createElement('span');
          icon.className = 'custom-table-icon';
          icon.dataset.label = label;
          icon.textContent = 'ROW+';
          return icon;
        },
        deleteColumn: 'COL-',
      },
    });

    clickCell(view, '1:1');

    const addRowAfter = view.dom.querySelector('button[aria-label="Add row after"]');
    expect(addRowAfter?.textContent).toBe('ROW+');
    expect(addRowAfter?.getAttribute('title')).toBe('Add row after');
    expect(addRowAfter?.querySelector('.custom-table-icon')).toBeInstanceOf(HTMLElement);
    expect(addRowAfter?.querySelector('.custom-table-icon')?.getAttribute('data-label')).toBe('Add row after');
    expect(view.dom.querySelector('button[aria-label="Delete column"]')?.textContent).toBe('COL-');
    expect(view.dom.querySelector('button[aria-label="Add row before"]')?.textContent).toBe('+R^');
  });

  it('falls back to default table control text when a custom icon renderer throws', () => {
    const doc = '| A | B |\n| - | - |\n| one | two |\n\nplain';
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const error = new Error('broken icon');
    const view = tableEditor(doc, 'plain', {
      ...editableLiveContext,
      tableControlIcons: {
        insertRowBefore: () => {
          throw error;
        },
        insertRowAfter: 'ROW+',
      },
    });

    clickCell(view, '1:1');

    expect(view.dom.querySelector('button[aria-label="Add row before"]')?.textContent).toBe('+R^');
    expect(view.dom.querySelector('button[aria-label="Add row after"]')?.textContent).toBe('ROW+');
    expect(consoleError).toHaveBeenCalledWith(
      'Galley table control icon renderer failed for "insertRowBefore" (Add row before)',
      error,
    );
  });

  it('allows an empty string table control icon', () => {
    const doc = '| A | B |\n| - | - |\n| one | two |\n\nplain';
    const view = tableEditor(doc, 'plain', {
      ...editableLiveContext,
      tableControlIcons: {
        insertRowAfter: '',
      },
    });

    clickCell(view, '1:1');

    expect(view.dom.querySelector('button[aria-label="Add row after"]')?.textContent).toBe('');
  });

  it('keeps table widgets stable for equivalent recreated table control elements', () => {
    const doc = '| A | B |\n| - | - |\n| one | two |\n\nplain';
    const tableControls = new Compartment();
    const iconElement = () => {
      const icon = document.createElement('span');
      icon.className = 'custom-table-icon';
      icon.textContent = 'ROW+';
      return icon;
    };
    const context = (): GalleyRenderContext => ({
      ...editableLiveContext,
      tableControlIcons: {
        insertRowAfter: iconElement(),
      },
    });
    const view = createEditorView({
      doc,
      selection: EditorSelection.cursor(doc.indexOf('plain')),
      extensions: [
        tableControls.of(tablesPlugin.extensions(resolveClassNames(), context())),
      ],
    });
    views.push(view);

    clickCell(view, '1:1');
    const widgetBefore = view.dom.querySelector('.ge-table-widget');
    expect(widgetBefore).toBeInstanceOf(HTMLElement);

    view.dispatch({
      effects: tableControls.reconfigure(tablesPlugin.extensions(resolveClassNames(), context())),
    });

    expect(view.dom.querySelector('.ge-table-widget')).toBe(widgetBefore);
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
