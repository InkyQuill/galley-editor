import { markdown } from '@codemirror/lang-markdown';
import { EditorSelection, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { GFM } from '@lezer/markdown';
import { afterEach, describe, expect, it } from 'vitest';
import {
  BUILTIN_COMMANDS,
  commitTableCell,
  deleteTableColumn,
  deleteTableRow,
  insertTableColumnAfter,
  insertTableColumnBefore,
  insertTableRowAfter,
  insertTableRowBefore,
  normalizeTable,
  revealTableSource,
  setTableColumnAlignment,
} from './index';

function createView(doc: string, selection: EditorSelection | { anchor: number; head?: number }): EditorView {
  const state = EditorState.create({
    doc,
    selection,
    extensions: [
      EditorState.allowMultipleSelections.of(true),
      markdown({ extensions: [GFM] }),
    ],
  });
  return new EditorView({ state });
}

function docOf(view: EditorView): string {
  return view.state.doc.toString();
}

let activeViews: EditorView[] = [];

function tracked(view: EditorView): EditorView {
  activeViews.push(view);
  return view;
}

afterEach(() => {
  for (const view of activeViews) view.destroy();
  activeViews = [];
});

describe('table editing commands', () => {
  it('normalizeTable normalizes a table', () => {
    const doc = 'before\n| A|B |\n|---|:---:|\n| 1 |2|\n\nafter';
    const view = tracked(createView(doc, { anchor: doc.indexOf('B') }));

    expect(normalizeTable(view)).toBe(true);
    expect(docOf(view)).toBe('before\n| A | B |\n| --- | :---: |\n| 1 | 2 |\n\nafter');
  });

  it('commitTableCell updates a regular cell', () => {
    const doc = '| A | B |\n| --- | --- |\n| 1 | 2 |\n';
    const view = tracked(createView(doc, { anchor: doc.indexOf('1') }));

    expect(commitTableCell(view, { row: 1, column: 1 }, 'two')).toBe(true);
    expect(docOf(view)).toBe('| A | B |\n| --- | --- |\n| 1 | two |\n');
  });

  it('commitTableCell updates a padded ragged-row cell', () => {
    const doc = '| A | B | C |\n| --- | --- | --- |\n| 1 | 2 |\n';
    const view = tracked(createView(doc, { anchor: doc.indexOf('1') }));

    expect(commitTableCell(view, { row: 1, column: 2 }, '3')).toBe(true);
    expect(docOf(view)).toBe('| A | B | C |\n| --- | --- | --- |\n| 1 | 2 | 3 |\n');
  });

  it('insertTableRowBefore inserts an empty row before the current body row', () => {
    const doc = '| A | B |\n| --- | --- |\n| 1 | 2 |\n| 3 | 4 |\n';
    const view = tracked(createView(doc, { anchor: doc.indexOf('3') }));

    expect(insertTableRowBefore(view)).toBe(true);
    expect(docOf(view)).toBe('| A | B |\n| --- | --- |\n| 1 | 2 |\n|  |  |\n| 3 | 4 |\n');
  });

  it('insertTableRowAfter inserts an empty row after the current row', () => {
    const doc = '| A | B |\n| --- | --- |\n| 1 | 2 |\n';
    const view = tracked(createView(doc, { anchor: doc.indexOf('1') }));

    expect(insertTableRowAfter(view)).toBe(true);
    expect(docOf(view)).toBe('| A | B |\n| --- | --- |\n| 1 | 2 |\n|  |  |\n');
  });

  it('deleteTableRow deletes a body row and rejects deleting the header row', () => {
    const doc = '| A | B |\n| --- | --- |\n| 1 | 2 |\n| 3 | 4 |\n';
    const bodyView = tracked(createView(doc, { anchor: doc.indexOf('1') }));
    const headerView = tracked(createView(doc, { anchor: doc.indexOf('A') }));

    expect(deleteTableRow(bodyView)).toBe(true);
    expect(docOf(bodyView)).toBe('| A | B |\n| --- | --- |\n| 3 | 4 |\n');
    expect(deleteTableRow(headerView)).toBe(false);
    expect(docOf(headerView)).toBe(doc);
  });

  it('insertTableColumnBefore inserts an empty column before the current column', () => {
    const doc = '| A | B |\n| --- | ---: |\n| 1 | 2 |\n';
    const view = tracked(createView(doc, { anchor: doc.indexOf('B') }));

    expect(insertTableColumnBefore(view)).toBe(true);
    expect(docOf(view)).toBe('| A |  | B |\n| --- | --- | ---: |\n| 1 |  | 2 |\n');
  });

  it('insertTableColumnAfter inserts an empty column after the current column', () => {
    const doc = '| A | B |\n| --- | --- |\n| 1 | 2 |\n';
    const view = tracked(createView(doc, { anchor: doc.indexOf('A') }));

    expect(insertTableColumnAfter(view)).toBe(true);
    expect(docOf(view)).toBe('| A |  | B |\n| --- | --- | --- |\n| 1 |  | 2 |\n');
  });

  it('deleteTableColumn deletes a column and rejects deleting the last column', () => {
    const doc = '| A | B |\n| --- | --- |\n| 1 | 2 |\n';
    const twoColumnView = tracked(createView(doc, { anchor: doc.indexOf('B') }));
    const oneColumnDoc = '| A |\n| --- |\n| 1 |\n';
    const oneColumnView = tracked(createView(oneColumnDoc, { anchor: oneColumnDoc.indexOf('A') }));

    expect(deleteTableColumn(twoColumnView)).toBe(true);
    expect(docOf(twoColumnView)).toBe('| A |\n| --- |\n| 1 |\n');
    expect(deleteTableColumn(oneColumnView)).toBe(false);
    expect(docOf(oneColumnView)).toBe(oneColumnDoc);
  });

  it('setTableColumnAlignment updates the current column alignment', () => {
    const doc = '| A | B |\n| --- | --- |\n| 1 | 2 |\n';
    const view = tracked(createView(doc, { anchor: doc.indexOf('B') }));

    expect(setTableColumnAlignment(view, 'center')).toBe(true);
    expect(docOf(view)).toBe('| A | B |\n| --- | :---: |\n| 1 | 2 |\n');
    expect(setTableColumnAlignment(view, null)).toBe(true);
    expect(docOf(view)).toBe('| A | B |\n| --- | --- |\n| 1 | 2 |\n');
  });

  it('revealTableSource moves the selection to an explicit ref and the current cell', () => {
    const doc = '| A | B |\n| --- | --- |\n| 1 | 2 |\n';
    const explicitView = tracked(createView(doc, { anchor: doc.indexOf('A') }));
    const currentView = tracked(createView(doc, { anchor: doc.indexOf('2') }));

    expect(revealTableSource(explicitView, { row: 1, column: 1 })).toBe(true);
    expect(explicitView.state.selection.main.head).toBe(doc.indexOf('2'));
    expect(revealTableSource(currentView)).toBe(true);
    expect(currentView.state.selection.main.head).toBe(doc.indexOf('2'));
  });

  it('commands return false outside a table', () => {
    const view = tracked(createView('not a table', { anchor: 3 }));

    expect(normalizeTable(view)).toBe(false);
    expect(commitTableCell(view, { row: 0, column: 0 }, 'x')).toBe(false);
    expect(insertTableRowBefore(view)).toBe(false);
    expect(insertTableRowAfter(view)).toBe(false);
    expect(deleteTableRow(view)).toBe(false);
    expect(insertTableColumnBefore(view)).toBe(false);
    expect(insertTableColumnAfter(view)).toBe(false);
    expect(deleteTableColumn(view)).toBe(false);
    expect(setTableColumnAlignment(view, 'center')).toBe(false);
    expect(revealTableSource(view)).toBe(false);
  });

  it('invalid commitTableCell args through BUILTIN_COMMANDS.commitTableCell return false', () => {
    const doc = '| A | B |\n| --- | --- |\n| 1 | 2 |\n';
    const view = tracked(createView(doc, { anchor: doc.indexOf('1') }));

    expect(BUILTIN_COMMANDS.commitTableCell(view)).toBe(false);
    expect(BUILTIN_COMMANDS.commitTableCell(view, { row: 1, column: 1 }, 2)).toBe(false);
    expect(BUILTIN_COMMANDS.commitTableCell(view, { row: -1, column: 0 }, 'x')).toBe(false);
    expect(BUILTIN_COMMANDS.commitTableCell(view, { row: 1.5, column: 0 }, 'x')).toBe(false);
    expect(BUILTIN_COMMANDS.commitTableCell(view, { row: 1, column: 99 }, 'x')).toBe(false);
    expect(docOf(view)).toBe(doc);
  });

  it('structural commands apply once per distinct selected table', () => {
    const first = '| A | B |\n| --- | --- |\n| 1 | 2 |';
    const second = '| C | D |\n| --- | --- |\n| 3 | 4 |';
    const doc = `${first}\n\n${second}`;
    const view = tracked(createView(doc, EditorSelection.create([
      EditorSelection.cursor(doc.indexOf('1')),
      EditorSelection.cursor(doc.indexOf('2')),
      EditorSelection.cursor(doc.indexOf('3')),
    ])));

    expect(insertTableRowAfter(view)).toBe(true);
    expect(docOf(view)).toBe([
      '| A | B |',
      '| --- | --- |',
      '| 1 | 2 |',
      '|  |  |',
      '',
      '| C | D |',
      '| --- | --- |',
      '| 3 | 4 |',
      '|  |  |',
    ].join('\n'));
  });
});
