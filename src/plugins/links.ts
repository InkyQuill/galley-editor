import { Decoration } from '@codemirror/view';
import type { EditorState } from '@codemirror/state';
import { HIDE_DECORATION, makeInlinePlugin } from '../rendering';
import type { NeutrinoPlugin, NeutrinoClassNames } from '../types';

function selectionIntersects(from: number, to: number, state: EditorState): boolean {
  return state.selection.ranges.some((range) => range.from <= to && range.to >= from);
}

const linksPlugin: NeutrinoPlugin = {
  id: 'ne:links',
  extensions(classNames: NeutrinoClassNames, context) {
    const preview = context?.mode === 'preview';

    // Hide URL and link marks with 'select' reveal (only reveal when cursor overlaps)
    const markExt = makeInlinePlugin({
      createDecoration(node, state) {
        const parent = node.node.parent;
        if (!parent) return null;

        if (node.name === 'LinkMark' && parent.name === 'Link') {
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
      createDecoration(node) {
        if (node.name === 'Link') {
          return Decoration.mark({ class: classNames.link ?? 'ne-link' });
        }
        return null;
      },
      getRevealStrategy: () => false,
      hideWhenNearCursor: false,
    });

    return [markExt, classExt];
  },
};

export default linksPlugin;
