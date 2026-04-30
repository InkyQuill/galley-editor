import { Decoration } from '@codemirror/view';
import { HIDE_DECORATION, makeInlinePlugin } from '../rendering';
import type { GalleyPlugin, GalleyClassNames } from '../types';

const codeInlinePlugin: GalleyPlugin = {
  id: 'ge:code-inline',
  extensions(classNames: GalleyClassNames, context) {
    const revealStrategy = context?.mode === 'preview' ? false : 'active';

    // Hide backtick marks with 'active' reveal
    const markExt = makeInlinePlugin({
      createDecoration(node) {
        if (node.name === 'CodeMark') {
          // Only hide inline code marks, not fenced code marks
          if (node.node.parent?.name === 'FencedCode') return null;
          return HIDE_DECORATION;
        }
        return null;
      },
      getRevealStrategy: () => revealStrategy,
    });

    // Add semantic class to inline code spans
    const classExt = makeInlinePlugin({
      createDecoration(node) {
        if (node.name === 'InlineCode') {
          return Decoration.mark({
            class: classNames.inlineCode ?? 'ge-code-inline',
          });
        }
        return null;
      },
      getRevealStrategy: () => false,
      hideWhenNearCursor: false,
    });

    return [markExt, classExt];
  },
};

export default codeInlinePlugin;
