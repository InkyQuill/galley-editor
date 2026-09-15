import { EditorSelection, type SelectionRange } from '@codemirror/state';
import type { CommandFn } from '../../types';
import {
  docLines,
  positionInLines,
  rangeColumns,
  replaceDocument,
  touchedLineBlocks,
} from './line-utils';

type Direction = 'up' | 'down';

function remapRange(
  lines: readonly string[],
  targetLine: number,
  anchorColumn: number,
  headColumn: number,
) {
  const anchor = positionInLines(lines, targetLine, anchorColumn);
  const head = positionInLines(lines, targetLine, headColumn);
  return EditorSelection.range(anchor, head);
}

function swapLine(view: Parameters<CommandFn>[0], direction: Direction): boolean {
  const { state } = view;
  const lines = docLines(state);
  const nextLines = [...lines];
  const occupied = new Set<number>();
  const nextRanges: SelectionRange[] = [];
  let didSwap = false;

  for (const block of touchedLineBlocks(state)) {
    const blockLines = [];
    for (let line = block.fromLine; line <= block.toLine; line += 1) blockLines.push(line);

    const targetLine = direction === 'up' ? block.fromLine - 1 : block.toLine + 1;
    const affectedLines = direction === 'up'
      ? [targetLine, ...blockLines]
      : [...blockLines, targetLine];

    const canSwap =
      targetLine >= 1 &&
      targetLine <= lines.length &&
      affectedLines.every((line) => !occupied.has(line));

    if (canSwap) {
      if (direction === 'up') {
        const targetText = nextLines[targetLine - 1];
        const moving = nextLines.splice(block.fromLine - 1, blockLines.length);
        nextLines.splice(targetLine - 1, 1, ...moving, targetText);
      } else {
        const targetText = nextLines[targetLine - 1];
        const moving = nextLines.splice(block.fromLine - 1, blockLines.length);
        nextLines.splice(block.fromLine - 1, 1, targetText, ...moving);
      }
      affectedLines.forEach((line) => occupied.add(line));
      didSwap = true;
    }

    const { anchorColumn, headColumn } = rangeColumns(state, block.range);
    const lineDelta = canSwap ? (direction === 'up' ? -1 : 1) : 0;
    const originalAnchorLine = state.doc.lineAt(block.range.anchor).number;
    nextRanges.push(
      remapRange(
        nextLines,
        originalAnchorLine + lineDelta,
        anchorColumn,
        headColumn,
      ),
    );
  }

  if (!didSwap) return false;

  view.dispatch(
    replaceDocument(
      state,
      nextLines,
      EditorSelection.create(nextRanges, Math.min(state.selection.mainIndex, nextRanges.length - 1)),
    ),
  );
  return true;
}

export const swapLineUp: CommandFn = (view) => swapLine(view, 'up');
export const swapLineDown: CommandFn = (view) => swapLine(view, 'down');
