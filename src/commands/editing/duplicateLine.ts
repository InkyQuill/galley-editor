import { EditorSelection } from '@codemirror/state';
import type { CommandFn } from '../../types';
import {
  docLines,
  positionInLines,
  rangeColumns,
  replaceDocument,
  touchedLineBlocks,
} from './line-utils';

export const duplicateLine: CommandFn = (view) => {
  const { state } = view;
  const lines = docLines(state);
  const nextLines = [...lines];
  const nextRanges = [];
  let insertedLineCount = 0;

  for (const block of touchedLineBlocks(state)) {
    const originalBlock = lines.slice(block.fromLine - 1, block.toLine);
    const insertAt = block.toLine + insertedLineCount;
    nextLines.splice(insertAt, 0, ...originalBlock);

    const duplicateFromLine = block.toLine + insertedLineCount + 1;
    const duplicateToLine = duplicateFromLine + originalBlock.length - 1;
    const { anchorColumn, headColumn } = rangeColumns(state, block.range);
    const anchorLineOffset = state.doc.lineAt(block.range.anchor).number - block.fromLine;
    const headLineOffset = state.doc.lineAt(block.range.head).number - block.fromLine;

    const anchor = positionInLines(nextLines, duplicateFromLine + anchorLineOffset, anchorColumn);
    const head = positionInLines(
      nextLines,
      Math.min(duplicateToLine, duplicateFromLine + headLineOffset),
      headColumn,
    );
    nextRanges.push(EditorSelection.range(anchor, head));
    insertedLineCount += originalBlock.length;
  }

  view.dispatch(
    replaceDocument(
      state,
      nextLines,
      EditorSelection.create(nextRanges, Math.min(state.selection.mainIndex, nextRanges.length - 1)),
    ),
  );
  return true;
};
