import { RangeSetBuilder, StateField } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView } from '@codemirror/view';

const bidiLineDecoration = Decoration.line({
  attributes: { dir: 'auto' },
});

function buildBidiDecorations(doc: { lines: number; line(n: number): { from: number } }): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  for (let lineNumber = 1; lineNumber <= doc.lines; lineNumber++) {
    builder.add(doc.line(lineNumber).from, doc.line(lineNumber).from, bidiLineDecoration);
  }
  return builder.finish();
}

export const biDirectionalTextExtension = StateField.define<DecorationSet>({
  create(state) {
    return buildBidiDecorations(state.doc);
  },
  update(decorations, transaction) {
    if (!transaction.docChanged) return decorations.map(transaction.changes);
    return buildBidiDecorations(transaction.state.doc);
  },
  provide: (field) => EditorView.decorations.from(field),
});
