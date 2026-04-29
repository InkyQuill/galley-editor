import { getIndentUnit, indentString } from '@codemirror/language';
import { EditorSelection, type SelectionRange } from '@codemirror/state';
import { undo, redo, selectAll } from '@codemirror/commands';
import type { CommandFn } from '../types';

interface LineInfo {
  from: number;
  to: number;
  text: string;
  number: number;
}

function lineRange(state: { doc: { lineAt: (pos: number) => LineInfo; line: (n: number) => LineInfo } }, sel: SelectionRange): LineInfo[] {
  const fromLine = state.doc.lineAt(sel.from);
  const toLine = state.doc.lineAt(sel.to);
  const lines: LineInfo[] = [];
  for (let lineNumber = fromLine.number; lineNumber <= toLine.number; lineNumber += 1) {
    const line = state.doc.line(lineNumber);
    lines.push({ from: line.from, to: line.to, text: line.text, number: lineNumber });
  }
  return lines;
}

function withLinePrefix(
  state: { doc: { lineAt: (pos: number) => LineInfo; line: (n: number) => LineInfo } },
  sel: SelectionRange,
  keep: (line: LineInfo) => { insert: string; remove: number },
): { changes: { from: number; to: number; insert: string }[]; charsAdded: number; charsAddedBefore: number } {
  const lines = lineRange(state, sel);
  const changes: { from: number; to: number; insert: string }[] = [];
  let charsAdded = 0;
  let charsAddedBefore = 0;

  for (const line of lines) {
    const { insert, remove } = keep(line);
    if (insert.length === 0 && remove === 0) continue;

    const replaceFrom = line.from;
    const replaceTo = line.from + remove;
    changes.push({ from: replaceFrom, to: replaceTo, insert });

    const delta = insert.length - remove;
    charsAdded += delta;
    if (line.from < sel.from) {
      charsAddedBefore += delta;
    } else if (line.from === sel.from) {
      charsAddedBefore += delta;
    }
  }

  return { changes, charsAdded, charsAddedBefore };
}

export const indent: CommandFn = (view) => {
  const unit = indentString(view.state, getIndentUnit(view.state));
  view.dispatch(
    view.state.changeByRange((sel) => {
      const { changes, charsAdded, charsAddedBefore } = withLinePrefix(
        view.state,
        sel,
        () => ({ insert: unit, remove: 0 }),
      );
      return {
        changes,
        range: EditorSelection.range(sel.from + charsAddedBefore, sel.to + charsAdded),
      };
    }),
  );
  return true;
};

export const outdent: CommandFn = (view) => {
  const unit = indentString(view.state, getIndentUnit(view.state));
  view.dispatch(
    view.state.changeByRange((sel) => {
      const { changes, charsAdded, charsAddedBefore } = withLinePrefix(
        view.state,
        sel,
        (line) => {
          if (line.text.startsWith(unit)) {
            return { insert: '', remove: unit.length };
          }
          if (line.text.startsWith('\t')) {
            return { insert: '', remove: 1 };
          }
          const spaces = /^ +/.exec(line.text)?.[0].length ?? 0;
          if (spaces > 0) {
            return { insert: '', remove: Math.min(spaces, Math.max(1, unit.length)) };
          }
          return { insert: '', remove: 0 };
        },
      );
      return {
        changes,
        range: EditorSelection.range(sel.from + charsAddedBefore, sel.to + charsAdded),
      };
    }),
  );
  return true;
};

export const undoCommand: CommandFn = (view) => undo(view);
export const redoCommand: CommandFn = (view) => redo(view);
export const selectAllCommand: CommandFn = (view) => selectAll(view);
