import { Decoration, type DecorationSet, EditorView } from '@codemirror/view';
import { type EditorState, type Range, StateField } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import { BLOCK_CURSOR_LINE_PROXIMITY } from '../rendering';
import type { NeutrinoPlugin, NeutrinoClassNames } from '../types';

/**
 * Code fence plugin using a custom StateField to emit per-line decorations
 * for every line in a FencedCode block.
 */

function buildCodeFenceDecorations(state: EditorState, blockClass: string): DecorationSet {
  const doc = state.doc;
  const cursorLine = doc.lineAt(state.selection.main.anchor);
  const widgets: Range<Decoration>[] = [];
  const lineDeco = Decoration.line({ class: blockClass });

  syntaxTree(state).iterate({
    enter: (node) => {
      if (node.name !== 'FencedCode') return;

      const nodeLineFrom = doc.lineAt(node.from);
      const nodeLineTo = doc.lineAt(node.to);

      // Hide when cursor is near the block
      const isNear =
        Math.abs(nodeLineFrom.number - cursorLine.number) <= BLOCK_CURSOR_LINE_PROXIMITY ||
        Math.abs(nodeLineTo.number - cursorLine.number) <= BLOCK_CURSOR_LINE_PROXIMITY;

      // Check if cursor is inside the block
      const sel = state.selection.main;
      const isInside =
        (sel.from >= node.from && sel.from <= node.to) ||
        (sel.to >= node.from && sel.to <= node.to);

      if (isNear || isInside) return;

      // Apply line decoration to every line in the fenced code block
      for (let lineNum = nodeLineFrom.number; lineNum <= nodeLineTo.number; lineNum++) {
        const line = doc.line(lineNum);
        widgets.push(lineDeco.range(line.from));
      }
    },
  });

  return Decoration.set(widgets, true);
}

const codeFencePlugin: NeutrinoPlugin = {
  id: 'ne:code-fence',
  extensions(classNames: NeutrinoClassNames) {
    const blockClass = classNames.blockCode ?? 'ne-code-fence';

    const field = StateField.define<DecorationSet>({
      create(state) {
        return buildCodeFenceDecorations(state, blockClass);
      },
      update(decos, tr) {
        decos = decos.map(tr.changes);
        const selectionChanged = !tr.newSelection.eq(tr.startState.selection);
        const treeChanged = syntaxTree(tr.state) !== syntaxTree(tr.startState);

        if (tr.docChanged || selectionChanged || treeChanged) {
          decos = buildCodeFenceDecorations(tr.state, blockClass);
        }
        return decos;
      },
      provide: (f) => EditorView.decorations.from(f),
    });

    return [field];
  },
};

export default codeFencePlugin;
