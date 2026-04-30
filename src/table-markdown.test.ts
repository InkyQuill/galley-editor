import { markdown } from '@codemirror/lang-markdown';
import { EditorSelection, EditorState } from '@codemirror/state';
import { GFM } from '@lezer/markdown';
import { describe, expect, it } from 'vitest';
import {
  cellKey,
  parseMarkdownTable,
  serializeMarkdownTable,
  tableAtSelection,
  tableCell,
  tableCellAtPosition,
  tableNavigationCell,
  tablesAtSelections,
  updateTableCell,
} from './table-markdown';

function createMarkdownState(doc: string, selection: EditorSelection | { anchor: number; head?: number }) {
  return EditorState.create({
    doc,
    selection,
    extensions: [EditorState.allowMultipleSelections.of(true), markdown({ extensions: [GFM] })],
  });
}

describe('parseMarkdownTable', () => {
  it('parses a simple GFM table with absolute source spans and alignments', () => {
    const source = [
      '| Name | Age | City |',
      '| :--- | :---: | ---: |',
      '| Ada |  37 | London |',
      '| Bob | 9 | Rome |',
      '',
    ].join('\n');
    const from = 10;

    expect(parseMarkdownTable(source, from)).toMatchObject({
      from,
      to: from + source.length,
      columnCount: 3,
      alignments: ['left', 'center', 'right'],
      rows: [
        [
          {
            row: 0,
            column: 0,
            text: 'Name',
            sourceFrom: from + source.indexOf('Name'),
            sourceTo: from + source.indexOf('Name') + 'Name'.length,
            header: true,
          },
          {
            row: 0,
            column: 1,
            text: 'Age',
            sourceFrom: from + source.indexOf('Age'),
            sourceTo: from + source.indexOf('Age') + 'Age'.length,
            header: true,
          },
          {
            row: 0,
            column: 2,
            text: 'City',
            sourceFrom: from + source.indexOf('City'),
            sourceTo: from + source.indexOf('City') + 'City'.length,
            header: true,
          },
        ],
        [
          {
            row: 1,
            column: 0,
            text: 'Ada',
            sourceFrom: from + source.indexOf('Ada'),
            sourceTo: from + source.indexOf('Ada') + 'Ada'.length,
            header: false,
          },
          {
            row: 1,
            column: 1,
            text: '37',
            sourceFrom: from + source.indexOf('37'),
            sourceTo: from + source.indexOf('37') + '37'.length,
            header: false,
          },
          {
            row: 1,
            column: 2,
            text: 'London',
            sourceFrom: from + source.indexOf('London'),
            sourceTo: from + source.indexOf('London') + 'London'.length,
            header: false,
          },
        ],
        [
          {
            row: 2,
            column: 0,
            text: 'Bob',
            sourceFrom: from + source.indexOf('Bob'),
            sourceTo: from + source.indexOf('Bob') + 'Bob'.length,
            header: false,
          },
          {
            row: 2,
            column: 1,
            text: '9',
            sourceFrom: from + source.indexOf('9'),
            sourceTo: from + source.indexOf('9') + '9'.length,
            header: false,
          },
          {
            row: 2,
            column: 2,
            text: 'Rome',
            sourceFrom: from + source.indexOf('Rome'),
            sourceTo: from + source.indexOf('Rome') + 'Rome'.length,
            header: false,
          },
        ],
      ],
    });
  });

  it('rejects unsupported escaped pipe tables', () => {
    expect(parseMarkdownTable('| A \\| B |\n| --- |\n| C |')).toBeNull();
  });
});

describe('serializeMarkdownTable', () => {
  it('serializes normalized rows without changing cell text', () => {
    const table = parseMarkdownTable('| A | B |\n| :--- | ---: |\n| x y | z |\n');

    expect(table).not.toBeNull();
    expect(serializeMarkdownTable(table!)).toBe('| A | B |\n| :--- | ---: |\n| x y | z |\n');
  });

  it('pads missing cells while serializing structural edits', () => {
    const table = parseMarkdownTable('| A | B | C |\n| --- | --- | --- |\n| 1 | 2 |\n');

    expect(table).not.toBeNull();
    expect(serializeMarkdownTable(table!)).toBe('| A | B | C |\n| --- | --- | --- |\n| 1 | 2 |  |\n');
  });

  it('serializes updates to parsed ragged row cells across the full rendered grid', () => {
    const table = parseMarkdownTable('| A | B | C |\n| --- | --- | --- |\n| 1 | 2 |\n');

    expect(table).not.toBeNull();
    expect(tableCell(table!, { row: 1, column: 2 })).toMatchObject({
      row: 1,
      column: 2,
      text: '',
      header: false,
    });

    const updated = updateTableCell(table!, { row: 1, column: 2 }, 'new');

    expect(tableCell(updated, { row: 1, column: 2 })?.text).toBe('new');
    expect(serializeMarkdownTable(updated)).toBe('| A | B | C |\n| --- | --- | --- |\n| 1 | 2 | new |\n');
  });
});

describe('table selection helpers', () => {
  it('finds the table and cell at a source selection', () => {
    const doc = 'intro\n| A | B |\n| --- | --- |\n| 1 | 2 |\n\noutro';
    const state = createMarkdownState(doc, EditorSelection.cursor(doc.indexOf('2')));
    const table = tableAtSelection(state);

    expect(table).not.toBeNull();
    expect(table?.from).toBe(doc.indexOf('| A'));
    expect(table?.to).toBe(doc.indexOf('\n\noutro'));
    expect(tableCellAtPosition(table!, doc.indexOf('2'))).toMatchObject({
      row: 1,
      column: 1,
      text: '2',
      header: false,
    });
  });

  it('does not find a table when the cursor is immediately after the table range', () => {
    const tableSource = '| A | B |\n| --- | --- |\n| 1 | 2 |';
    const doc = `${tableSource}\n\noutro`;
    const state = createMarkdownState(doc, EditorSelection.cursor(tableSource.length));

    expect(tableAtSelection(state)).toBeNull();
  });

  it('deduplicates multiple selections in the same table', () => {
    const first = '| A | B |\n| --- | --- |\n| 1 | 2 |';
    const second = '| C |\n| --- |\n| 3 |';
    const doc = `${first}\n\n${second}`;
    const selection = EditorSelection.create([
      EditorSelection.cursor(doc.indexOf('A')),
      EditorSelection.cursor(doc.indexOf('2')),
      EditorSelection.cursor(doc.indexOf('3')),
    ]);
    const state = createMarkdownState(doc, selection);

    expect(tablesAtSelections(state).map((table) => table.from)).toEqual([
      0,
      doc.indexOf(second),
    ]);
  });
});

describe('table model helpers', () => {
  it('falls back to the first cell when the position is outside any cell bounds', () => {
    const table = parseMarkdownTable('| A | B |\n| --- | --- |\n| 1 | 2 |\n');

    expect(table).not.toBeNull();
    const bodyCell = tableCell(table!, { row: 1, column: 1 });

    expect(bodyCell).not.toBeNull();
    expect(tableCellAtPosition(table!, bodyCell!.cellTo)).toBe(table!.rows[0]![0]);
  });

  it('matches a cell when the position is inside padding around trimmed text', () => {
    const table = parseMarkdownTable('| A | B |\n| --- | --- |\n| one |  two  |\n');
    const two = tableCell(table!, { row: 1, column: 1 });

    expect(two).not.toBeNull();
    expect(tableCellAtPosition(table!, two!.sourceFrom - 1)).toBe(two);
    expect(tableCellAtPosition(table!, two!.sourceTo)).toBe(two);
  });

  it('matches an explicit empty source cell by its cell bounds', () => {
    const table = parseMarkdownTable('| A | B | C |\n| --- | --- | --- |\n| 1 |  | 3 |\n');
    const empty = tableCell(table!, { row: 1, column: 1 });

    expect(empty).toMatchObject({
      row: 1,
      column: 1,
      text: '',
      header: false,
    });
    expect(tableCellAtPosition(table!, empty!.cellFrom)).toBe(empty);
  });

  it('matches an explicit zero-width empty source cell by its boundary', () => {
    const table = parseMarkdownTable('| A | B | C |\n| --- | --- | --- |\n| 1 || 3 |\n');
    const empty = tableCell(table!, { row: 1, column: 1 });

    expect(empty).toMatchObject({
      row: 1,
      column: 1,
      text: '',
      header: false,
    });
    expect(empty?.cellFrom).toBe(empty?.cellTo);
    expect(tableCellAtPosition(table!, empty!.cellFrom)).toBe(empty);
  });

  it('matches a padded ragged cell by its boundary', () => {
    const table = parseMarkdownTable('| A | B | C |\n| --- | --- | --- |\n| 1 | 2 |\n');
    const padded = tableCell(table!, { row: 1, column: 2 });

    expect(padded).toMatchObject({
      row: 1,
      column: 2,
      text: '',
      header: false,
    });
    expect(padded?.cellFrom).toBe(padded?.cellTo);
    expect(tableCellAtPosition(table!, padded!.cellFrom)).toBe(padded);
  });

  it('updates one cell and preserves table shape', () => {
    const table = parseMarkdownTable('| A | B |\n| --- | --- |\n| 1 | 2 |\n');

    expect(table).not.toBeNull();
    const updated = updateTableCell(table!, { row: 1, column: 0 }, 'one');

    expect(updated).not.toBe(table);
    expect(updated.rows).toHaveLength(2);
    expect(updated.rows[1]).toHaveLength(2);
    expect(tableCell(updated, { row: 1, column: 0 })?.text).toBe('one');
    expect(tableCell(updated, { row: 1, column: 1 })?.text).toBe('2');
    expect(tableCell(table!, { row: 1, column: 0 })?.text).toBe('1');
  });

  it('clamps table navigation within the rendered grid', () => {
    const table = parseMarkdownTable('| A | B |\n| --- | --- |\n| 1 | 2 |\n');

    expect(table).not.toBeNull();
    expect(tableNavigationCell(table!, { row: 0, column: 0 }, 'left')).toEqual({ row: 0, column: 0 });
    expect(tableNavigationCell(table!, { row: 0, column: 0 }, 'up')).toEqual({ row: 0, column: 0 });
    expect(tableNavigationCell(table!, { row: 0, column: 0 }, 'right')).toEqual({ row: 0, column: 1 });
    expect(tableNavigationCell(table!, { row: 0, column: 1 }, 'down')).toEqual({ row: 1, column: 1 });
    expect(tableNavigationCell(table!, { row: 1, column: 1 }, 'down')).toEqual({ row: 1, column: 1 });
  });

  it('clamps out-of-range navigation inputs on both axes', () => {
    const table = parseMarkdownTable('| A | B |\n| --- | --- |\n| 1 | 2 |\n');

    expect(table).not.toBeNull();
    expect(tableNavigationCell(table!, { row: 999, column: 999 }, 'left')).toEqual({ row: 1, column: 1 });
    expect(tableNavigationCell(table!, { row: 999, column: 999 }, 'up')).toEqual({ row: 1, column: 1 });
    expect(tableNavigationCell(table!, { row: -999, column: -999 }, 'right')).toEqual({ row: 0, column: 0 });
    expect(tableNavigationCell(table!, { row: -999, column: -999 }, 'down')).toEqual({ row: 0, column: 0 });
  });

  it('builds stable cell keys', () => {
    expect(cellKey({ row: 2, column: 3 })).toBe('2:3');
    expect(cellKey(null)).toBe('');
  });
});
