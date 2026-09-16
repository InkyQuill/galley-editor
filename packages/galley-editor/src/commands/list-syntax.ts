import { EditorState } from '@codemirror/state';
import { getIndentUnit, indentString } from '@codemirror/language';

export type ListKind = 'bullet' | 'ordered' | 'task';

export interface ParsedListLine {
  kind: ListKind;
  indent: string;
  marker: string;
  bullet?: '-' | '+' | '*';
  orderedNumber?: number;
  checked?: boolean;
  markerFrom: number;
  markerTo: number;
}

const TASK_LIST_RE = /^(?<indent>[ \t]*)(?<bullet>[-+*])\s*\[(?<check>[ xX])\](?:\s+|$)/;
const ORDERED_LIST_RE = /^(?<indent>[ \t]*)(?<number>\d+)\.\s*/;
const BULLET_LIST_RE = /^(?<indent>[ \t]*)(?<bullet>[-+*])(?:\s+|$)/;

const getMarker = (info: ParsedListLine): string => {
  if (info.kind === 'ordered') {
    return `${info.orderedNumber}. `;
  }
  if (info.kind === 'task') {
    return `${info.bullet} [${info.checked ? 'x' : ' '}] `;
  }
  return `${info.bullet} `;
};

export function parseListLine(lineText: string): ParsedListLine | null {
  const taskMatch = TASK_LIST_RE.exec(lineText);
  if (taskMatch?.groups) {
    const { indent, bullet, check } = taskMatch.groups;
    const marker = taskMatch[0].slice(indent.length);
    const markerFrom = indent.length;
    return {
      kind: 'task',
      bullet: bullet as '-' | '+' | '*',
      checked: check === 'x' || check === 'X',
      indent,
      marker,
      markerFrom,
      markerTo: markerFrom + marker.length,
    };
  }

  const orderedMatch = ORDERED_LIST_RE.exec(lineText);
  if (orderedMatch?.groups) {
    const { indent, number } = orderedMatch.groups;
    const marker = orderedMatch[0].slice(indent.length);
    const markerFrom = indent.length;
    return {
      kind: 'ordered',
      orderedNumber: Number(number),
      indent,
      marker,
      markerFrom,
      markerTo: markerFrom + marker.length,
    };
  }

  const bulletMatch = BULLET_LIST_RE.exec(lineText);
  if (bulletMatch?.groups) {
    const { indent, bullet } = bulletMatch.groups;
    const marker = bulletMatch[0].slice(indent.length);
    const markerFrom = indent.length;
    return {
      kind: 'bullet',
      bullet: bullet as '-' | '+' | '*',
      indent,
      marker,
      markerFrom,
      markerTo: markerFrom + marker.length,
    };
  }

  return null;
}

export function isListLine(lineText: string): boolean {
  return parseListLine(lineText) !== null;
}

export function nextListMarker(info: ParsedListLine): string {
  if (info.kind === 'ordered') {
    const next = (info.orderedNumber ?? 1) + 1;
    return `${next}. `;
  }
  if (info.kind === 'task') {
    return `${info.bullet} [ ] `;
  }
  return getMarker(info);
}

export function listPrefix(
  info: ParsedListLine,
  options?: {
    indent?: string;
    orderedNumber?: number;
    keepTaskState?: boolean;
  },
): string {
  const nextIndent = options?.indent ?? info.indent;
  if (info.kind === 'ordered') {
    const value = options?.orderedNumber ?? info.orderedNumber ?? 1;
    return `${nextIndent}${value}. `;
  }

  if (info.kind === 'task') {
    const check = options?.keepTaskState ? (info.checked ? 'x' : ' ') : ' ';
    return `${nextIndent}${info.bullet} [${check}] `;
  }

  return `${nextIndent}${info.bullet} `;
}

export function indentUnitFromState(state: EditorState): string {
  return indentString(state, getIndentUnit(state));
}

export function adjustListIndent(
  indent: string,
  unit: string,
  direction: 'in' | 'out',
): string {
  if (direction === 'in') {
    return indent + unit;
  }

  if (indent.length === 0) {
    return '';
  }
  if (indent.startsWith(unit)) {
    return indent.slice(unit.length);
  }

  if (indent.startsWith('\t')) {
    return indent.slice(1);
  }

  const fallback = /^ +/.exec(indent)?.[0].length ?? 0;
  const remove = Math.min(unit.length || 1, fallback);
  return indent.slice(remove);
}
