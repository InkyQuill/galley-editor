import { Decoration } from '@codemirror/view';
import { HIDE_DECORATION, makeInlinePlugin } from '../rendering';
import type { NeutrinoPlugin, NeutrinoClassNames } from '../types';

const emphasisPlugin: NeutrinoPlugin = {
  id: 'ne:emphasis',
  extensions(classNames: NeutrinoClassNames) {

    // Hide emphasis marks (*, **, ~~) with 'active' reveal
    const markExt = makeInlinePlugin({
      createDecoration(node) {
        if (
          node.name === 'EmphasisMark' ||
          node.name === 'StrikethroughMark'
        ) {
          return HIDE_DECORATION;
        }
        return null;
      },
      getRevealStrategy: () => 'active',
    });

    // Add semantic classes to formatted spans
    const classExt = makeInlinePlugin({
      createDecoration(node) {
        if (node.name === 'StrongEmphasis') {
          return Decoration.mark({ class: classNames.bold ?? 'ne-bold' });
        }
        if (node.name === 'Emphasis') {
          return Decoration.mark({ class: classNames.italic ?? 'ne-italic' });
        }
        if (node.name === 'Strikethrough') {
          return Decoration.mark({
            class: classNames.strikethrough ?? 'ne-strikethrough',
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

export default emphasisPlugin;
