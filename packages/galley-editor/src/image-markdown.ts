import { syntaxTree } from '@codemirror/language';
import type { EditorState, SelectionRange } from '@codemirror/state';
import type { GalleyImageInfo, GalleyImageMetadataInput } from './types';

interface ParsedAttrs {
  width?: number;
  height?: number;
  rest: string[];
}

function parseAttrs(attrs: string | undefined): ParsedAttrs {
  const rest: string[] = [];
  const result: ParsedAttrs = { rest };
  if (!attrs) return result;

  for (const part of attrs.slice(1, -1).trim().split(/\s+/).filter(Boolean)) {
    const separatorIndex = part.indexOf('=');
    const key = separatorIndex === -1 ? part : part.slice(0, separatorIndex);
    const value = separatorIndex === -1 ? undefined : part.slice(separatorIndex + 1);
    const numeric = Number(value);

    if (key === 'width' && value !== undefined && value !== '' && Number.isFinite(numeric)) {
      result.width = numeric;
    } else if (key === 'height' && value !== undefined && value !== '' && Number.isFinite(numeric)) {
      result.height = numeric;
    } else {
      rest.push(part);
    }
  }

  return result;
}

function splitImageMarkdown(raw: string): {
  alt: string;
  target: string;
  attrs?: string;
} | null {
  if (!raw.startsWith('![')) return null;

  const altEnd = raw.indexOf('](', 2);
  if (altEnd === -1) return null;

  const alt = raw.slice(2, altEnd);
  const targetStart = altEnd + 2;
  let image = raw;
  let attrs: string | undefined;

  if (raw.endsWith('}')) {
    const attrsStart = raw.lastIndexOf('{');
    if (attrsStart !== -1 && raw.slice(attrsStart).match(/^\{[^}]*\}$/)) {
      const imagePart = raw.slice(0, attrsStart);
      if (imagePart.endsWith(')')) {
        image = imagePart;
        attrs = raw.slice(attrsStart);
      }
    }
  }

  if (!image.endsWith(')')) return null;

  const target = image.slice(targetStart, -1).trim();
  if (!target) return null;

  return { alt, target, attrs };
}

function splitTitle(target: string): { url: string; title?: string } {
  const titleMatch =
    /^(?<url>.+?)\s+"(?<title>[^"]*)"$/.exec(target) ??
    /^(?<url>.+?)\s+'(?<title>[^']*)'$/.exec(target) ??
    /^(?<url>.+?)\s+\((?<title>[^)]*)\)$/.exec(target);
  if (!titleMatch?.groups) return { url: target };

  const title = titleMatch.groups.title;
  return {
    url: titleMatch.groups.url,
    ...(title ? { title } : {}),
  };
}

export function imageTrailingAttrsLength(state: EditorState, to: number): number {
  const line = state.doc.lineAt(to);
  const afterImage = state.sliceDoc(to, line.to);
  return afterImage.match(/^\{[^}\n]*\}/)?.[0].length ?? 0;
}

function imageEndIsSelectable(state: EditorState, to: number): boolean {
  const line = state.doc.lineAt(to);
  if (to === line.to) return true;

  return /\s/.test(state.sliceDoc(to, Math.min(to + 1, state.doc.length)));
}

function selectionRangeIntersectsImage(
  state: EditorState,
  selection: SelectionRange,
  from: number,
  to: number,
): boolean {
  if (selection.empty) {
    return selection.head >= from && (
      selection.head < to ||
      (selection.head === to && imageEndIsSelectable(state, to))
    );
  }

  return selection.from < to && selection.to > from;
}

export function imageRangeIntersectsSelection(
  state: EditorState,
  from: number,
  to: number,
): boolean {
  return state.selection.ranges.some((range) =>
    selectionRangeIntersectsImage(state, range, from, to),
  );
}

export function parseImageMarkdown(
  raw: string,
  from = 0,
  to = raw.length,
): GalleyImageInfo | null {
  const parsed = splitImageMarkdown(raw);
  if (!parsed) return null;

  const { width, height, rest } = parseAttrs(parsed.attrs);
  const { url, title } = splitTitle(parsed.target);

  return {
    alt: parsed.alt,
    url,
    ...(title ? { title } : {}),
    ...(width !== undefined ? { width } : {}),
    ...(height !== undefined ? { height } : {}),
    ...(rest.length > 0 ? { attrs: rest } : {}),
    raw,
    from,
    to,
  };
}

export function serializeImageMarkdown(
  image: GalleyImageInfo,
  patch: GalleyImageMetadataInput = {},
): string {
  const alt = patch.alt ?? image.alt;
  const url = patch.url ?? image.url;
  const title = patch.title === undefined ? image.title : patch.title;
  const width = patch.width === undefined ? image.width : patch.width;
  const height = patch.height === undefined ? image.height : patch.height;
  const titleSuffix = title ? ` "${title}"` : '';
  const attrs = [
    ...(image.attrs ?? []),
    typeof width === 'number' && Number.isFinite(width) ? `width=${width}` : null,
    typeof height === 'number' && Number.isFinite(height) ? `height=${height}` : null,
  ].filter((part): part is string => part !== null);

  return `![${alt}](${url}${titleSuffix})${attrs.length > 0 ? `{${attrs.join(' ')}}` : ''}`;
}

export function imageAtSelection(state: EditorState): GalleyImageInfo | null {
  const selection = state.selection.main;
  const line = state.doc.lineAt(selection.head);
  let found: GalleyImageInfo | null = null;

  syntaxTree(state).iterate({
    from: line.from,
    to: line.to,
    enter(node) {
      if (found) return false;
      if (node.name !== 'Image') return;

      const to = node.to + imageTrailingAttrsLength(state, node.to);
      if (!selectionRangeIntersectsImage(state, selection, node.from, to)) return false;

      found = parseImageMarkdown(state.sliceDoc(node.from, to), node.from, to);
      return false;
    },
  });

  return found;
}
