import { EditorSelection, type EditorState, type SelectionRange } from '@codemirror/state';

export interface TouchedLineBlock {
  fromLine: number;
  toLine: number;
  range: SelectionRange;
}

export function docLines(state: EditorState): string[] {
  const lines: string[] = [];
  for (let lineNumber = 1; lineNumber <= state.doc.lines; lineNumber += 1) {
    lines.push(state.doc.line(lineNumber).text);
  }
  return lines;
}

export function lineStartOffsets(lines: readonly string[]): number[] {
  const starts: number[] = [];
  let pos = 0;
  for (const line of lines) {
    starts.push(pos);
    pos += line.length + 1;
  }
  return starts;
}

export function positionInLines(
  lines: readonly string[],
  lineNumber: number,
  column = 0,
): number {
  const clampedLine = Math.max(1, Math.min(lineNumber, lines.length));
  const starts = lineStartOffsets(lines);
  const line = lines[clampedLine - 1] ?? '';
  return starts[clampedLine - 1] + Math.max(0, Math.min(column, line.length));
}

export function touchedLineBlocks(state: EditorState): TouchedLineBlock[] {
  const blocks = state.selection.ranges
    .map((range) => ({
      fromLine: state.doc.lineAt(range.from).number,
      toLine: state.doc.lineAt(range.to).number,
      range,
    }))
    .sort((a, b) => a.fromLine - b.fromLine || a.toLine - b.toLine);

  const unique: TouchedLineBlock[] = [];
  for (const block of blocks) {
    const previous = unique[unique.length - 1];
    if (previous && previous.fromLine === block.fromLine && previous.toLine === block.toLine) {
      continue;
    }
    unique.push(block);
  }
  return unique;
}

export function rangeColumns(state: EditorState, range: SelectionRange) {
  const anchorLine = state.doc.lineAt(range.anchor);
  const headLine = state.doc.lineAt(range.head);
  return {
    anchorColumn: range.anchor - anchorLine.from,
    headColumn: range.head - headLine.from,
  };
}

export function replaceDocument(
  state: EditorState,
  lines: readonly string[],
  selection: EditorSelection,
) {
  return {
    changes: { from: 0, to: state.doc.length, insert: lines.join('\n') },
    selection,
  };
}
