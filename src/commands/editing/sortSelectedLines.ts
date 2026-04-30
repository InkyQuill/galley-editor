import { EditorSelection } from '@codemirror/state';
import type { CommandFn } from '../../types';
import {
  docLines,
  positionInLines,
  replaceDocument,
  touchedLineBlocks,
} from './line-utils';

export interface SortSelectedLinesOptions {
  direction?: 'asc' | 'desc';
  wholeDocument?: boolean;
}

function normalizeOptions(input?: unknown): SortSelectedLinesOptions {
  if (input === 'asc' || input === 'desc') return { direction: input };
  if (typeof input === 'object' && input !== null) return input as SortSelectedLinesOptions;
  return {};
}

export const sortSelectedLines: CommandFn = (view, input?: unknown) => {
  const options = normalizeOptions(input);
  const direction = options.direction ?? 'asc';
  const { state } = view;
  const lines = docLines(state);

  if (options.wholeDocument) {
    const sorted = [...lines].sort((a, b) =>
      direction === 'asc' ? a.localeCompare(b) : b.localeCompare(a),
    );
    view.dispatch(
      replaceDocument(
        state,
        sorted,
        EditorSelection.create([EditorSelection.cursor(positionInLines(sorted, 1, 0))]),
      ),
    );
    return true;
  }

  if (state.selection.ranges.every((range) => range.empty)) return false;

  const nextLines = [...lines];
  let didSort = false;
  for (const block of touchedLineBlocks(state).reverse()) {
    const sorted = nextLines
      .slice(block.fromLine - 1, block.toLine)
      .sort((a, b) => (direction === 'asc' ? a.localeCompare(b) : b.localeCompare(a)));
    nextLines.splice(block.fromLine - 1, sorted.length, ...sorted);
    didSort = true;
  }

  if (!didSort) return false;

  const firstBlock = touchedLineBlocks(state)[0];
  const selection = EditorSelection.range(
    positionInLines(nextLines, firstBlock.fromLine, 0),
    positionInLines(
      nextLines,
      firstBlock.toLine,
      nextLines[firstBlock.toLine - 1]?.length ?? 0,
    ),
  );

  view.dispatch(replaceDocument(state, nextLines, EditorSelection.create([selection])));
  return true;
};
