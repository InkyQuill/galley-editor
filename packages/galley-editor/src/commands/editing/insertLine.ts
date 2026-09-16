import { EditorSelection } from '@codemirror/state';
import type { CommandFn } from '../../types';
import {
  docLines,
  positionInLines,
  replaceDocument,
  touchedLineBlocks,
} from './line-utils';

function insertLine(view: Parameters<CommandFn>[0], where: 'before' | 'after'): boolean {
  const { state } = view;
  const lines = docLines(state);
  const nextLines = [...lines];
  const nextRanges = [];
  let insertedLineCount = 0;

  for (const block of touchedLineBlocks(state)) {
    const baseLine = where === 'before' ? block.fromLine : block.toLine + 1;
    const insertAt = baseLine - 1 + insertedLineCount;
    nextLines.splice(insertAt, 0, '');

    const newLine = baseLine + insertedLineCount;
    const pos = positionInLines(nextLines, newLine, 0);
    nextRanges.push(EditorSelection.cursor(pos));
    insertedLineCount += 1;
  }

  view.dispatch(
    replaceDocument(
      state,
      nextLines,
      EditorSelection.create(nextRanges, Math.min(state.selection.mainIndex, nextRanges.length - 1)),
    ),
  );
  return true;
}

export const insertLineBefore: CommandFn = (view) => insertLine(view, 'before');
export const insertLineAfter: CommandFn = (view) => insertLine(view, 'after');
