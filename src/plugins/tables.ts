import { Decoration } from '@codemirror/view';
import { makeBlockPlugin } from '../rendering';
import type { NeutrinoPlugin, NeutrinoClassNames } from '../types';

const tablesPlugin: NeutrinoPlugin = {
  id: 'ne:tables',
  extensions(classNames: NeutrinoClassNames) {
    const tableClass = classNames.table ?? 'ne-table';
    const lineDeco = Decoration.line({ class: tableClass });

    return makeBlockPlugin({
      createDecoration(node) {
        if (node.name !== 'Table') return null;
        return lineDeco;
      },
      getDecorationRange(node, state) {
        return [state.doc.lineAt(node.from).from];
      },
      hideWhenNearCursor: false, // Line classes always visible
    });
  },
};

export default tablesPlugin;
