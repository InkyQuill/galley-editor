import { Decoration } from '@codemirror/view';
import { HIDE_DECORATION, makeBlockPlugin, makeInlinePlugin } from '../rendering';
import type { GalleyPlugin, GalleyClassNames } from '../types';

const blockquotePlugin: GalleyPlugin = {
  id: 'ge:blockquote',
  extensions(classNames: GalleyClassNames, context) {
    const blockClass = classNames.blockQuote ?? 'ge-blockquote';
    const lineDeco = Decoration.line({ class: blockClass });
    const revealStrategy = context?.mode === 'preview' ? false : 'line';

    // Block-level: add line decorations to blockquote lines
    const blockExt = makeBlockPlugin({
      createDecoration(node) {
        if (node.name !== 'Blockquote') return null;
        return lineDeco;
      },
      getLineRange(node) {
        return { from: node.from, to: node.to };
      },
      hideWhenNearCursor: false, // Line classes always visible
    });

    // Inline: hide QuoteMark (>) with 'line' reveal
    const markExt = makeInlinePlugin({
      createDecoration(node) {
        if (node.name === 'QuoteMark') {
          return HIDE_DECORATION;
        }
        return null;
      },
      getRevealStrategy: () => revealStrategy,
    });

    return [...blockExt, markExt];
  },
};

export default blockquotePlugin;
