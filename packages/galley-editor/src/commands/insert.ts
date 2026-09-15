import { EditorSelection, type SelectionRange } from '@codemirror/state';
import type { CommandFn } from '../types';

export const insertLink: CommandFn = (view, label = '', url = '') => {
  const linkText = label === '' ? `[](${url})` : `[${label}](${url})`;
  const cursorOffset = label === '' ? 1 : linkText.length;
  view.dispatch({
    ...view.state.changeByRange((sel: SelectionRange) => ({
      changes: { from: sel.from, to: sel.to, insert: linkText },
      range: EditorSelection.cursor(sel.from + cursorOffset),
    })),
  });
  return true;
};

export const insertImage: CommandFn = (view, alt = '', url = '') => {
  const imageText = `![${alt}](${url})`;
  view.dispatch(
    view.state.changeByRange((sel) => ({
      changes: { from: sel.from, to: sel.to, insert: imageText },
      range: EditorSelection.cursor(sel.from + imageText.length),
    })),
  );
  return true;
};

export const insertCodeBlock: CommandFn = (view, language = '') => {
  const open = `\`\`\`${language}\n`;
  const text = `${open}\n\`\`\``;
  const cursorOffset = open.length;
  view.dispatch(
    view.state.changeByRange((sel) => ({
      changes: { from: sel.from, to: sel.to, insert: text },
      range: EditorSelection.cursor(sel.from + cursorOffset),
    })),
  );
  return true;
};

export const insertTable: CommandFn = (view) => {
  const tableText =
    '\n| Header | Header |\n|--------|--------|\n|        |        |\n';
  const cursorOffset = '\n| '.length;
  view.dispatch(
    view.state.changeByRange((sel) => ({
      changes: { from: sel.from, to: sel.to, insert: tableText },
      range: EditorSelection.cursor(sel.from + cursorOffset),
    })),
  );
  return true;
};

export const insertHr: CommandFn = (view) => {
  const line = view.state.doc.lineAt(view.state.selection.main.to);
  const needsNewLine = line.text.trim() !== '';
  const insert = needsNewLine ? '\n---\n' : '---\n';
  const cursorOffset = insert.length;
  view.dispatch({
    changes: { from: line.to, insert },
    selection: EditorSelection.cursor(line.to + cursorOffset),
  });
  return true;
};
