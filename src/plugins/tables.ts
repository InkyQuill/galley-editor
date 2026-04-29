import { type EditorState, type Range, StateField } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import { Decoration, type DecorationSet, EditorView, WidgetType } from '@codemirror/view';
import { BLOCK_CURSOR_LINE_PROXIMITY } from '../rendering';
import type { NeutrinoPlugin, NeutrinoClassNames } from '../types';

type Alignment = 'left' | 'center' | 'right' | null;

interface ParsedTable {
  headers: string[];
  alignments: Alignment[];
  rows: string[][];
}

function splitRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return trimmed.split('|').map((cell) => cell.trim());
}

function parseAlignment(cell: string): Alignment {
  const normalized = cell.trim();
  if (!/^:?-{1,}:?$/.test(normalized)) return null;
  const left = normalized.startsWith(':');
  const right = normalized.endsWith(':');
  if (left && right) return 'center';
  if (right) return 'right';
  if (left) return 'left';
  return null;
}

function parseTable(raw: string): ParsedTable | null {
  const lines = raw.split('\n').filter((line) => line.trim().length > 0);
  if (lines.length < 2) return null;

  const headers = splitRow(lines[0]);
  const separator = splitRow(lines[1]);
  if (headers.length === 0 || separator.length === 0) return null;
  if (!separator.every((cell) => /^:?-{1,}:?$/.test(cell.trim()))) return null;

  return {
    headers,
    alignments: headers.map((_header, index) => parseAlignment(separator[index] ?? '')),
    rows: lines.slice(2).map(splitRow),
  };
}

function appendCell(
  row: HTMLTableRowElement,
  tagName: 'th' | 'td',
  value: string,
  alignment: Alignment,
): void {
  const cell = document.createElement(tagName);
  cell.textContent = value;
  if (alignment) {
    cell.classList.add(`ne-align-${alignment}`);
  }
  row.append(cell);
}

class TableWidget extends WidgetType {
  private readonly table: ParsedTable;
  private readonly tableClass: string;

  constructor(
    table: ParsedTable,
    tableClass: string,
  ) {
    super();
    this.table = table;
    this.tableClass = tableClass;
  }

  eq(other: TableWidget): boolean {
    return JSON.stringify(other.table) === JSON.stringify(this.table);
  }

  toDOM(): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = `ne-table-widget ${this.tableClass}`;

    const scroll = document.createElement('div');
    scroll.className = 'ne-table-scroll';

    const table = document.createElement('table');
    table.className = 'ne-table-rendered';

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    this.table.headers.forEach((header, index) => {
      appendCell(headerRow, 'th', header, this.table.alignments[index] ?? null);
    });
    thead.append(headerRow);

    const tbody = document.createElement('tbody');
    this.table.rows.forEach((row) => {
      const tr = document.createElement('tr');
      this.table.headers.forEach((_header, index) => {
        appendCell(tr, 'td', row[index] ?? '', this.table.alignments[index] ?? null);
      });
      tbody.append(tr);
    });

    table.append(thead, tbody);
    scroll.append(table);
    wrapper.append(scroll);
    return wrapper;
  }
}

function buildTableDecorations(
  state: EditorState,
  tableClass: string,
  preview: boolean,
): DecorationSet {
  const doc = state.doc;
  const cursorLine = doc.lineAt(state.selection.main.anchor);
  const widgets: Range<Decoration>[] = [];

  syntaxTree(state).iterate({
    enter: (node) => {
      if (node.name !== 'Table') return;

      const nodeLineFrom = doc.lineAt(node.from);
      const nodeLineTo = doc.lineAt(node.to);
      const isNear =
        Math.abs(nodeLineFrom.number - cursorLine.number) <= BLOCK_CURSOR_LINE_PROXIMITY ||
        Math.abs(nodeLineTo.number - cursorLine.number) <= BLOCK_CURSOR_LINE_PROXIMITY;
      const sel = state.selection.main;
      const isInside =
        (sel.from >= node.from && sel.from <= node.to) ||
        (sel.to >= node.from && sel.to <= node.to);

      if (!preview && (isNear || isInside)) return;

      const parsed = parseTable(state.sliceDoc(node.from, node.to));
      if (!parsed) return;

      widgets.push(
        Decoration.replace({
          widget: new TableWidget(parsed, tableClass),
          block: true,
        }).range(node.from, node.to),
      );
    },
  });

  return Decoration.set(widgets, true);
}

const tablesPlugin: NeutrinoPlugin = {
  id: 'ne:tables',
  extensions(classNames: NeutrinoClassNames, context) {
    const tableClass = classNames.table ?? 'ne-table';
    const preview = context?.mode === 'preview';

    const field = StateField.define<DecorationSet>({
      create(state) {
        return buildTableDecorations(state, tableClass, preview);
      },
      update(decos, tr) {
        decos = decos.map(tr.changes);
        const selectionChanged = !tr.newSelection.eq(tr.startState.selection);
        const treeChanged = syntaxTree(tr.state) !== syntaxTree(tr.startState);
        if (tr.docChanged || selectionChanged || treeChanged) {
          decos = buildTableDecorations(tr.state, tableClass, preview);
        }
        return decos;
      },
      provide: (f) => EditorView.decorations.from(f),
    });

    return [field];
  },
};

export default tablesPlugin;
