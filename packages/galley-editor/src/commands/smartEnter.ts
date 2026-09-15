import { EditorSelection, type ChangeSpec, type EditorState, type SelectionRange, type TransactionSpec } from '@codemirror/state';
import { parseListLine, listPrefix } from './list-syntax';

interface RangeUpdate {
  changes?: ChangeSpec;
  range: SelectionRange;
}

function defaultEnterRange(range: SelectionRange): RangeUpdate {
  return {
    changes: [{ from: range.from, to: range.to, insert: '\n' }],
    range: EditorSelection.cursor(range.from + 1),
  };
}

function splitLineRange(
  state: {
    doc: {
      lineAt: (value: number) => { from: number; to: number; text: string };
      line: (value: number) => { from: number; to: number; text: string };
    };
  },
  range: SelectionRange,
  nextMarker: string,
): RangeUpdate {
  const line = state.doc.lineAt(range.from);
  const lineOffset = line.from;
  const tail = line.text.slice(range.to - lineOffset);
  const shouldTrimLeadingSpace = tail.startsWith(' ');

  const marker = `\n${nextMarker}`;
  let to = range.to;
  if (shouldTrimLeadingSpace) {
    to += 1;
  }

    return {
      changes: [{
        from: range.from,
        to,
        insert: marker,
      }],
    range: EditorSelection.cursor(range.from + marker.length),
  };
}

function exitListLine(range: SelectionRange, lineFrom: number, markerFrom: number): RangeUpdate {
  return {
    changes: [{ from: lineFrom + markerFrom, to: range.to, insert: '' }],
    range: EditorSelection.cursor(lineFrom + markerFrom),
  };
}

export function makeSmartEnterTransaction(
  state: EditorState,
): TransactionSpec {
  return state.changeByRange((range) => {
    const line = state.doc.lineAt(range.from);
    if (range.to > line.to) {
      return defaultEnterRange(range);
    }

    const parsed = parseListLine(line.text);
    if (!parsed) {
      return defaultEnterRange(range);
    }

    const markerEnd = line.from + parsed.markerTo;
    const markerContent = line.text.slice(parsed.markerTo).trim();
    const isEmptyItem = markerContent.length === 0;
    const cursorPastMarker = range.from >= markerEnd;

    if (isEmptyItem && range.empty && cursorPastMarker) {
      return exitListLine(range, line.from, parsed.indent.length);
    }

    const nextMarker = listPrefix(parsed, {
      orderedNumber: parsed.kind === 'ordered' ? 1 : undefined,
      keepTaskState: parsed.kind === 'task' ? false : undefined,
    });

    if (parsed.kind === 'ordered') {
      const continued = listPrefix(parsed, {
        orderedNumber: (parsed.orderedNumber ?? 1) + 1,
      });
      return splitLineRange(state, range, continued);
    }

    return splitLineRange(state, range, nextMarker);
  });
}
