import type { EditorView } from '@codemirror/view';
import type { FindOpts, FindResult } from '../../types';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isWordChar(value: string): boolean {
  return /[\p{L}\p{N}_]/u.test(value);
}

function isWholeWordMatch(source: string, from: number, to: number): boolean {
  const before = from > 0 ? source[from - 1] : '';
  const after = to < source.length ? source[to] : '';
  return (!before || !isWordChar(before)) && (!after || !isWordChar(after));
}

export function findInDocument(
  view: EditorView,
  needle: string,
  opts: FindOpts = {},
): FindResult[] {
  if (!needle) return [];

  const source = view.state.doc.toString();
  const flags = `g${opts.caseSensitive ? '' : 'i'}`;
  let pattern: RegExp;

  try {
    pattern = new RegExp(opts.regex ? needle : escapeRegExp(needle), flags);
  } catch {
    return [];
  }

  const results: FindResult[] = [];
  for (const match of source.matchAll(pattern)) {
    const text = match[0];
    if (text.length === 0 || match.index === undefined) continue;
    const from = match.index;
    const to = from + text.length;
    if (opts.wholeWord && !isWholeWordMatch(source, from, to)) continue;
    results.push({ from, to, line: view.state.doc.lineAt(from).number });
  }

  return results;
}
