/**
 * Autosize extension for CodeMirror 6.
 *
 * Grows the editor to fit content between minRows and maxRows,
 * similar to react-textarea-autosize.
 */

import type { Extension } from '@codemirror/state';
import { EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';

/** Fallback line height when the view hasn't rendered yet. */
const DEFAULT_LINE_HEIGHT = 24;

interface AutosizeMeasure {
  minHeight: number;
  maxHeight: number;
  targetHeight: number;
  overflowY: 'auto' | 'hidden';
}

interface AppliedAutosizeState {
  minHeight: string;
  maxHeight: string;
  height: string;
  targetHeight: number;
  overflowY: 'auto' | 'hidden';
}

export function autosizeExtension(
  minRows: number,
  maxRows?: number,
): Extension {
  return ViewPlugin.define((view) => {
    let applied: AppliedAutosizeState | null = null;
    const measureKey = {};

    function requestAutosize(measureView: EditorView): void {
      measureView.requestMeasure<AutosizeMeasure>({
        key: measureKey,
        read(readView) {
          const lineHeight = readView.defaultLineHeight || DEFAULT_LINE_HEIGHT;
          const contentHeight = readView.contentDOM.scrollHeight;

          const minHeight = minRows * lineHeight;
          const maxHeight = maxRows ? maxRows * lineHeight : Infinity;
          const targetHeight = Math.min(
            Math.max(contentHeight, minHeight),
            maxHeight,
          );

          return {
            minHeight,
            maxHeight,
            targetHeight,
            overflowY: maxRows && contentHeight > maxHeight ? 'auto' : 'hidden',
          };
        },
        write(measure, writeView) {
          const scroller = writeView.scrollDOM;
          const next: AppliedAutosizeState = {
            minHeight: `${measure.minHeight}px`,
            maxHeight: maxRows ? `${measure.maxHeight}px` : '',
            height: `${measure.targetHeight}px`,
            targetHeight: measure.targetHeight,
            overflowY: measure.overflowY,
          };

          if (applied === null) {
            scroller.style.minHeight = next.minHeight;
            scroller.style.maxHeight = next.maxHeight;
            scroller.style.height = next.height;
            scroller.style.overflowY = next.overflowY;
            applied = next;
            return;
          }

          if (applied.minHeight !== next.minHeight) {
            scroller.style.minHeight = next.minHeight;
            applied.minHeight = next.minHeight;
          }

          if (applied.maxHeight !== next.maxHeight) {
            scroller.style.maxHeight = next.maxHeight;
            applied.maxHeight = next.maxHeight;
          }

          if (Math.abs(measure.targetHeight - applied.targetHeight) > 1) {
            scroller.style.height = next.height;
            applied.height = next.height;
            applied.targetHeight = next.targetHeight;
          }

          if (applied.overflowY !== next.overflowY) {
            scroller.style.overflowY = next.overflowY;
            applied.overflowY = next.overflowY;
          }
        },
      });
    }

    requestAutosize(view);

    return {
      update(update: ViewUpdate) {
        if (
          !update.docChanged &&
          !update.geometryChanged &&
          !update.viewportChanged
        ) {
          return;
        }

        requestAutosize(update.view);
      },
    };
  });
}
