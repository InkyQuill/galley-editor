import { Decoration } from '@codemirror/view';
import { HIDE_DECORATION, makeInlinePlugin } from '../rendering';
import type { GalleyPlugin, GalleyClassNames } from '../types';

const emphasisPlugin: GalleyPlugin = {
  id: 'ge:emphasis',
  extensions(classNames: GalleyClassNames, context) {
    const revealStrategy = context?.mode === 'preview' ? false : 'active';

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
      getRevealStrategy: () => revealStrategy,
    });

    // Add semantic classes to formatted spans
    const classExt = makeInlinePlugin({
      createDecoration(node) {
        if (node.name === 'StrongEmphasis') {
          return Decoration.mark({ class: classNames.bold ?? 'ge-bold' });
        }
        if (node.name === 'Emphasis') {
          return Decoration.mark({ class: classNames.italic ?? 'ge-italic' });
        }
        if (node.name === 'Strikethrough') {
          return Decoration.mark({
            class: classNames.strikethrough ?? 'ge-strikethrough',
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
