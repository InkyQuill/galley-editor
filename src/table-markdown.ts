import { syntaxTree } from '@codemirror/language';
import type { EditorState, SelectionRange } from '@codemirror/state';

export type TableAlignment = 'left' | 'center' | 'right' | null;
export type TableDirection = 'left' | 'right' | 'up' | 'down';

export interface TableCellRef {
  row: number;
  column: number;
}

export interface GalleyTableCell extends TableCellRef {
  text: string;
  sourceFrom: number;
  sourceTo: number;
  header: boolean;
}

export interface GalleyTable {
  from: number;
  to: number;
  rows: GalleyTableCell[][];
  alignments: TableAlignment[];
  columnCount: number;
}

interface SourceLine {
  text: string;
  from: number;
}

function sourceLines(source: string, from: number): SourceLine[] {
  const lines: SourceLine[] = [];
  let lineFrom = 0;

  for (const line of source.split('\n')) {
    if (line.trim().length > 0) {
      lines.push({
        text: line,
        from: from + lineFrom,
      });
    }

    lineFrom += line.length + 1;
  }

  return lines;
}

function trimmedRange(text: string, from: number, to: number): { from: number; to: number } {
  let start = from;
  let end = to;

  while (start < end && /\s/.test(text[start] ?? '')) start += 1;
  while (end > start && /\s/.test(text[end - 1] ?? '')) end -= 1;

  return { from: start, to: end };
}

function splitRow(line: SourceLine, row: number, header: boolean): GalleyTableCell[] {
  const cells: GalleyTableCell[] = [];
  let from = line.text.startsWith('|') ? 1 : 0;
  const to = line.text.endsWith('|') ? line.text.length - 1 : line.text.length;
  let column = 0;

  for (let index = from; index <= to; index += 1) {
    if (index !== to && line.text[index] !== '|') continue;

    const range = trimmedRange(line.text, from, index);
    cells.push({
      row,
      column,
      text: line.text.slice(range.from, range.to),
      sourceFrom: line.from + range.from,
      sourceTo: line.from + range.to,
      header,
    });
    column += 1;
    from = index + 1;
  }

  return cells;
}

function splitSeparator(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return trimmed.split('|').map((cell) => cell.trim());
}

function separatorIsValid(cell: string): boolean {
  return /^:?-{1,}:?$/.test(cell.trim());
}

function parseAlignment(cell: string | undefined): TableAlignment {
  const normalized = cell?.trim() ?? '';
  if (!separatorIsValid(normalized)) return null;

  const left = normalized.startsWith(':');
  const right = normalized.endsWith(':');
  if (left && right) return 'center';
  if (right) return 'right';
  if (left) return 'left';
  return null;
}

function separatorForAlignment(alignment: TableAlignment): string {
  if (alignment === 'left') return ':---';
  if (alignment === 'center') return ':---:';
  if (alignment === 'right') return '---:';
  return '---';
}

function serializeRow(cells: GalleyTableCell[], columnCount: number): string {
  const values = Array.from({ length: columnCount }, (_value, index) => cells[index]?.text ?? '');
  return `| ${values.join(' | ')} |`;
}

function selectionRangeIntersectsTable(selection: SelectionRange, from: number, to: number): boolean {
  if (selection.empty) return selection.head >= from && selection.head <= to;

  return selection.from < to && selection.to > from;
}

function parseTableRange(state: EditorState, from: number, to: number): GalleyTable | null {
  return parseMarkdownTable(state.sliceDoc(from, to), from);
}

export function parseMarkdownTable(source: string, from = 0): GalleyTable | null {
  if (source.includes('\\|')) return null;

  const lines = sourceLines(source, from);
  if (lines.length < 2) return null;

  const header = splitRow(lines[0] as SourceLine, 0, true);
  const separator = splitSeparator((lines[1] as SourceLine).text);
  if (header.length === 0 || separator.length === 0) return null;
  if (!separator.every(separatorIsValid)) return null;

  const columnCount = header.length;
  const rows = [
    header,
    ...lines.slice(2).map((line, index) => splitRow(line, index + 1, false)),
  ];

  return {
    from,
    to: from + source.length,
    rows,
    alignments: Array.from({ length: columnCount }, (_value, index) =>
      parseAlignment(separator[index])),
    columnCount,
  };
}

export function serializeMarkdownTable(table: GalleyTable): string {
  const header = table.rows[0] ?? [];
  const separator = Array.from({ length: table.columnCount }, (_value, index) =>
    separatorForAlignment(table.alignments[index] ?? null));
  const body = table.rows.slice(1).map((row) => serializeRow(row, table.columnCount));

  return [
    serializeRow(header, table.columnCount),
    `| ${separator.join(' | ')} |`,
    ...body,
  ].join('\n') + '\n';
}

export function tableAtSelection(state: EditorState): GalleyTable | null {
  const head = state.selection.main.head;
  let found: GalleyTable | null = null;

  syntaxTree(state).iterate({
    enter(node) {
      if (found) return false;
      if (node.name !== 'Table') return;
      if (head < node.from || head > node.to) return;

      found = parseTableRange(state, node.from, node.to);
      return false;
    },
  });

  return found;
}

export function tablesAtSelections(state: EditorState): GalleyTable[] {
  const ranges = state.selection.ranges;
  const tables = new Map<number, GalleyTable>();

  syntaxTree(state).iterate({
    enter(node) {
      if (node.name !== 'Table') return;
      if (!ranges.some((range) => selectionRangeIntersectsTable(range, node.from, node.to))) return;

      const table = parseTableRange(state, node.from, node.to);
      if (table) tables.set(table.from, table);
    },
  });

  return [...tables.values()].sort((a, b) => a.from - b.from);
}

export function tableCellAtPosition(table: GalleyTable, pos: number): GalleyTableCell {
  for (const row of table.rows) {
    for (const cell of row) {
      if (pos >= cell.sourceFrom && pos <= cell.sourceTo) return cell;
    }
  }

  return table.rows[0]?.[0] ?? {
    row: 0,
    column: 0,
    text: '',
    sourceFrom: table.from,
    sourceTo: table.from,
    header: true,
  };
}

export function tableCell(table: GalleyTable, ref: TableCellRef): GalleyTableCell | null {
  return table.rows[ref.row]?.[ref.column] ?? null;
}

export function updateTableCell(table: GalleyTable, ref: TableCellRef, text: string): GalleyTable {
  return {
    ...table,
    rows: table.rows.map((row, rowIndex) =>
      row.map((cell, columnIndex) =>
        rowIndex === ref.row && columnIndex === ref.column
          ? { ...cell, text }
          : { ...cell })),
  };
}

export function tableNavigationCell(
  table: GalleyTable,
  ref: TableCellRef,
  direction: TableDirection,
): TableCellRef {
  const maxRow = Math.max(0, table.rows.length - 1);
  const maxColumn = Math.max(0, table.columnCount - 1);

  if (direction === 'left') return { row: ref.row, column: Math.max(0, ref.column - 1) };
  if (direction === 'right') return { row: ref.row, column: Math.min(maxColumn, ref.column + 1) };
  if (direction === 'up') return { row: Math.max(0, ref.row - 1), column: ref.column };
  return { row: Math.min(maxRow, ref.row + 1), column: ref.column };
}

export function cellKey(ref: TableCellRef | null): string {
  if (!ref) return '';

  return `${ref.row}:${ref.column}`;
}
