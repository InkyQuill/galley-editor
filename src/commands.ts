/**
 * Built-in formatting commands for the Neutrino Editor.
 *
 * Each command is a function (view: EditorView, ...args) => boolean.
 * These are registered in the controller and can be invoked via execCommand().
 */

import {
  EditorSelection,
  type EditorState,
  type SelectionRange,
  type TransactionSpec,
} from '@codemirror/state';
import { undo, redo, selectAll } from '@codemirror/commands';
import { syntaxTree, getIndentUnit, indentString } from '@codemirror/language';
import type { BuiltinCommand, CommandFn } from './types';

// ── RegionSpec: describes inline formatting regions ─────────────────────────

interface RegionMatchSpec {
  start: RegExp;
  end: RegExp;
}

interface RegionSpec {
  nodeName?: string;
  template: { start: string; end: string };
  matcher: RegionMatchSpec;
}

function escapeRegex(s: string): string {
  return s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
}

function createRegionSpec(config: {
  nodeName?: string;
  template: string | { start: string; end: string };
  matcher?: RegionMatchSpec;
}): RegionSpec {
  const start =
    typeof config.template === 'string'
      ? config.template
      : config.template.start;
  const end =
    typeof config.template === 'string'
      ? config.template
      : config.template.end;

  const matcher = config.matcher ?? {
    start: new RegExp(escapeRegex(start), 'g'),
    end: new RegExp(escapeRegex(end), 'g'),
  };

  return { nodeName: config.nodeName, template: { start, end }, matcher };
}

// ── Find inline match ───────────────────────────────────────────────────────

const MatchSide = { Start: 0, End: 1 } as const;
type MatchSide = (typeof MatchSide)[keyof typeof MatchSide];

function findInlineMatch(
  doc: { sliceString(from: number, to: number): string },
  spec: RegionSpec,
  sel: SelectionRange,
  side: MatchSide,
): number {
  const [regex, template] =
    side === MatchSide.Start
      ? [spec.matcher.start, spec.template.start]
      : [spec.matcher.end, spec.template.end];

  const bufferSize = template.length;
  const [startIndex, endIndex] = sel.empty
    ? side === MatchSide.Start
      ? [sel.from - bufferSize, sel.to]
      : [sel.from, sel.to + bufferSize]
    : [sel.from, sel.to];

  const searchText = doc.sliceString(startIndex, endIndex);

  const indexSatisfies = (idx: number, len: number): boolean => {
    idx += startIndex;
    return side === MatchSide.Start
      ? idx === startIndex
      : idx + len === endIndex;
  };

  regex.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(searchText)) !== null) {
    if (indexSatisfies(match.index, match[0].length)) {
      return match[0].length;
    }
  }
  return -1;
}

// ── Toggle inline region surrounded ─────────────────────────────────────────

function toggleInlineRegionSurrounded(
  doc: { sliceString(from: number, to: number): string },
  sel: SelectionRange,
  spec: RegionSpec,
): { changes: { from: number; to?: number; insert?: string }[]; range: SelectionRange } {
  let content = doc.sliceString(sel.from, sel.to);
  const startMatchLen = findInlineMatch(doc, spec, sel, MatchSide.Start);
  const endMatchLen = findInlineMatch(doc, spec, sel, MatchSide.End);

  const startsWithBefore = startMatchLen >= 0;
  const endsWithAfter = endMatchLen >= 0;

  const changes: { from: number; to?: number; insert?: string }[] = [];
  let finalSelStart = sel.from;
  let finalSelEnd = sel.to;

  if (startsWithBefore && endsWithAfter) {
    content = content.substring(startMatchLen);
    content = content.substring(0, content.length - endMatchLen);
    finalSelEnd -= startMatchLen + endMatchLen;
    changes.push({ from: sel.from, to: sel.to, insert: content });
  } else {
    let insertFrom = sel.from;
    let insertTo = sel.to;

    if (!sel.empty) {
      const leadingWs = content.match(/^\s*/)?.[0] ?? '';
      const trailingWs = content.match(/\s*$/)?.[0] ?? '';
      insertFrom += leadingWs.length;
      insertTo -= trailingWs.length;
      if (insertFrom >= insertTo) {
        insertFrom = sel.from;
        insertTo = sel.to;
      }
    }

    changes.push({ from: insertFrom, insert: spec.template.start });
    changes.push({ from: insertTo, insert: spec.template.end });

    if (!sel.empty) {
      finalSelEnd += spec.template.start.length + spec.template.end.length;
    } else {
      finalSelStart = sel.from + spec.template.start.length;
      finalSelEnd = finalSelStart;
    }
  }

  return { changes, range: EditorSelection.range(finalSelStart, finalSelEnd) };
}

// ── Grow selection to syntax node ───────────────────────────────────────────

function growSelectionToNode(
  state: EditorState,
  sel: SelectionRange,
  nodeName?: string,
): SelectionRange {
  if (!nodeName || !sel.empty) return sel;

  let result = sel;
  syntaxTree(state).iterate({
    from: sel.from,
    to: sel.to,
    enter: (node) => {
      if (node.name === nodeName) {
        result = EditorSelection.range(node.from, node.to);
        return false;
      }
    },
  });
  return result;
}

// ── Toggle inline format globally ───────────────────────────────────────────

function toggleInlineFormatGlobally(
  state: EditorState,
  spec: RegionSpec,
): TransactionSpec {
  return state.changeByRange((sel: SelectionRange) => {
    const endMatchLen = findInlineMatch(state.doc, spec, sel, MatchSide.End);
    if (sel.empty && endMatchLen > -1) {
      return { range: EditorSelection.cursor(sel.from + endMatchLen) };
    }
    const newRange = growSelectionToNode(state, sel, spec.nodeName);
    return toggleInlineRegionSurrounded(state.doc, newRange, spec);
  });
}

// ── Toggle selected lines start with ───────────────────────────────────────

interface LineInfo {
  from: number;
  to: number;
  text: string;
  number: number;
}

/** Collect lines in a range and determine whether any already match the regex. */
function collectLines(
  doc: EditorState['doc'],
  fromLine: LineInfo,
  toLine: LineInfo,
  regex: RegExp,
): { lines: LineInfo[]; anyMatch: boolean } {
  let anyMatch = false;
  const lines: LineInfo[] = [];
  for (let i = fromLine.number; i <= toLine.number; i++) {
    const line = doc.line(i);
    if (line.text.search(regex) === 0) {
      anyMatch = true;
    }
    lines.push(line);
  }
  return { lines, anyMatch };
}

/** Build changes and offset tracking for adding or removing line prefixes. */
function buildLineChanges(
  lines: LineInfo[],
  sel: SelectionRange,
  regex: RegExp,
  template: string,
  anyMatch: boolean,
  matchEmpty: boolean,
  firstLineNumber: number,
): { changes: { from: number; to?: number; insert?: string }[]; charsAdded: number; charsAddedBefore: number } {
  const changes: { from: number; to?: number; insert?: string }[] = [];
  let charsAdded = 0;
  let charsAddedBefore = 0;

  for (const line of lines) {
    if (!matchEmpty && line.text.trim().length === 0 && firstLineNumber < line.number) {
      continue;
    }

    if (anyMatch) {
      const match = line.text.match(regex);
      if (!match) continue;
      changes.push({ from: line.from, to: line.from + match[0].length, insert: '' });
      const deletedSize = match[0].length;
      if (line.from <= sel.from) {
        charsAddedBefore -= Math.min(sel.from - line.from, deletedSize);
      }
      charsAdded -= deletedSize;
    } else {
      changes.push({ from: line.from, insert: template });
      charsAdded += template.length;
      if (line.from <= sel.from) {
        charsAddedBefore += template.length;
      }
    }
  }

  return { changes, charsAdded, charsAddedBefore };
}

function toggleSelectedLinesStartWith(
  state: EditorState,
  regex: RegExp,
  template: string,
  matchEmpty: boolean,
): TransactionSpec {
  return state.changeByRange((sel: SelectionRange) => {
    const doc = state.doc;
    const fromLine = doc.lineAt(sel.from);
    const toLine = doc.lineAt(sel.to);

    const { lines, anyMatch } = collectLines(doc, fromLine, toLine, regex);
    const { changes, charsAdded, charsAddedBefore } = buildLineChanges(
      lines, sel, regex, template, anyMatch, matchEmpty, fromLine.number,
    );

    const newSel =
      sel.empty && fromLine.number === toLine.number
        ? EditorSelection.cursor(sel.from + charsAddedBefore)
        : EditorSelection.range(fromLine.from, toLine.to + charsAdded);

    return { changes, range: newSel };
  });
}

// ── Individual command implementations ──────────────────────────────────────

const toggleBold: CommandFn = (view) => {
  const spec = createRegionSpec({ template: '**', nodeName: 'StrongEmphasis' });
  view.dispatch(toggleInlineFormatGlobally(view.state, spec));
  return true;
};

const toggleItalic: CommandFn = (view) => {
  let handledBoldItalic = false;
  view.dispatch(
    view.state.changeByRange((sel: SelectionRange) => {
      if (sel.empty) {
        const doc = view.state.doc;
        const line = doc.lineAt(sel.from);
        const idx = sel.from - line.from;
        const before = line.text.substring(0, idx);
        const after = line.text.substring(idx);

        if (after.startsWith('***')) {
          handledBoldItalic = true;
          return { range: EditorSelection.cursor(sel.to + 3) };
        }
        if (before.endsWith('**') && after.startsWith('**')) {
          handledBoldItalic = true;
          return {
            changes: [{ from: sel.from, to: sel.to, insert: '**' }],
            range: EditorSelection.cursor(sel.to + 1),
          };
        }
      }
      return { range: sel };
    }),
  );

  if (!handledBoldItalic) {
    const spec: RegionSpec = {
      nodeName: 'Emphasis',
      template: { start: '*', end: '*' },
      matcher: { start: /[_*]/g, end: /[_*]/g },
    };
    view.dispatch(toggleInlineFormatGlobally(view.state, spec));
  }
  return true;
};

const toggleCode: CommandFn = (view) => {
  const spec = createRegionSpec({ template: '`', nodeName: 'InlineCode' });
  view.dispatch(toggleInlineFormatGlobally(view.state, spec));
  return true;
};

const toggleStrikethrough: CommandFn = (view) => {
  const spec = createRegionSpec({ template: '~~', nodeName: 'Strikethrough' });
  view.dispatch(toggleInlineFormatGlobally(view.state, spec));
  return true;
};

const createToggleHeading = (level: number): CommandFn => {
  return (view) => {
    const prefix = '#'.repeat(level) + ' ';
    const matchEmpty = true;

    const removeOtherLevels = toggleSelectedLinesStartWith(
      view.state,
      new RegExp(
        `${level - 1 >= 1 ? `(?:^[#]{1,${level - 1}}\\s)|` : ''}(?:^[#]{${level + 1},}\\s)`,
      ),
      '',
      matchEmpty,
    );
    view.dispatch(removeOtherLevels);

    const changes = toggleSelectedLinesStartWith(
      view.state,
      new RegExp(`^[#]{${level}} `),
      prefix,
      matchEmpty,
    );
    view.dispatch(changes);
    return true;
  };
};

const toggleBulletList: CommandFn = (view) => {
  const changes = toggleSelectedLinesStartWith(view.state, /^\s*[-*]\s(?!\[)/, '- ', true);
  view.dispatch(changes);
  return true;
};

const toggleOrderedList: CommandFn = (view) => {
  const changes = toggleSelectedLinesStartWith(view.state, /^\s*\d+\.\s/, '1. ', true);
  view.dispatch(changes);
  return true;
};

const toggleCheckList: CommandFn = (view) => {
  const changes = toggleSelectedLinesStartWith(view.state, /^\s*[-*]\s\[[ xX]\]\s/, '- [ ] ', true);
  view.dispatch(changes);
  return true;
};

const insertLink: CommandFn = (view, label = '', url = '') => {
  const linkText = label ? `[${label}](${url})` : `[](${url})`;
  view.dispatch(view.state.replaceSelection(linkText));
  return true;
};

const insertImage: CommandFn = (view, alt = '', url = '') => {
  view.dispatch(view.state.replaceSelection(`![${alt}](${url})`));
  return true;
};

const insertCodeBlock: CommandFn = (view, language = '') => {
  view.dispatch(
    view.state.replaceSelection(`\`\`\`${language}\n\n\`\`\``),
  );
  return true;
};

const insertTable: CommandFn = (view) => {
  view.dispatch(
    view.state.replaceSelection(
      '\n| Header | Header |\n|--------|--------|\n|        |        |\n',
    ),
  );
  return true;
};

const insertHr: CommandFn = (view) => {
  const line = view.state.doc.lineAt(view.state.selection.main.to);
  const needsNewLine = line.text.trim() !== '';
  const insert = needsNewLine ? '\n---\n' : '---\n';
  view.dispatch({
    changes: { from: line.to, insert },
    selection: EditorSelection.cursor(line.to + insert.length),
  });
  return true;
};

const indentCmd: CommandFn = (view) => {
  const unit = indentString(view.state, getIndentUnit(view.state));
  const changes = toggleSelectedLinesStartWith(view.state, /$ ^/, unit, true);
  view.dispatch(changes);
  return true;
};

const outdent: CommandFn = (view) => {
  const changes = toggleSelectedLinesStartWith(
    view.state,
    new RegExp(`^(?:[\\t]|[ ]{1,${getIndentUnit(view.state)}})`),
    '',
    true,
  );
  view.dispatch(changes);
  return true;
};

// ── Command registry ────────────────────────────────────────────────────────

export const BUILTIN_COMMANDS: Record<BuiltinCommand, CommandFn> = {
  toggleBold,
  toggleItalic,
  toggleCode,
  toggleStrikethrough,
  toggleHeading1: createToggleHeading(1),
  toggleHeading2: createToggleHeading(2),
  toggleHeading3: createToggleHeading(3),
  toggleHeading4: createToggleHeading(4),
  toggleHeading5: createToggleHeading(5),
  toggleHeading6: createToggleHeading(6),
  toggleBulletList,
  toggleOrderedList,
  toggleCheckList,
  insertLink,
  insertImage,
  insertCodeBlock,
  insertTable,
  insertHr,
  indent: indentCmd,
  outdent,
  undo: (view) => undo(view),
  redo: (view) => redo(view),
  selectAll: (view) => selectAll(view),
};
