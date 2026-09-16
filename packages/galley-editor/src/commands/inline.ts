import {
  EditorSelection,
  type ChangeSpec,
  type EditorState,
  type SelectionRange,
} from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import type { CommandFn } from '../types';

interface RegionMatchSpec {
  start: RegExp;
  end: RegExp;
}

interface RegionSpec {
  nodeName?: string;
  template: { start: string; end: string };
  matcher: RegionMatchSpec;
}

interface RangeUpdate {
  changes?: ChangeSpec;
  range: SelectionRange;
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

type MatchSide = 'start' | 'end';

function findInlineMatch(
  doc: { sliceString(from: number, to: number): string },
  spec: RegionSpec,
  sel: SelectionRange,
  side: MatchSide,
): number {
  const [regex, template] =
    side === 'start'
      ? [spec.matcher.start, spec.template.start]
      : [spec.matcher.end, spec.template.end];

  const bufferSize = template.length;
  const [startIndex, endIndex] = sel.empty
    ? side === 'start'
      ? [sel.from - bufferSize, sel.to]
      : [sel.from, sel.to + bufferSize]
    : [sel.from, sel.to];

  const searchText = doc.sliceString(startIndex, endIndex);

  const indexSatisfies = (idx: number, len: number): boolean => {
    const absoluteIndex = idx + startIndex;
    return side === 'start' ? absoluteIndex === startIndex : absoluteIndex + len === endIndex;
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

function toggleInlineRegionSurrounded(
  doc: { sliceString(from: number, to: number): string },
  sel: SelectionRange,
  spec: RegionSpec,
): RangeUpdate {
  let content = doc.sliceString(sel.from, sel.to);
  const startMatchLen = findInlineMatch(doc, spec, sel, 'start');
  const endMatchLen = findInlineMatch(doc, spec, sel, 'end');

  const startsWithBefore = startMatchLen >= 0;
  const endsWithAfter = endMatchLen >= 0;

  const changes: {
    from: number;
    to?: number;
    insert?: string;
  }[] = [];
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

  return {
    changes,
    range: EditorSelection.range(finalSelStart, finalSelEnd),
  };
}

export function toggleInlineFormatGlobally(
  state: EditorState & { doc: { sliceString(from: number, to: number): string } },
  spec: RegionSpec,
) {
  return state.changeByRange((sel: SelectionRange) => {
    const endMatchLen = findInlineMatch(state.doc, spec, sel, 'end');
    if (sel.empty && endMatchLen > -1) {
      return { range: EditorSelection.cursor(sel.from + endMatchLen) };
    }
    const resolved = growSelectionToNode(state, sel, spec.nodeName);
    return toggleInlineRegionSurrounded(state.doc, resolved, spec);
  });
}

export const toggleBold: CommandFn = (view) => {
  view.dispatch(
    toggleInlineFormatGlobally(
      view.state,
      createRegionSpec({ template: '**', nodeName: 'StrongEmphasis' }),
    ),
  );
  return true;
};

export const toggleItalic: CommandFn = (view) => {
  let handledBoldItalic = false;
  view.dispatch(
    view.state.changeByRange((sel) => {
      if (sel.empty) {
        const line = view.state.doc.lineAt(sel.from);
        const indexInLine = sel.from - line.from;
        const before = line.text.substring(0, indexInLine);
        const after = line.text.substring(indexInLine);

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

export const toggleCode: CommandFn = (view) => {
  view.dispatch(toggleInlineFormatGlobally(view.state, createRegionSpec({ template: '`', nodeName: 'InlineCode' })));
  return true;
};

export const toggleStrikethrough: CommandFn = (view) => {
  view.dispatch(toggleInlineFormatGlobally(view.state, createRegionSpec({ template: '~~', nodeName: 'Strikethrough' })));
  return true;
};
