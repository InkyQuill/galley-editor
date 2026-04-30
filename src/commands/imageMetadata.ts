import type { EditorView } from '@codemirror/view';
import { imageAtSelection, serializeImageMarkdown } from '../image-markdown';
import type { GalleyImageMetadataInput } from '../types';

export function updateImageMetadata(
  view: EditorView,
  input: GalleyImageMetadataInput,
): boolean {
  const image = imageAtSelection(view.state);
  if (!image) return false;

  const next = serializeImageMarkdown(image, input);
  view.dispatch({
    changes: { from: image.from, to: image.to, insert: next },
    selection: { anchor: image.from + next.length },
    scrollIntoView: true,
  });
  return true;
}

export function clearImageDimensions(view: EditorView): boolean {
  return updateImageMetadata(view, { width: null, height: null });
}
