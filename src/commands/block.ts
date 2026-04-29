import { EditorSelection, type ChangeSpec, type SelectionRange } from '@codemirror/state';
import type { CommandFn } from '../types';

interface LineState {
  from: number;
  to: number;
  text: string;
  number: number;
}

interface EditorLikeState {
  doc: {
    lineAt(pos: number): LineState;
    line(lineNo: number): LineState;
  };
}

interface RangeUpdate {
  changes?: ChangeSpec;
  range: SelectionRange;
}

function collectLines(state: EditorLikeState, range: SelectionRange): LineState[] {
  const fromLine = state.doc.lineAt(range.from);
  const toLine = state.doc.lineAt(range.to);
  const lines: LineState[] = [];
  for (let lineNumber = fromLine.number; lineNumber <= toLine.number; lineNumber += 1) {
    const line = state.doc.line(lineNumber);
    lines.push(line);
  }
  return lines;
}

function applyListMarkerToggle(
  state: EditorLikeState,
  range: SelectionRange,
  pattern: RegExp,
  markerFactory: (line: LineState, index: number) => string,
): RangeUpdate {
  const lines = collectLines(state, range);
  let anyMatch = false;

  for (const line of lines) {
    const hadMatch = pattern.test(line.text);
    pattern.lastIndex = 0;
    if (hadMatch) {
      anyMatch = true;
      break;
    }
  }

  const changes: { from: number; to: number; insert: string }[] = [];
  let charsAdded = 0;
  let charsAddedBefore = 0;
  let orderedIndex = 1;

  for (const line of lines) {
    const match = pattern.exec(line.text);
    pattern.lastIndex = 0;

    if (anyMatch && match) {
      const markerLen = match[0].length;
      changes.push({ from: line.from, to: line.from + markerLen, insert: '' });
      const removedBeforeSelection = Math.min(Math.max(0, range.from - line.from), markerLen);
      charsAdded -= markerLen;
      charsAddedBefore -= removedBeforeSelection;
      continue;
    }

    if (anyMatch) {
      continue;
    }

    const marker = markerFactory(line, orderedIndex);
    if (pattern.source === '^\\s*\\d+\\.\\s*') {
      orderedIndex += 1;
    }

    changes.push({ from: line.from, to: line.from, insert: marker });
    charsAdded += marker.length;
    if (line.from <= range.from) {
      charsAddedBefore += marker.length;
    }
  }

  return {
    changes,
    range: EditorSelection.range(range.from + charsAddedBefore, range.to + charsAdded),
  };
}

function toggleHeadingRange(level: number, lineText: string): string {
  const target = '#'.repeat(level);
  const headingMatch = /^(#{1,6})\s/.exec(lineText);
  if (!headingMatch) {
    return `${target} ${lineText}`;
  }

  const currentLevel = headingMatch[1].length;
  const rest = lineText.slice(headingMatch[0].length);
  return currentLevel === level ? rest : `${target} ${rest}`;
}

export const toggleHeading: CommandFn = (view, levelArg: unknown = 1) => {
  const level = Number(levelArg);
  const normalized = Number.isFinite(level) ? Math.max(1, Math.min(6, Math.trunc(level))) : 1;

  view.dispatch(
    view.state.changeByRange((sel) => {
      const lines = collectLines(view.state, sel);
      const changes: { from: number; to: number; insert: string }[] = [];
      let charsAdded = 0;
      let charsAddedBefore = 0;

      for (const line of lines) {
        const replacement = toggleHeadingRange(normalized, line.text);
        if (replacement === line.text) continue;

        const delta = replacement.length - line.text.length;
        changes.push({ from: line.from, to: line.to, insert: replacement });
        charsAdded += delta;
        if (line.from <= sel.from) {
          charsAddedBefore += delta;
        }
      }

      return {
        changes,
        range: EditorSelection.range(sel.from + charsAddedBefore, sel.to + charsAdded),
      };
    }),
  );
  return true;
};

export const toggleBulletList: CommandFn = (view) => {
  view.dispatch(
    view.state.changeByRange((sel) =>
      applyListMarkerToggle(view.state, sel, /^\s*[-*+]\s(?!\[)/, () => '- '),
    ),
  );
  return true;
};

export const toggleOrderedList: CommandFn = (view) => {
  view.dispatch(
    view.state.changeByRange((sel) =>
      applyListMarkerToggle(view.state, sel, /^\s*\d+\.\s*/, (_line, index) => `${index}. `),
    ),
  );
  return true;
};

export const toggleCheckList: CommandFn = (view) => {
  view.dispatch(
    view.state.changeByRange((sel) =>
      applyListMarkerToggle(view.state, sel, /^\s*[-*+]\s\[[ xX]\]\s*/, () => '- [ ] '),
    ),
  );
  return true;
};
