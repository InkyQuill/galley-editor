import { Decoration } from '@codemirror/view';
import { HIDE_DECORATION, makeInlinePlugin } from '../rendering';
import type { GalleyPlugin, GalleyClassNames } from '../types';

const headingsPlugin: GalleyPlugin = {
  id: 'ge:headings',
  extensions(classNames: GalleyClassNames, context) {
    const revealStrategy = context?.mode === 'preview' ? false : 'active';

    // Hide header marks (##) with 'active' reveal
    const headerMarkExt = makeInlinePlugin({
      createDecoration(node) {
        if (node.name !== 'HeaderMark') return null;
        return HIDE_DECORATION;
      },
      getMarkRange(node, state) {
        // Include the space after the header mark
        if (state.doc.sliceString(node.to, node.to + 1) === ' ') {
          return { from: node.from, to: node.to + 1 };
        }
        return null;
      },
      getRevealStrategy: () => revealStrategy,
    });

    // Add heading line classes
    const headingLineExt = makeInlinePlugin({
      createDecoration(node) {
        const levelMatch = node.name.match(/^ATXHeading(\d)$/);
        if (!levelMatch) return null;
        const level = parseInt(levelMatch[1], 10);
        const levelClasses: Record<number, string> = {
          1: classNames.h1 ?? 'ge-h1',
          2: classNames.h2 ?? 'ge-h2',
          3: classNames.h3 ?? 'ge-h3',
          4: classNames.h4 ?? 'ge-h4',
          5: classNames.h5 ?? 'ge-h5',
          6: classNames.h6 ?? 'ge-h6',
        };
        const cls = [classNames.heading ?? 'ge-heading', levelClasses[level] ?? '']
          .filter(Boolean)
          .join(' ');
        return Decoration.line({ class: cls });
      },
      getLineRange(node, state) {
        const line = state.doc.lineAt(node.from);
        return { from: line.from, to: line.to };
      },
      getRevealStrategy: () => false, // Line classes are always visible
      hideWhenNearCursor: false,
    });

    return [headerMarkExt, headingLineExt];
  },
};

export default headingsPlugin;
