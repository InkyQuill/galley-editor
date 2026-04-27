import { Decoration } from '@codemirror/view';
import { HIDE_DECORATION, makeInlinePlugin } from '../rendering';
import type { NeutrinoPlugin, NeutrinoClassNames } from '../types';

const headingsPlugin: NeutrinoPlugin = {
  id: 'ne:headings',
  extensions(classNames: NeutrinoClassNames) {

    // Hide header marks (##) with 'active' reveal
    const headerMarkExt = makeInlinePlugin({
      createDecoration(node) {
        if (node.name !== 'HeaderMark') return null;
        return HIDE_DECORATION;
      },
      getDecorationRange(node, state) {
        // Include the space after the header mark
        if (state.doc.sliceString(node.to, node.to + 1) === ' ') {
          return [node.from, node.to + 1];
        }
        return null;
      },
      getRevealStrategy: () => 'active',
    });

    // Add heading line classes
    const headingLineExt = makeInlinePlugin({
      createDecoration(node) {
        const levelMatch = node.name.match(/^ATXHeading(\d)$/);
        if (!levelMatch) return null;
        const level = parseInt(levelMatch[1], 10);
        const levelClasses: Record<number, string> = {
          1: classNames.h1 ?? 'ne-h1',
          2: classNames.h2 ?? 'ne-h2',
          3: classNames.h3 ?? 'ne-h3',
          4: classNames.h4 ?? 'ne-h4',
          5: classNames.h5 ?? 'ne-h5',
          6: classNames.h6 ?? 'ne-h6',
        };
        const cls = [classNames.heading ?? 'ne-heading', levelClasses[level] ?? '']
          .filter(Boolean)
          .join(' ');
        return Decoration.line({ class: cls });
      },
      getDecorationRange(node, state) {
        const line = state.doc.lineAt(node.from);
        return [line.from];
      },
      getRevealStrategy: () => false, // Line classes are always visible
      hideWhenNearCursor: false,
    });

    return [headerMarkExt, headingLineExt];
  },
};

export default headingsPlugin;
