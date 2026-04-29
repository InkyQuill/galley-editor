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

export function autosizeExtension(
  minRows: number,
  maxRows?: number,
): Extension {
  return ViewPlugin.define((view) => {
    let previousTargetHeight: number | null = null;
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
          const targetChanged =
            previousTargetHeight === null ||
            Math.abs(measure.targetHeight - previousTargetHeight) > 1;

          if (!targetChanged) return;

          const scroller = writeView.scrollDOM;
          scroller.style.minHeight = `${measure.minHeight}px`;
          scroller.style.maxHeight = maxRows ? `${measure.maxHeight}px` : '';
          scroller.style.height = `${measure.targetHeight}px`;
          scroller.style.overflowY = measure.overflowY;
          previousTargetHeight = measure.targetHeight;
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
