import { Decoration } from '@codemirror/view';
import { HIDE_DECORATION, makeBlockPlugin, makeInlinePlugin } from '../rendering';
import type { NeutrinoPlugin, NeutrinoClassNames } from '../types';

const blockquotePlugin: NeutrinoPlugin = {
  id: 'ne:blockquote',
  extensions(classNames: NeutrinoClassNames, context) {
    const blockClass = classNames.blockQuote ?? 'ne-blockquote';
    const lineDeco = Decoration.line({ class: blockClass });
    const revealStrategy = context?.mode === 'preview' ? false : 'line';

    // Block-level: add line decorations to blockquote lines
    const blockExt = makeBlockPlugin({
      createDecoration(node) {
        if (node.name !== 'Blockquote') return null;
        return lineDeco;
      },
      getDecorationRange(node, state) {
        const line = state.doc.lineAt(node.from);
        return [line.from];
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
