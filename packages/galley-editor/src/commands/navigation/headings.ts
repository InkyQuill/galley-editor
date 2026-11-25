import { EditorSelection, type EditorState, type Text } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import type { SyntaxNode } from '@lezer/common';
import { GFM, parser } from '@lezer/markdown';

export interface GalleyHeading {
  readonly from: number;
  readonly to: number;
  readonly level: number;
  readonly text: string;
  readonly slug: string;
}

export interface GalleyViewport {
  readonly from: number;
  readonly to: number;
}

export interface RevealPositionOptions {
  align?: 'start' | 'center' | 'end' | 'nearest';
  select?: boolean;
  focus?: boolean;
}

const headingParser = parser.configure(GFM);
const outlines = new WeakMap<Text, readonly GalleyHeading[]>();
const hiddenInlineNodes = new Set([
  'HeaderMark', 'EmphasisMark', 'StrikethroughMark', 'CodeMark', 'LinkMark',
  'LinkLabel', 'LinkTitle', 'HTMLTag',
]);

export function slugifyHeading(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

const frontMatterKey = /^( *)(?:[\p{L}\p{M}\p{N}_.-]+(?:[ \t]+[\p{L}\p{M}\p{N}_.-]+)*|'(?:[^']|'')*'|"(?:[^"\\]|\\.)*")[ \t]*:(?:[ \t]|$)/u;

function frontMatterEnd(doc: Text): number {
  if (!/^\uFEFF?---[ \t]*$/.test(doc.line(1).text)) return 0;

  let mappingIndent: number | undefined;
  let acceptsIndentlessSequence = false;
  for (let number = 2; number <= doc.lines; number += 1) {
    const line = doc.line(number);
    if (/^(---|\.\.\.)[ \t]*$/.test(line.text)) {
      return mappingIndent !== undefined ? Math.min(line.to + 1, doc.length) : 0;
    }
    if (/^[ \t]*(?:#.*)?$/.test(line.text)) continue;
    const mapping = frontMatterKey.exec(line.text);
    if (mapping && (mappingIndent === undefined || mapping[1].length === mappingIndent)) {
      mappingIndent = mapping[1].length;
      // A YAML mapping can contain a sequence aligned with its key.
      acceptsIndentlessSequence = /^(?:#.*)?$/.test(line.text.slice(mapping[0].length).trimStart());
    } else if (mappingIndent === undefined || (!acceptsIndentlessSequence && /^-(?:[ \t]|$)/.test(line.text))) {
      return 0;
    }
  }

  return 0;
}

function displayText(node: SyntaxNode, source: string): string {
  if (hiddenInlineNodes.has(node.name)) return '';
  if (node.name === 'URL' && (node.parent?.name === 'Link' || node.parent?.name === 'Image')) return '';
  if (node.name === 'Escape') return source.slice(node.from + 1, node.to);

  let result = '';
  let position = node.from;
  for (let child = node.firstChild; child; child = child.nextSibling) {
    result += source.slice(position, child.from) + displayText(child, source);
    position = child.to;
  }

  return result + source.slice(position, node.to);
}

export function getHeadings(state: EditorState): readonly GalleyHeading[] {
  const { doc } = state;
  const cached = outlines.get(doc);
  if (cached) return cached;

  const offset = frontMatterEnd(doc);
  const source = doc.sliceString(offset);
  const headings: GalleyHeading[] = [];
  const usedSlugs = new Set<string>();
  const nextSuffix = new Map<string, number>();

  headingParser.parse(source).iterate({
    enter(node) {
      const level = /^ATXHeading([1-6])$/.exec(node.name);
      if (!level) return;

      const text = displayText(node.node, source).trim();
      const base = slugifyHeading(text);
      let slug = base;
      if (base) {
        let suffix = nextSuffix.get(base) ?? 1;
        while (usedSlugs.has(slug)) {
          slug = `${base}-${suffix++}`;
        }
        nextSuffix.set(base, suffix);
        usedSlugs.add(slug);
      }

      headings.push({
        from: offset + node.from,
        to: offset + node.to,
        level: Number(level[1]),
        text,
        slug,
      });
      return false;
    },
  });

  outlines.set(doc, headings);
  return headings;
}

export function getViewport(view: EditorView): GalleyViewport {
  const scroller = view.scrollDOM;
  const top = scroller.getBoundingClientRect().top + scroller.clientTop;
  const documentOffset = top - view.documentTop;
  return {
    from: view.lineBlockAtHeight(documentOffset).from,
    to: view.lineBlockAtHeight(documentOffset + Math.max(0, scroller.clientHeight - 1)).to,
  };
}

export function revealPosition(
  view: EditorView,
  position: number,
  { align = 'nearest', select = false, focus = false }: RevealPositionOptions = {},
): void {
  if (!Number.isInteger(position) || position < 0 || position > view.state.doc.length) return;

  view.dispatch({
    selection: select ? EditorSelection.cursor(position) : undefined,
    effects: EditorView.scrollIntoView(position, { y: align }),
  });
  if (focus) view.focus();
}
