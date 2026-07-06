import { syntaxTree } from '@codemirror/language';
import {
  EditorSelection,
  StateEffect,
  StateField,
  type EditorState,
  type Range,
} from '@codemirror/state';
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  WidgetType,
} from '@codemirror/view';
import {
  commitTableCell,
  deleteTableColumn,
  deleteTableRow,
  insertTableColumnAfter,
  insertTableColumnBefore,
  insertTableRowAfter,
  insertTableRowBefore,
  revealTableSource,
  setTableColumnAlignment,
} from '../commands/tableEditing';
import {
  cellKey,
  parseMarkdownTable,
  tableCell,
  tableCellAtPosition,
  tableNavigationCell,
  type GalleyTable,
  type GalleyTableCell,
  type TableCellRef,
} from '../table-markdown';
import {
  TABLE_CONTROL_ICON_NAMES,
  type GalleyPlugin,
  type GalleyClassNames,
  type GalleyTableControlIcon,
  type GalleyTableControlIconName,
  type GalleyTableControlIcons,
} from '../types';

interface SelectedTableCell {
  tableFrom: number;
  tableTo: number;
  cell: TableCellRef;
  editing: boolean;
  draft: string | null;
}

interface SourceEscapedTable {
  from: number;
  to: number;
}

type TableCommand = (view: EditorView) => boolean;

const selectTableCell = StateEffect.define<SelectedTableCell | null>({
  map(value, changes) {
    if (!value) return null;

    const tableFrom = changes.mapPos(value.tableFrom, 1);
    const tableTo = changes.mapPos(value.tableTo, -1);
    return tableFrom < tableTo ? { ...value, tableFrom, tableTo } : null;
  },
});

const selectedTableCellField = StateField.define<SelectedTableCell | null>({
  create() {
    return null;
  },
  update(value, transaction) {
    let next = value;
    if (next && transaction.docChanged) {
      const tableFrom = transaction.changes.mapPos(next.tableFrom, 1);
      const tableTo = transaction.changes.mapPos(next.tableTo, -1);
      next = tableFrom < tableTo ? { ...next, tableFrom, tableTo } : null;
    }

    let hasSelectionEffect = false;
    for (const effect of transaction.effects) {
      if (effect.is(selectTableCell)) {
        hasSelectionEffect = true;
        next = effect.value;
      }
    }

    if (transaction.selection && !hasSelectionEffect) return null;
    return next;
  },
});

const sourceEscapedTable = StateEffect.define<SourceEscapedTable | null>({
  map(value, changes) {
    if (!value) return null;

    const from = changes.mapPos(value.from, 1);
    const to = changes.mapPos(value.to, -1);
    return from < to ? { from, to } : null;
  },
});

const sourceEscapedTableField = StateField.define<SourceEscapedTable | null>({
  create() {
    return null;
  },
  update(value, transaction) {
    let next = value;
    if (next && transaction.docChanged) {
      const from = transaction.changes.mapPos(next.from, 1);
      const to = transaction.changes.mapPos(next.to, -1);
      next = from < to ? { from, to } : null;
    }

    for (const effect of transaction.effects) {
      if (effect.is(sourceEscapedTable)) {
        next = effect.value;
      }
    }

    return next;
  },
});

function selectedTableCellState(state: EditorState): SelectedTableCell | null {
  return state.field(selectedTableCellField, false) ?? null;
}

function sourceEscapedTableState(state: EditorState): SourceEscapedTable | null {
  return state.field(sourceEscapedTableField, false) ?? null;
}

function tableControlIconsEqual(
  a: GalleyTableControlIcons | undefined,
  b: GalleyTableControlIcons | undefined,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;

  return TABLE_CONTROL_ICON_NAMES.every((name) => tableControlIconEqual(a[name], b[name]));
}

function tableControlIconEqual(
  a: GalleyTableControlIcon | undefined,
  b: GalleyTableControlIcon | undefined,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a instanceof HTMLElement && b instanceof HTMLElement) return a.isEqualNode(b);
  return false;
}

class TableWidget extends WidgetType {
  table: GalleyTable;
  tableClass: string;
  selected: SelectedTableCell | null;
  canEdit: boolean;
  preview: boolean;
  tableControlIcons?: GalleyTableControlIcons;

  constructor(
    table: GalleyTable,
    tableClass: string,
    selected: SelectedTableCell | null,
    canEdit: boolean,
    preview: boolean,
    tableControlIcons?: GalleyTableControlIcons,
  ) {
    super();
    this.table = table;
    this.tableClass = tableClass;
    this.selected = selected;
    this.canEdit = canEdit;
    this.preview = preview;
    this.tableControlIcons = tableControlIcons;
  }

  eq(other: TableWidget): boolean {
    return other.table.from === this.table.from &&
      other.table.to === this.table.to &&
      other.table.columnCount === this.table.columnCount &&
      other.tableClass === this.tableClass &&
      other.canEdit === this.canEdit &&
      other.preview === this.preview &&
      tableControlIconsEqual(other.tableControlIcons, this.tableControlIcons) &&
      JSON.stringify(other.table.rows) === JSON.stringify(this.table.rows) &&
      other.table.alignments.join('\0') === this.table.alignments.join('\0') &&
      selectedTableCellKey(other.selected) === selectedTableCellKey(this.selected);
  }

  toDOM(view: EditorView): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = `ge-table-widget ${this.tableClass}`;
    if (this.selected) wrapper.classList.add('ge-table-selected');

    if (this.shouldRenderControls(view)) {
      wrapper.append(this.createControls(view));
    }

    const scroll = document.createElement('div');
    scroll.className = 'ge-table-scroll';

    const table = document.createElement('table');
    table.className = 'ge-table-rendered';

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    for (const headerCell of this.table.rows[0] ?? []) {
      headerRow.append(this.createCell('th', headerCell, view));
    }
    thead.append(headerRow);

    const tbody = document.createElement('tbody');
    for (const row of this.table.rows.slice(1)) {
      const tr = document.createElement('tr');
      for (const bodyCell of row) {
        tr.append(this.createCell('td', bodyCell, view));
      }
      tbody.append(tr);
    }

    table.append(thead, tbody);
    scroll.append(table);
    wrapper.append(scroll);
    return wrapper;
  }

  ignoreEvent(): boolean {
    return false;
  }

  private createCell(
    tagName: 'th' | 'td',
    tableCellInfo: GalleyTableCell,
    view: EditorView,
  ): HTMLTableCellElement {
    const cell = document.createElement(tagName);
    const key = cellKey(tableCellInfo);
    cell.dataset.geTableCell = key;

    const alignment = this.table.alignments[tableCellInfo.column] ?? null;
    if (alignment) cell.classList.add(`ge-align-${alignment}`);

    if (selectedCellMatches(this.selected, this.table, tableCellInfo)) {
      cell.classList.add('ge-table-cell-selected');
      if (this.selected?.editing) {
        cell.append(this.createEditor(view, tableCellInfo));
      } else {
        renderCellInlineMarkdown(cell, tableCellInfo.text);
      }
    } else {
      renderCellInlineMarkdown(cell, tableCellInfo.text);
    }

    this.attachCellSelectionHandler(cell, tableCellInfo, view);
    return cell;
  }

  private createEditor(view: EditorView, tableCellInfo: GalleyTableCell): HTMLInputElement {
    const input = document.createElement('input');
    input.className = 'ge-table-cell-editor';
    input.value = this.selected?.draft ?? tableCellInfo.text;
    syncCellEditorSize(input);

    input.addEventListener('keydown', (event) => {
      this.handleEditorKeydown(event, input, view);
    });
    input.addEventListener('input', () => {
      syncCellEditorSize(input);
    });
    input.addEventListener('paste', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const text = event.clipboardData?.getData('text/plain') ?? '';
      const start = input.selectionStart ?? input.value.length;
      const end = input.selectionEnd ?? start;
      input.value = `${input.value.slice(0, start)}${text}${input.value.slice(end)}`;
      syncCellEditorSize(input);
      const caret = start + text.length;
      input.setSelectionRange(caret, caret);
    });

    queueMicrotask(() => {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    });
    return input;
  }

  private attachCellSelectionHandler(
    cell: HTMLTableCellElement,
    tableCellInfo: GalleyTableCell,
    view: EditorView,
  ): void {
    if (!this.canEdit || this.preview || view.state.readOnly) return;

    cell.addEventListener('mousedown', (event) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        event.stopPropagation();
        return;
      }
      if (event.target instanceof Element && event.target.closest('.ge-table-cell-editor')) {
        event.stopPropagation();
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (event.ctrlKey || event.metaKey) {
        view.dispatch({
          selection: EditorSelection.cursor(tableCellInfo.sourceFrom),
          effects: [
            selectTableCell.of(null),
            sourceEscapedTable.of({ from: this.table.from, to: this.table.to }),
          ],
        });
        revealTableSource(view, tableCellInfo);
        return;
      }

      const alreadySelected = selectedCellMatches(this.selected, this.table, tableCellInfo);
      if (this.selected?.editing) {
        if (alreadySelected) {
          view.dom.querySelector<HTMLInputElement>('.ge-table-cell-editor')?.focus();
          return;
        }
        this.commitActiveEditorAndSelect(view, tableCellInfo);
        return;
      }

      const selection = selectedCellFor(
        this.table,
        tableCellInfo,
        alreadySelected && !this.selected?.editing,
        alreadySelected && !this.selected?.editing ? tableCellInfo.text : null,
      );
      view.dispatch({
        selection: EditorSelection.cursor(tableCellInfo.sourceFrom),
        effects: [
          selectTableCell.of(selection),
          sourceEscapedTable.of(null),
        ],
      });
    });
  }

  private commitActiveEditorAndSelect(view: EditorView, targetCell: GalleyTableCell): void {
    if (!this.selected) return;

    const input = view.dom.querySelector<HTMLInputElement>('.ge-table-cell-editor');
    if (!input) return;
    if (!commitTableCell(view, this.selected.cell, input.value)) return;

    const nextTable = parseMarkdownTable(
      view.state.sliceDoc(this.table.from, mappedTableTo(view.state, this.table.from)),
      this.table.from,
    );
    const selectedTable = nextTable ?? this.table;
    const nextCell = tableCell(selectedTable, targetCell);
    if (!nextCell) return;

    view.dispatch({
      selection: EditorSelection.cursor(nextCell.sourceFrom),
      effects: [
        selectTableCell.of(selectedCellFor(selectedTable, nextCell, false, null)),
        sourceEscapedTable.of(null),
      ],
    });
  }

  private handleEditorKeydown(
    event: KeyboardEvent,
    input: HTMLInputElement,
    view: EditorView,
  ): void {
    event.stopPropagation();

    if (event.key === 'Escape') {
      event.preventDefault();
      this.cancelEditing(view);
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      this.commitAndMove(view, input.value, 'down');
      return;
    }

    if (event.key === 'Tab') {
      event.preventDefault();
      this.commitAndMove(view, input.value, event.shiftKey ? 'left' : 'right');
      return;
    }

    const direction = arrowNavigationDirection(event, input);
    if (!direction) return;

    event.preventDefault();
    this.commitAndMove(view, input.value, direction);
  }

  private cancelEditing(view: EditorView): void {
    if (!this.selected) return;

    view.dispatch({
      effects: selectTableCell.of({
        ...this.selected,
        editing: false,
        draft: null,
      }),
    });
  }

  private commitAndMove(
    view: EditorView,
    draft: string,
    direction: 'left' | 'right' | 'up' | 'down',
  ): void {
    if (!this.selected) return;

    const nextRef = tableNavigationCell(this.table, this.selected.cell, direction);
    if (!commitTableCell(view, this.selected.cell, draft)) return;

    const nextTable = parseMarkdownTable(
      view.state.sliceDoc(this.table.from, mappedTableTo(view.state, this.table.from)),
      this.table.from,
    );
    const selectedTable = nextTable ?? this.table;
    const cell = tableCell(selectedTable, nextRef);
    if (!cell) return;

    view.dispatch({
      selection: EditorSelection.cursor(cell.sourceFrom),
      effects: selectTableCell.of(selectedCellFor(selectedTable, cell, false, null)),
    });
  }

  private shouldRenderControls(view: EditorView): boolean {
    return this.selected !== null && this.canEdit && !this.preview && !view.state.readOnly;
  }

  private createControls(view: EditorView): HTMLElement {
    const controls = document.createElement('div');
    controls.className = 'ge-table-controls';
    controls.addEventListener('mousedown', (event) => {
      event.preventDefault();
      event.stopPropagation();
    });

    const buttons: Array<{
      name: GalleyTableControlIconName;
      label: string;
      text: string;
      reveal?: boolean;
      run: TableCommand;
    }> = [
      { name: 'insertRowBefore', label: 'Add row before', text: '+R^', run: insertTableRowBefore },
      { name: 'insertRowAfter', label: 'Add row after', text: '+R', run: insertTableRowAfter },
      { name: 'insertColumnBefore', label: 'Add column before', text: '+C<', run: insertTableColumnBefore },
      { name: 'insertColumnAfter', label: 'Add column after', text: '+C>', run: insertTableColumnAfter },
      { name: 'deleteRow', label: 'Delete row', text: '-R', run: deleteTableRow },
      { name: 'deleteColumn', label: 'Delete column', text: '-C', run: deleteTableColumn },
      { name: 'alignLeft', label: 'Align column left', text: 'L', run: (editorView) => setTableColumnAlignment(editorView, 'left') },
      { name: 'alignCenter', label: 'Align column center', text: 'C', run: (editorView) => setTableColumnAlignment(editorView, 'center') },
      { name: 'alignRight', label: 'Align column right', text: 'R', run: (editorView) => setTableColumnAlignment(editorView, 'right') },
      { name: 'clearAlignment', label: 'Clear column alignment', text: 'x', run: (editorView) => setTableColumnAlignment(editorView, null) },
      { name: 'editSource', label: 'Edit table source', text: '{}', reveal: true, run: (editorView) => this.revealSource(editorView) },
    ];

    for (const buttonInfo of buttons) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ge-table-control';
      button.ariaLabel = buttonInfo.label;
      renderTableControlIcon(
        button,
        this.tableControlIcons?.[buttonInfo.name],
        buttonInfo.name,
        buttonInfo.label,
        buttonInfo.text,
        view,
      );
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const changed = buttonInfo.run(view);
        if (changed && !buttonInfo.reveal) {
          selectCellAtCurrentTableSelection(view);
        }
      });
      controls.append(button);
    }

    return controls;
  }

  private revealSource(view: EditorView): boolean {
    const revealed = revealTableSource(view, this.selected?.cell);
    if (!revealed) return false;

    view.dispatch({
      effects: [
        selectTableCell.of(null),
        sourceEscapedTable.of({ from: this.table.from, to: this.table.to }),
      ],
    });
    return true;
  }
}

function renderTableControlIcon(
  button: HTMLButtonElement,
  configured: GalleyTableControlIcon | undefined,
  name: GalleyTableControlIconName,
  label: string,
  fallback: string,
  view: EditorView,
): void {
  const icon = resolveTableControlIcon(configured, name, label, view);
  if (!icon) {
    button.textContent = fallback;
    return;
  }

  if (typeof icon === 'string') {
    button.textContent = icon;
    return;
  }

  button.replaceChildren(icon);
}

function resolveTableControlIcon(
  configured: GalleyTableControlIcon | undefined,
  name: GalleyTableControlIconName,
  label: string,
  view: EditorView,
): string | HTMLElement | null {
  if (!configured) return null;
  if (typeof configured === 'function') {
    try {
      return configured({ name, label, view });
    } catch {
      return null;
    }
  }
  if (typeof configured === 'string') return configured;
  return configured.cloneNode(true) as HTMLElement;
}

function syncCellEditorSize(input: HTMLInputElement): void {
  input.size = Math.max(input.value.length, 1);
}

function selectedTableCellKey(selected: SelectedTableCell | null): string {
  if (!selected) return '';
  return [
    selected.tableFrom,
    selected.tableTo,
    selected.cell.row,
    selected.cell.column,
    selected.editing ? 'editing' : 'selected',
    selected.draft ?? '',
  ].join(':');
}

function selectedCellFor(
  table: GalleyTable,
  cell: GalleyTableCell,
  editing: boolean,
  draft: string | null,
): SelectedTableCell {
  return {
    tableFrom: table.from,
    tableTo: table.to,
    cell: { row: cell.row, column: cell.column },
    editing,
    draft,
  };
}

function selectedCellMatches(
  selected: SelectedTableCell | null,
  table: GalleyTable,
  cell: GalleyTableCell,
): boolean {
  return selected?.tableFrom === table.from &&
    selected.tableTo === table.to &&
    selected.cell.row === cell.row &&
    selected.cell.column === cell.column;
}

function tableSelectionIntersects(state: EditorState, table: GalleyTable): boolean {
  return state.selection.ranges.some((range) => {
    if (range.empty) return range.head >= table.from && range.head < table.to;
    return range.from < table.to && range.to > table.from;
  });
}

function selectedTableMatchesTable(selected: SelectedTableCell | null, table: GalleyTable): boolean {
  return selected?.tableFrom === table.from && selected.tableTo === table.to;
}

function sourceEscapeMatchesTable(sourceEscape: SourceEscapedTable | null, table: GalleyTable): boolean {
  return sourceEscape?.from === table.from && sourceEscape.to === table.to;
}

type InlineTokenKind = 'bold' | 'code' | 'link';

interface InlineToken {
  kind: InlineTokenKind;
  from: number;
  to: number;
  text: string;
  href?: string;
}

function renderCellInlineMarkdown(cell: HTMLTableCellElement, text: string): void {
  const fragment = document.createDocumentFragment();
  let position = 0;

  while (position < text.length) {
    const token = nextInlineToken(text, position);
    if (!token) {
      fragment.append(document.createTextNode(text.slice(position)));
      break;
    }

    if (token.from > position) {
      fragment.append(document.createTextNode(text.slice(position, token.from)));
    }

    fragment.append(createInlineTokenNode(token));
    position = token.to;
  }

  cell.replaceChildren(fragment);
}

function nextInlineToken(text: string, position: number): InlineToken | null {
  const source = text.slice(position);
  const candidates = [
    matchInlineToken('code', /`([^`]+)`/.exec(source), position),
    matchInlineToken('bold', /\*\*(.+?)\*\*/.exec(source), position),
    matchLinkToken(/\[([^\]]+)\]\(([^)]+)\)/.exec(source), position),
  ].filter((token): token is InlineToken => token !== null);

  candidates.sort((left, right) => {
    if (left.from !== right.from) return left.from - right.from;
    return inlineTokenPriority(left.kind) - inlineTokenPriority(right.kind);
  });

  return candidates[0] ?? null;
}

function matchInlineToken(
  kind: Exclude<InlineTokenKind, 'link'>,
  match: RegExpExecArray | null,
  position: number,
): InlineToken | null {
  if (!match || match.index < 0) return null;
  return {
    kind,
    from: position + match.index,
    to: position + match.index + match[0].length,
    text: match[1] ?? '',
  };
}

function matchLinkToken(match: RegExpExecArray | null, position: number): InlineToken | null {
  if (!match || match.index < 0) return null;
  return {
    kind: 'link',
    from: position + match.index,
    to: position + match.index + match[0].length,
    text: match[1] ?? '',
    href: match[2] ?? '',
  };
}

function inlineTokenPriority(kind: InlineTokenKind): number {
  if (kind === 'code') return 0;
  if (kind === 'link') return 1;
  return 2;
}

function createInlineTokenNode(token: InlineToken): HTMLElement {
  if (token.kind === 'bold') {
    const strong = document.createElement('strong');
    strong.className = 'ge-table-cell-bold';
    strong.textContent = token.text;
    return strong;
  }

  if (token.kind === 'code') {
    const code = document.createElement('code');
    code.className = 'ge-table-cell-code';
    code.textContent = token.text;
    return code;
  }

  const link = document.createElement('a');
  link.className = 'ge-table-cell-link';
  const href = safeTableCellHref(token.href ?? '');
  if (href) link.setAttribute('href', href);
  link.textContent = token.text;
  return link;
}

export function safeTableCellHref(rawHref: string): string | null {
  const href = rawHref.trim();
  if (!href) return null;
  if (hasAsciiControlCharacter(href)) return null;
  if (href.startsWith('#') || href.startsWith('/') || href.startsWith('./') || href.startsWith('../')) {
    return href;
  }

  const schemeMatch = /^([a-z][a-z\d+.-]*):/i.exec(href);
  if (!schemeMatch) return href;

  const scheme = schemeMatch[1]?.toLowerCase();
  if (scheme === 'http' || scheme === 'https' || scheme === 'mailto') return href;
  return null;
}

function hasAsciiControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 0x1f || code === 0x7f) return true;
  }
  return false;
}

function selectCellAtCurrentTableSelection(view: EditorView): void {
  const head = view.state.selection.main.head;
  let selectedTable: GalleyTable | null = null;

  syntaxTree(view.state).iterate({
    enter(node) {
      if (selectedTable) return false;
      if (node.name !== 'Table') return;
      if (head < node.from || head >= node.to) return;

      selectedTable = parseMarkdownTable(view.state.sliceDoc(node.from, node.to), node.from);
      return false;
    },
  });

  if (!selectedTable) return;

  const cell = tableCellAtPosition(selectedTable, head);
  view.dispatch({
    selection: EditorSelection.cursor(cell.sourceFrom),
    effects: selectTableCell.of(selectedCellFor(selectedTable, cell, false, null)),
  });
}

function arrowNavigationDirection(
  event: KeyboardEvent,
  input: HTMLInputElement,
): 'left' | 'right' | 'up' | 'down' | null {
  const start = input.selectionStart ?? 0;
  const end = input.selectionEnd ?? start;
  const atStart = start === 0 && end === 0;
  const atEnd = start === input.value.length && end === input.value.length;

  if (event.key === 'ArrowLeft' && atStart) return 'left';
  if (event.key === 'ArrowUp' && atStart) return 'up';
  if (event.key === 'ArrowRight' && atEnd) return 'right';
  if (event.key === 'ArrowDown' && atEnd) return 'down';
  return null;
}

function mappedTableTo(state: EditorState, tableFrom: number): number {
  let tableTo = tableFrom;
  syntaxTree(state).iterate({
    enter(node) {
      if (node.name !== 'Table') return;
      if (node.from !== tableFrom) return;
      tableTo = node.to;
      return false;
    },
  });
  return tableTo;
}

function buildTableDecorations(
  state: EditorState,
  tableClass: string,
  preview: boolean,
  canEdit: boolean,
  tableControlIcons?: GalleyTableControlIcons,
): DecorationSet {
  const widgets: Range<Decoration>[] = [];
  const selectedCell = selectedTableCellState(state);
  const sourceEscape = sourceEscapedTableState(state);

  syntaxTree(state).iterate({
    enter(node) {
      if (node.name !== 'Table') return;

      const table = parseMarkdownTable(state.sliceDoc(node.from, node.to), node.from);
      if (!table) return;

      const selectedForTable = selectedTableMatchesTable(selectedCell, table) ? selectedCell : null;
      if (canEdit && !preview && sourceEscapeMatchesTable(sourceEscape, table) && tableSelectionIntersects(state, table)) {
        return;
      }

      widgets.push(
        Decoration.replace({
          widget: new TableWidget(
            table,
            tableClass,
            selectedForTable,
            canEdit,
            preview,
            tableControlIcons,
          ),
          block: true,
        }).range(node.from, node.to),
      );
    },
  });

  return Decoration.set(widgets, true);
}

function makeTableDecorationsField(
  tableClass: string,
  preview: boolean,
  canEdit: boolean,
  tableControlIcons?: GalleyTableControlIcons,
) {
  return StateField.define<DecorationSet>({
    create(state) {
      return buildTableDecorations(state, tableClass, preview, canEdit, tableControlIcons);
    },
    update(decorations, transaction) {
      const selectedChanged =
        selectedTableCellState(transaction.startState) !==
        selectedTableCellState(transaction.state);
      const sourceEscapeChanged =
        sourceEscapedTableState(transaction.startState) !==
        sourceEscapedTableState(transaction.state);
      const selectionChanged = !transaction.newSelection.eq(transaction.startState.selection);
      const treeChanged = syntaxTree(transaction.state) !== syntaxTree(transaction.startState);

      if (
        transaction.docChanged ||
        selectionChanged ||
        selectedChanged ||
        sourceEscapeChanged ||
        treeChanged
      ) {
        return buildTableDecorations(
          transaction.state,
          tableClass,
          preview,
          canEdit,
          tableControlIcons,
        );
      }

      return decorations.map(transaction.changes);
    },
    provide: (field) => EditorView.decorations.from(field),
  });
}

function makeTablesViewPlugin(
  preview: boolean,
  canEdit: boolean,
) {
  return ViewPlugin.define(() => ({}), {
    eventHandlers: {
      keydown(event, view) {
        if (!canEdit || preview || view.state.readOnly) return false;
        const selected = selectedTableCellState(view.state);
        if (!selected || selected.editing) return false;

        const table = parseMarkdownTable(
          view.state.sliceDoc(selected.tableFrom, selected.tableTo),
          selected.tableFrom,
        );
        const cell = table ? tableCell(table, selected.cell) : null;
        if (!table || !cell) return false;

        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          view.dispatch({
            effects: selectTableCell.of(null),
          });
          return true;
        }

        if (event.key === 'Enter') {
          event.preventDefault();
          view.dispatch({
            effects: selectTableCell.of(selectedCellFor(table, cell, true, cell.text)),
          });
          return true;
        }

        if (isPrintableKey(event)) {
          event.preventDefault();
          view.dispatch({
            effects: selectTableCell.of(selectedCellFor(table, cell, true, event.key)),
          });
          return true;
        }

        return false;
      },
    },
  });
}

function isPrintableKey(event: KeyboardEvent): boolean {
  return event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey;
}

const tablesPlugin: GalleyPlugin = {
  id: 'ge:tables',
  extensions(classNames: GalleyClassNames, context) {
    const tableClass = classNames.table ?? 'ge-table';
    const preview = context?.mode === 'preview';
    const canEdit = context?.canEdit ?? !preview;
    const tableControlIcons = context?.tableControlIcons;

    return [
      selectedTableCellField,
      sourceEscapedTableField,
      makeTableDecorationsField(tableClass, preview, canEdit, tableControlIcons),
      makeTablesViewPlugin(preview, canEdit),
    ];
  },
};

export default tablesPlugin;
