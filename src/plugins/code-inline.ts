import { Decoration } from '@codemirror/view';
import { HIDE_DECORATION, makeInlinePlugin } from '../rendering';
import type { NeutrinoPlugin, NeutrinoClassNames } from '../types';

const codeInlinePlugin: NeutrinoPlugin = {
  id: 'ne:code-inline',
  extensions(classNames: NeutrinoClassNames) {

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
      getRevealStrategy: () => 'active',
    });

    // Add semantic class to inline code spans
    const classExt = makeInlinePlugin({
      createDecoration(node) {
        if (node.name === 'InlineCode') {
          return Decoration.mark({
            class: classNames.inlineCode ?? 'ne-code-inline',
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
