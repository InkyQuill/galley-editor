import { EditorSelection, EditorState, type Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import { GFM } from '@lezer/markdown';

export function createEditorView(options: {
  doc: string;
  selection?: EditorSelection | { anchor: number; head?: number };
  extensions?: Extension[];
  parent?: HTMLElement;
}): EditorView {
  const parent = options.parent ?? document.body.appendChild(document.createElement('div'));
  const state = EditorState.create({
    doc: options.doc,
    selection: options.selection,
    extensions: [markdown({ extensions: [GFM] }), ...(options.extensions ?? [])],
  });

  return new EditorView({ state, parent });
}

export function destroyViews(views: EditorView[]) {
  for (const view of views) view.destroy();
  views.length = 0;
  document.body.replaceChildren();
}

export function lineElement(view: EditorView, lineNumber: number): HTMLElement {
  return view.dom.querySelectorAll('.cm-line').item(lineNumber - 1) as HTMLElement;
}
