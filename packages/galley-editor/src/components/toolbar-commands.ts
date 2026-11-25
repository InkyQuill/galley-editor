import type { BuiltinCommand, ToolbarIconName } from '../types';

export const TOOLBAR_COMMANDS: Record<BuiltinCommand, {
  label: string;
  icon?: ToolbarIconName;
  toggle?: true;
  readOnly?: true;
}> = {
  toggleBold: { label: 'Bold', icon: 'bold', toggle: true },
  toggleItalic: { label: 'Italic', icon: 'italic', toggle: true },
  toggleStrikethrough: { label: 'Strikethrough', icon: 'strikethrough', toggle: true },
  toggleCode: { label: 'Inline code', icon: 'inlineCode', toggle: true },
  toggleHeading: { label: 'Toggle heading', icon: 'heading', toggle: true },
  toggleBulletList: { label: 'Bullet list', icon: 'bulletList', toggle: true },
  toggleOrderedList: { label: 'Ordered list', icon: 'orderedList', toggle: true },
  toggleCheckList: { label: 'Task list', icon: 'taskList', toggle: true },
  insertLink: { label: 'Insert link', icon: 'link' },
  insertImage: { label: 'Insert image', icon: 'image' },
  updateImageMetadata: { label: 'Update image metadata', icon: 'image' },
  clearImageDimensions: { label: 'Clear image dimensions', icon: 'image' },
  insertCodeBlock: { label: 'Insert code block', icon: 'codeBlock' },
  insertTable: { label: 'Insert table', icon: 'table' },
  normalizeTable: { label: 'Normalize table', icon: 'table' },
  commitTableCell: { label: 'Save table cell', icon: 'table' },
  insertTableRowBefore: { label: 'Insert table row above', icon: 'table' },
  insertTableRowAfter: { label: 'Insert table row below', icon: 'table' },
  deleteTableRow: { label: 'Delete table row', icon: 'table' },
  insertTableColumnBefore: { label: 'Insert table column before', icon: 'table' },
  insertTableColumnAfter: { label: 'Insert table column after', icon: 'table' },
  deleteTableColumn: { label: 'Delete table column', icon: 'table' },
  setTableColumnAlignment: { label: 'Set table column alignment', icon: 'table' },
  revealTableSource: { label: 'Reveal table source', icon: 'table' },
  insertHr: { label: 'Insert divider', icon: 'divider' },
  indent: { label: 'Indent' },
  outdent: { label: 'Outdent' },
  duplicateLine: { label: 'Duplicate line' },
  sortSelectedLines: { label: 'Sort selected lines' },
  swapLineUp: { label: 'Move line up' },
  swapLineDown: { label: 'Move line down' },
  insertLineAfter: { label: 'Insert line below' },
  insertLineBefore: { label: 'Insert line above' },
  jumpToHash: { label: 'Jump to heading', readOnly: true },
  findInDocument: { label: 'Find in document', readOnly: true },
  undo: { label: 'Undo', icon: 'undo' },
  redo: { label: 'Redo', icon: 'redo' },
  selectAll: { label: 'Select all', readOnly: true },
};
