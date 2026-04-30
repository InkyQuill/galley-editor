import { Decoration, EditorView } from '@codemirror/view';
import { StateField } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import type { EditorState } from '@codemirror/state';
import type { SyntaxNodeRef } from '@lezer/common';
import { HIDE_DECORATION, makeInlinePlugin } from '../rendering';
import type {
  LinkClickHandler,
  GalleyPlugin,
  GalleyClassNames,
} from '../types';

interface LinkDefinition {
  url: string;
  title?: string;
}

function normalizeLabel(label: string): string {
  return label
    .replace(/^\[/, '')
    .replace(/\]$/, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function selectionIntersects(from: number, to: number, state: EditorState): boolean {
  return state.selection.ranges.some((range) => range.from <= to && range.to >= from);
}

function collectLinkDefinitions(state: EditorState): Map<string, LinkDefinition> {
  const definitions = new Map<string, LinkDefinition>();

  for (let lineNumber = 1; lineNumber <= state.doc.lines; lineNumber++) {
    const line = state.doc.line(lineNumber);
    const match = /^\s*\[([^\]]+)\]:\s+(\S+)(?:\s+"([^"]+)")?\s*$/.exec(line.text);
    if (!match) continue;
    definitions.set(normalizeLabel(match[1]), {
      url: match[2],
      ...(match[3] ? { title: match[3] } : {}),
    });
  }

  return definitions;
}

export const linkRegistryField = StateField.define<Map<string, LinkDefinition>>({
  create: collectLinkDefinitions,
  update(value, transaction) {
    if (!transaction.docChanged) return value;
    return collectLinkDefinitions(transaction.state);
  },
});

function linkLabelForNode(state: EditorState, node: SyntaxNodeRef): string | null {
  const explicitLabel = node.node.getChild('LinkLabel');
  if (explicitLabel) {
    return normalizeLabel(state.sliceDoc(explicitLabel.from, explicitLabel.to));
  }

  const marks = node.node.getChildren('LinkMark');
  const open = marks[0];
  if (!open) return null;
  const close = marks.find(
    (mark) => mark.from > open.from && state.sliceDoc(mark.from, mark.to) === ']',
  );
  if (!close) return null;
  return normalizeLabel(state.sliceDoc(open.to, close.from));
}

function resolveLinkUrl(state: EditorState, from: number, to: number): string | null {
  let resolved: string | null = null;

  syntaxTree(state).iterate({
    from,
    to,
    enter(node) {
      if (resolved || node.name !== 'Link') return;

      const url = node.node.getChild('URL');
      if (url) {
        resolved = state.sliceDoc(url.from, url.to);
        return;
      }

      const label = linkLabelForNode(state, node);
      if (!label) return;
      const definition = state.field(linkRegistryField, false)?.get(label);
      resolved = definition?.url ?? null;
    },
  });

  return resolved;
}

export function openResolvedLink(
  url: string,
  event: MouseEvent,
  onLinkClick?: LinkClickHandler,
): void {
  const handled = onLinkClick?.(url, event);
  if (handled === true) return;
  window.open(url, '_blank', 'noopener,noreferrer');
}

function shouldActivateLink(event: MouseEvent): boolean {
  return event.metaKey || event.ctrlKey;
}

const linksPlugin: GalleyPlugin = {
  id: 'ge:links',
  extensions(classNames: GalleyClassNames, context) {
    const preview = context?.mode === 'preview';
    const linkClass = classNames.link ?? 'ge-link';
    const linkSelectorClass = linkClass.split(/\s+/).find(Boolean) ?? 'ge-link';

    // Hide URL and link marks with 'select' reveal (only reveal when cursor overlaps)
    const markExt = makeInlinePlugin({
      createDecoration(node, state) {
        const parent = node.node.parent;
        if (!parent) return null;

        if (node.name === 'LinkMark' && parent.name === 'Link') {
          return HIDE_DECORATION;
        }

        if (node.name === 'LinkLabel' && parent.name === 'Link') {
          return HIDE_DECORATION;
        }

        if (node.name === 'URL' && parent.name === 'Link') {
          // Only hide URLs that come after the closing ]
          const closingBrackets = parent.getChildren('LinkMark').filter(
            (mark) => state.sliceDoc(mark.from, mark.to) === ']',
          );
          const lastBracket = closingBrackets[closingBrackets.length - 1];
          if (!lastBracket || node.from < lastBracket.from) return null;
          return HIDE_DECORATION;
        }

        return null;
      },
      getRevealStrategy: (node, state) => {
        if (preview) return false;
        const parent = node.node.parent;
        if (!parent || parent.name !== 'Link') return 'select';
        return selectionIntersects(parent.from, parent.to, state);
      },
    });

    // Add semantic class to the link span
    const classExt = makeInlinePlugin({
      createDecoration(node, state) {
        if (node.name === 'Link') {
          const url = resolveLinkUrl(state, node.from, node.to);
          return Decoration.mark({
            class: linkClass,
            attributes: url ? { 'data-ge-url': url } : {},
          });
        }
        return null;
      },
      getRevealStrategy: () => false,
      hideWhenNearCursor: false,
    });

    const referenceDefinitionExt = makeInlinePlugin({
      createDecoration(node) {
        if (node.name !== 'LinkReference') return null;
        return HIDE_DECORATION;
      },
      getMarkRange(node, state) {
        const line = state.doc.lineAt(node.from);
        return { from: line.from, to: line.to };
      },
      getRevealStrategy: () => preview ? false : 'line',
    });

    const clickExt = EditorView.domEventHandlers({
      click: (event) => {
        if (!shouldActivateLink(event)) return false;
        const target = event.target as Element | null;
        const link = target?.closest(`.${linkSelectorClass}`);
        if (!link) return false;
        const url = link.getAttribute('data-ge-url');
        if (!url) return false;

        event.preventDefault();
        openResolvedLink(url, event, context?.onLinkClick);
        return true;
      },
    });

    return [
      linkRegistryField,
      markExt,
      classExt,
      referenceDefinitionExt,
      clickExt,
    ];
  },
};

export default linksPlugin;
