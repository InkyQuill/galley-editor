import type { EditorState, SelectionRange, TransactionSpec } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import {
  parseMarkdownTable,
  serializeMarkdownTable,
  tableAtSelection,
  tableCell,
  tableCellAtPosition,
  tablesAtSelections,
  updateTableCell,
  type GalleyTable,
  type GalleyTableCell,
  type TableAlignment,
  type TableCellRef,
} from '../table-markdown';

type TableReplacement = {
  table: GalleyTable;
  next: GalleyTable;
};

type ReplaceTableSpec = Omit<TransactionSpec, 'changes' | 'scrollIntoView'>;

const VALID_ALIGNMENTS = new Set<unknown>(['left', 'center', 'right', null]);

function isTableCellRef(value: unknown): value is TableCellRef {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;

  const candidate = value as Partial<TableCellRef>;
  return Number.isInteger(candidate.row) &&
    Number.isInteger(candidate.column) &&
    candidate.row >= 0 &&
    candidate.column >= 0;
}

function isSupportedAlignment(value: unknown): value is TableAlignment {
  return VALID_ALIGNMENTS.has(value);
}

function selectionRangeIntersectsTable(range: SelectionRange, table: GalleyTable): boolean {
  if (range.empty) return range.head >= table.from && range.head < table.to;

  return range.from < table.to && range.to > table.from;
}

function positionForRangeInTable(range: SelectionRange, table: GalleyTable): number {
  if (range.head >= table.from && range.head < table.to) return range.head;
  if (range.anchor >= table.from && range.anchor < table.to) return range.anchor;
  if (range.from >= table.from && range.from < table.to) return range.from;
  return Math.max(table.from, Math.min(table.to - 1, range.to));
}

function selectedCellForTable(state: EditorState, table: GalleyTable): GalleyTableCell | null {
  const range = state.selection.ranges.find((selection) =>
    selectionRangeIntersectsTable(selection, table));
  if (!range) return null;

  return tableCellAtPosition(table, positionForRangeInTable(range, table));
}

function emptyCellFor(row: number, column: number, header: boolean): GalleyTableCell {
  return {
    row,
    column,
    text: '',
    sourceFrom: 0,
    sourceTo: 0,
    cellFrom: 0,
    cellTo: 0,
    header,
  };
}

function reindexRows(rows: GalleyTableCell[][]): GalleyTableCell[][] {
  return rows.map((row, rowIndex) =>
    row.map((cell, columnIndex) => ({
      ...cell,
      row: rowIndex,
      column: columnIndex,
      header: rowIndex === 0,
    })));
}

function emptyRowFor(table: GalleyTable, row: number): GalleyTableCell[] {
  return Array.from({ length: table.columnCount }, (_value, column) =>
    emptyCellFor(row, column, row === 0));
}

function withInsertedRow(table: GalleyTable, index: number): GalleyTable {
  if (index < 1 || index > table.rows.length) return table;

  return {
    ...table,
    rows: reindexRows([
      ...table.rows.slice(0, index),
      emptyRowFor(table, index),
      ...table.rows.slice(index),
    ]),
  };
}

function withDeletedRow(table: GalleyTable, index: number): GalleyTable | null {
  if (index <= 0 || index >= table.rows.length) return null;

  return {
    ...table,
    rows: reindexRows(table.rows.filter((_row, rowIndex) => rowIndex !== index)),
  };
}

function withInsertedColumn(table: GalleyTable, index: number): GalleyTable {
  if (index < 0 || index > table.columnCount) return table;

  return {
    ...table,
    columnCount: table.columnCount + 1,
    alignments: [
      ...table.alignments.slice(0, index),
      null,
      ...table.alignments.slice(index),
    ],
    rows: reindexRows(table.rows.map((row, rowIndex) => [
      ...row.slice(0, index),
      emptyCellFor(rowIndex, index, rowIndex === 0),
      ...row.slice(index),
    ])),
  };
}

function withDeletedColumn(table: GalleyTable, index: number): GalleyTable | null {
  if (table.columnCount <= 1 || index < 0 || index >= table.columnCount) return null;

  return {
    ...table,
    columnCount: table.columnCount - 1,
    alignments: table.alignments.filter((_alignment, columnIndex) => columnIndex !== index),
    rows: reindexRows(table.rows.map((row) =>
      row.filter((_cell, columnIndex) => columnIndex !== index))),
  };
}

function tableWithColumnAlignment(
  table: GalleyTable,
  column: number,
  alignment: TableAlignment,
): GalleyTable | null {
  if (column < 0 || column >= table.columnCount) return null;

  return {
    ...table,
    alignments: table.alignments.map((current, index) =>
      index === column ? alignment : current),
  };
}

function serializeReplacement(state: EditorState, table: GalleyTable): string {
  const serialized = serializeMarkdownTable(table);
  const nextChar = state.sliceDoc(table.to, table.to + 1);
  const atDocumentEndWithoutNewline = table.to >= state.doc.length &&
    state.sliceDoc(Math.max(0, state.doc.length - 1), state.doc.length) !== '\n';

  if ((nextChar === '\n' || atDocumentEndWithoutNewline) && serialized.endsWith('\n')) {
    return serialized.slice(0, -1);
  }

  return serialized;
}

function replacedTables(
  view: EditorView,
  transform: (table: GalleyTable, cell: GalleyTableCell) => GalleyTable | null,
): boolean {
  const replacements: TableReplacement[] = [];
  let selectionAnchor: number | null = null;

  for (const table of tablesAtSelections(view.state)) {
    const cell = selectedCellForTable(view.state, table);
    if (!cell) continue;

    const next = transform(table, cell);
    if (!next) continue;

    if (selectionAnchor === null && selectionRangeIntersectsTable(view.state.selection.main, table)) {
      const reparsed = parseMarkdownTable(serializeMarkdownTable(next), table.from);
      const nextCell = reparsed
        ? tableCell(reparsed, {
          row: Math.min(cell.row, reparsed.rows.length - 1),
          column: Math.min(cell.column, reparsed.columnCount - 1),
        })
        : null;

      selectionAnchor = nextCell?.sourceFrom ?? table.from;
    }

    replacements.push({ table, next });
  }

  return dispatchTableReplacements(view, replacements, selectionAnchor);
}

export function replaceTable(
  view: EditorView,
  table: GalleyTable,
  spec: ReplaceTableSpec = {},
): boolean {
  const insert = serializeReplacement(view.state, table);
  view.dispatch({
    ...spec,
    changes: { from: table.from, to: table.to, insert },
  });
  return true;
}

export function replaceTables(
  view: EditorView,
  tables: readonly TableReplacement[],
): boolean {
  return dispatchTableReplacements(view, tables, null);
}

function dispatchTableReplacements(
  view: EditorView,
  tables: readonly TableReplacement[],
  selectionAnchor: number | null,
): boolean {
  if (tables.length === 0) return false;

  view.dispatch({
    changes: tables
      .slice()
      .sort((a, b) => a.table.from - b.table.from)
      .map(({ table, next }) => ({
        from: table.from,
        to: table.to,
        insert: serializeReplacement(view.state, next),
      })),
    ...(selectionAnchor === null ? {} : { selection: { anchor: selectionAnchor } }),
  });
  return true;
}

export function normalizeTable(view: EditorView): boolean {
  const replacements = tablesAtSelections(view.state).map((table) => ({
    table,
    next: table,
  }));

  return replaceTables(view, replacements);
}

export function commitTableCell(view: EditorView, ref: unknown, text: unknown): boolean {
  if (!isTableCellRef(ref) || typeof text !== 'string') return false;

  const table = tableAtSelection(view.state);
  if (!table || !tableCell(table, ref)) return false;

  return replaceTable(view, updateTableCell(table, ref, text));
}

export function insertTableRowBefore(view: EditorView): boolean {
  return replacedTables(view, (table, cell) => {
    const index = Math.max(1, cell.row);
    return withInsertedRow(table, index);
  });
}

export function insertTableRowAfter(view: EditorView): boolean {
  return replacedTables(view, (table, cell) =>
    withInsertedRow(table, cell.row + 1));
}

export function deleteTableRow(view: EditorView): boolean {
  return replacedTables(view, (table, cell) => withDeletedRow(table, cell.row));
}

export function insertTableColumnBefore(view: EditorView): boolean {
  return replacedTables(view, (table, cell) => withInsertedColumn(table, cell.column));
}

export function insertTableColumnAfter(view: EditorView): boolean {
  return replacedTables(view, (table, cell) => withInsertedColumn(table, cell.column + 1));
}

export function deleteTableColumn(view: EditorView): boolean {
  return replacedTables(view, (table, cell) => withDeletedColumn(table, cell.column));
}

export function setTableColumnAlignment(view: EditorView, alignment: unknown): boolean {
  if (!isSupportedAlignment(alignment)) return false;

  return replacedTables(view, (table, cell) =>
    tableWithColumnAlignment(table, cell.column, alignment));
}

export function revealTableSource(view: EditorView, ref?: unknown): boolean {
  if (ref !== undefined && !isTableCellRef(ref)) return false;

  const table = tableAtSelection(view.state);
  if (!table) return false;

  const cell = ref === undefined
    ? tableCellAtPosition(table, view.state.selection.main.head)
    : tableCell(table, ref);
  if (!cell) return false;

  view.dispatch({
    selection: { anchor: cell.sourceFrom },
  });
  return true;
}
