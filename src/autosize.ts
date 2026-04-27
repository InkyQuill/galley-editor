/**
 * Autosize extension for CodeMirror 6.
 *
 * Grows the editor to fit content between minRows and maxRows,
 * similar to react-textarea-autosize.
 */

import { EditorView } from '@codemirror/view';
import type { Extension } from '@codemirror/state';

/** Fallback line height when the view hasn't rendered yet. */
const DEFAULT_LINE_HEIGHT = 24;

export function autosizeExtension(
  minRows: number,
  maxRows?: number,
): Extension {
  return EditorView.updateListener.of((update) => {
    if (
      !update.docChanged &&
      !update.geometryChanged &&
      !update.viewportChanged
    ) {
      return;
    }

    const view = update.view;
    const lineHeight = view.defaultLineHeight || DEFAULT_LINE_HEIGHT;
    const contentHeight = view.contentDOM.scrollHeight;

    const minHeight = minRows * lineHeight;
    const maxHeight = maxRows ? maxRows * lineHeight : Infinity;
    const target = Math.min(Math.max(contentHeight, minHeight), maxHeight);

    const scroller = view.scrollDOM;
    scroller.style.minHeight = `${minHeight}px`;
    scroller.style.maxHeight = maxRows ? `${maxHeight}px` : '';
    scroller.style.height = `${target}px`;
    scroller.style.overflowY =
      maxRows && contentHeight > maxHeight ? 'auto' : 'hidden';
  });
}
