import { afterEach, describe, expect, it, vi } from 'vitest';
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
  it('renders inactive markdown images as safe alt text by default', () => {
    const doc = '![Sample PNG](assets/img.png)\n\nplain';
    const view = createEditorView({
      doc,
      selection: EditorSelection.cursor(doc.indexOf('plain')),
      extensions: imagesPlugin.extensions(resolveClassNames()),
    });
    views.push(view);

    expect(view.dom.querySelector('.ne-image-widget img')).toBeNull();
    expect(lineElement(view, 1).textContent).toBe('Sample PNG');
  });

  it('renders svg markdown images as safe alt text by default', () => {
    const doc = '![Sample SVG](sample-diagram.svg)\n\nplain';
    const view = createEditorView({
      doc,
      selection: EditorSelection.cursor(doc.indexOf('plain')),
      extensions: imagesPlugin.extensions(resolveClassNames()),
    });
    views.push(view);

    expect(view.dom.querySelector('.ne-image-widget img')).toBeNull();
    expect(lineElement(view, 1).textContent).toBe('Sample SVG');
  });

  it('renders data-uri svg markdown images with parentheses in urls', () => {
    const renderer = vi.fn(({ alt, url }: { alt: string; url: string }) => {
      const image = document.createElement('img');
      image.alt = alt;
      image.src = url;
      return image;
    });
    const dataUrl = "data:image/svg+xml,%3csvg%3e%3crect%20fill='url(%23sky)'/%3e%3c/svg%3e";
    const doc = `![Sample SVG](${dataUrl})\n\nplain`;
    const view = createEditorView({
      doc,
      selection: EditorSelection.cursor(doc.indexOf('plain')),
      extensions: imagesPlugin.extensions(resolveClassNames(), {
        theme: 'light',
        imageRenderer: renderer,
      }),
    });
    views.push(view);

    const image = view.dom.querySelector('.ne-image-widget img');
    expect(image).toBeInstanceOf(HTMLImageElement);
    expect(image?.getAttribute('alt')).toBe('Sample SVG');
    expect(renderer).toHaveBeenCalledWith({ alt: 'Sample SVG', url: dataUrl });
  });

  it('shows raw image markdown when the cursor is inside the image syntax', () => {
    const doc = '![Sample PNG](assets/img.png)\n\nplain';
    const view = createEditorView({
      doc,
      selection: EditorSelection.cursor(3),
      extensions: imagesPlugin.extensions(resolveClassNames()),
    });
    views.push(view);

    expect(view.dom.querySelector('.ne-image-widget img')).toBeNull();
    expect(lineElement(view, 1).textContent).toBe('![Sample PNG](assets/img.png)');
  });

  it('keeps safe alt text in preview mode when the cursor is inside image syntax', () => {
    const doc = '![Sample PNG](assets/img.png)\n\nplain';
    const view = createEditorView({
      doc,
      selection: EditorSelection.cursor(3),
      extensions: imagesPlugin.extensions(resolveClassNames(), {
        theme: 'light',
        mode: 'preview',
      }),
    });
    views.push(view);

    expect(view.dom.querySelector('.ne-image-widget img')).toBeNull();
    expect(lineElement(view, 1).textContent).toBe('Sample PNG');
  });

  it('uses a custom imageRenderer widget when provided', () => {
    const renderer = vi.fn(({ alt, url }: { alt: string; url: string }) => {
      const image = document.createElement('img');
      image.alt = alt;
      image.src = url;
      return image;
    });
    const doc = '![Sample PNG](assets/img.png)\n\nplain';
    const view = createEditorView({
      doc,
      selection: EditorSelection.cursor(doc.indexOf('plain')),
      extensions: imagesPlugin.extensions(resolveClassNames(), {
        theme: 'light',
        imageRenderer: renderer,
      }),
    });
    views.push(view);

    const image = view.dom.querySelector('.ne-image-widget img');
    expect(image).toBeInstanceOf(HTMLImageElement);
    expect(image?.getAttribute('alt')).toBe('Sample PNG');
    expect(image?.getAttribute('src')).toBe('assets/img.png');
  });

  it('falls back to safe alt text when imageRenderer returns null', () => {
    const doc = '![Sample PNG](assets/img.png)\n\nplain';
    const view = createEditorView({
      doc,
      selection: EditorSelection.cursor(doc.indexOf('plain')),
      extensions: imagesPlugin.extensions(resolveClassNames(), {
        theme: 'light',
        imageRenderer: () => null,
      }),
    });
    views.push(view);

    expect(view.dom.querySelector('.ne-image-widget img')).toBeNull();
    expect(lineElement(view, 1).textContent).toBe('Sample PNG');
  });
});
