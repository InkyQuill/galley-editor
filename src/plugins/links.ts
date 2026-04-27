import { Decoration } from '@codemirror/view';
import { HIDE_DECORATION, makeInlinePlugin } from '../rendering';
import type { NeutrinoPlugin, NeutrinoClassNames } from '../types';

const linksPlugin: NeutrinoPlugin = {
  id: 'ne:links',
  extensions(classNames: NeutrinoClassNames) {

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
      getRevealStrategy: () => 'select',
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
