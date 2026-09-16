import { EditorSelection, findClusterBreak, type ChangeSpec, type EditorState, type SelectionRange, type TransactionSpec } from '@codemirror/state';
import { parseListLine } from './list-syntax';

interface RangeUpdate {
  changes?: ChangeSpec;
  range: SelectionRange;
}

function defaultBackspaceRange(state: EditorState, range: SelectionRange): RangeUpdate {
  if (!range.empty) {
    return {
      changes: [{ from: range.from, to: range.to, insert: '' }],
      range: EditorSelection.cursor(range.from),
    };
  }

  if (range.from === 0) {
    return {
      changes: [],
      range: EditorSelection.cursor(0),
    };
  }

  const line = state.doc.lineAt(range.from);
  const from = range.from === line.from
    ? range.from - 1
    : line.from + findClusterBreak(line.text, range.from - line.from, false);
  return {
    changes: [{ from, to: range.from, insert: '' }],
    range: EditorSelection.cursor(from),
  };
}

export function makeSmartBackspaceTransaction(
  state: EditorState,
): TransactionSpec {
  return state.changeByRange((range) => {
    if (!range.empty) {
      return defaultBackspaceRange(state, range);
    }

    const line = state.doc.lineAt(range.from);
    const parsed = parseListLine(line.text);
    if (!parsed) {
      return defaultBackspaceRange(state, range);
    }

    const markerStart = line.from + parsed.indent.length;
    const markerEnd = line.from + parsed.markerTo;
    const hasContent = line.text.slice(parsed.markerTo).trim().length > 0;
    if (range.from !== markerEnd || hasContent) {
      return defaultBackspaceRange(state, range);
    }

    return {
      changes: [{ from: markerStart, to: line.to, insert: '' }],
      range: EditorSelection.cursor(markerStart),
    };
  });
}
