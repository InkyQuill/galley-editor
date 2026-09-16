import { EditorSelection, type ChangeSpec, type EditorState, type SelectionRange, type TransactionSpec } from '@codemirror/state';
import { adjustListIndent, indentUnitFromState, listPrefix, parseListLine } from './list-syntax';

interface RangeUpdate {
  changes?: ChangeSpec;
  range: SelectionRange;
}

function listLineIndent(
  state: EditorState,
  sel: SelectionRange,
  direction: 'in' | 'out',
): RangeUpdate {
  const unit = indentUnitFromState(state);
  const fromLine = state.doc.lineAt(sel.from);
  const toLine = state.doc.lineAt(sel.to);
  const changes: { from: number; to: number; insert: string }[] = [];

  for (let lineNumber = fromLine.number; lineNumber <= toLine.number; lineNumber += 1) {
    const line = state.doc.line(lineNumber);
    const parsed = parseListLine(line.text);
    if (!parsed) {
      continue;
    }

    const nextIndent = adjustListIndent(parsed.indent, unit, direction);
    if (nextIndent === parsed.indent) {
      continue;
    }

    const content = line.text.slice(parsed.markerTo);
    const marker =
      direction === 'in'
        ? listPrefix(parsed, {
            indent: nextIndent,
            orderedNumber: parsed.kind === 'ordered' ? 1 : parsed.orderedNumber,
          })
        : listPrefix(parsed, {
            indent: nextIndent,
            orderedNumber: parsed.orderedNumber,
          });
    const replacement = `${marker}${content}`;
    changes.push({ from: line.from, to: line.to, insert: replacement });
  }

  const changeSet = state.changes(changes);
  return {
    changes,
    range: EditorSelection.range(
      changeSet.mapPos(sel.from, 1),
      changeSet.mapPos(sel.to, -1),
    ),
  };
}

export function makeSmartTabTransaction(
  state: EditorState,
  shift: boolean,
): TransactionSpec {
  return state.changeByRange((sel) => {
    const direction: 'in' | 'out' = shift ? 'out' : 'in';
    const startLine = state.doc.lineAt(sel.from);
    const parsedStart = parseListLine(startLine.text);

    if (!parsedStart) {
      return { range: EditorSelection.range(sel.from, sel.to) };
    }

    return listLineIndent(state, sel, direction);
  });
}
