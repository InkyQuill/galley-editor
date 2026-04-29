import { afterEach, describe, expect, it } from 'vitest';
import { EditorSelection } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import { createEditorView, destroyViews, lineElement } from '../test-utils/editor';
import { resolveClassNames } from '../types';
import imagesPlugin from './images';

const views: EditorView[] = [];

afterEach(() => {
  destroyViews(views);
});

describe('imagesPlugin', () => {
  it('renders an inactive png markdown image as an image widget', () => {
    const doc = '![Sample PNG](assets/img.png)\n\nplain';
    const view = createEditorView({
      doc,
      selection: EditorSelection.cursor(doc.indexOf('plain')),
      extensions: imagesPlugin.extensions(resolveClassNames()),
    });
    views.push(view);

    const image = view.dom.querySelector('.ne-image-widget img');
    expect(image).toBeInstanceOf(HTMLImageElement);
    expect(image?.getAttribute('alt')).toBe('Sample PNG');
    expect(image?.getAttribute('src')).toBe('assets/img.png');
  });

  it('renders an inactive svg markdown image as an image widget', () => {
    const doc = '![Sample SVG](sample-diagram.svg)\n\nplain';
    const view = createEditorView({
      doc,
      selection: EditorSelection.cursor(doc.indexOf('plain')),
      extensions: imagesPlugin.extensions(resolveClassNames()),
    });
    views.push(view);

    const image = view.dom.querySelector('.ne-image-widget img');
    expect(image).toBeInstanceOf(HTMLImageElement);
    expect(image?.getAttribute('alt')).toBe('Sample SVG');
    expect(image?.getAttribute('src')).toBe('sample-diagram.svg');
  });

  it('shows raw image markdown when the cursor is inside the image syntax', () => {
    const doc = '![Sample PNG](assets/img.png)\n\nplain';
    const view = createEditorView({
      doc,
      selection: EditorSelection.cursor(3),
      extensions: imagesPlugin.extensions(resolveClassNames()),
    });
    views.push(view);

    expect(view.dom.querySelector('.ne-image-widget')).toBeNull();
    expect(lineElement(view, 1).textContent).toBe('![Sample PNG](assets/img.png)');
  });
});
