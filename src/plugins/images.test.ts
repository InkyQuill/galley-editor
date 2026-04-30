import { afterEach, describe, expect, it, vi } from 'vitest';
import { EditorSelection } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import { createEditorView, destroyViews, lineElement } from '../test-utils/editor';
import { resolveClassNames, type GalleyImageInfo, type GalleyMissingImageInfo } from '../types';
import imagesPlugin from './images';

const views: EditorView[] = [];

afterEach(() => {
  destroyViews(views);
});

describe('imagesPlugin', () => {
  it('renders inactive markdown images as image widgets by default', () => {
    const doc = '![Galley mark](assets/galley.png)\n\nplain';
    const view = createEditorView({
      doc,
      selection: EditorSelection.cursor(doc.indexOf('plain')),
      extensions: imagesPlugin.extensions(resolveClassNames()),
    });
    views.push(view);

    const image = view.dom.querySelector('.ge-image-widget img');
    expect(image).toBeInstanceOf(HTMLImageElement);
    expect(image?.getAttribute('alt')).toBe('Galley mark');
    expect(image?.getAttribute('src')).toBe('assets/galley.png');
  });

  it('renders color logo markdown images as image widgets by default', () => {
    const doc = '![Galley logo](assets/galley-color.png)\n\nplain';
    const view = createEditorView({
      doc,
      selection: EditorSelection.cursor(doc.indexOf('plain')),
      extensions: imagesPlugin.extensions(resolveClassNames()),
    });
    views.push(view);

    const image = view.dom.querySelector('.ge-image-widget img');
    expect(image).toBeInstanceOf(HTMLImageElement);
    expect(image?.getAttribute('alt')).toBe('Galley logo');
    expect(image?.getAttribute('src')).toBe('assets/galley-color.png');
  });

  it('renders data-uri svg markdown images with parentheses in urls', () => {
    const renderer = vi.fn(({ alt, url }: { alt: string; url: string }) => {
      const image = document.createElement('img');
      image.alt = alt;
      image.src = url;
      return image;
    });
    const dataUrl = "data:image/svg+xml,%3csvg%3e%3crect%20fill='url(%23sky)'/%3e%3c/svg%3e";
    const doc = `![Galley logo](${dataUrl})\n\nplain`;
    const view = createEditorView({
      doc,
      selection: EditorSelection.cursor(doc.indexOf('plain')),
      extensions: imagesPlugin.extensions(resolveClassNames(), {
        theme: 'light',
        imageRenderer: renderer,
      }),
    });
    views.push(view);

    const image = view.dom.querySelector('.ge-image-widget img');
    expect(image).toBeInstanceOf(HTMLImageElement);
    expect(image?.getAttribute('alt')).toBe('Galley logo');
    expect(renderer).toHaveBeenCalledWith(expect.objectContaining({
      alt: 'Galley logo',
      url: dataUrl,
      raw: `![Galley logo](${dataUrl})`,
      from: 0,
      to: `![Galley logo](${dataUrl})`.length,
    }));
  });

  it('shows raw image markdown when the cursor is inside the image syntax', () => {
    const doc = '![Galley mark](assets/galley.png)\n\nplain';
    const view = createEditorView({
      doc,
      selection: EditorSelection.cursor(3),
      extensions: imagesPlugin.extensions(resolveClassNames()),
    });
    views.push(view);

    expect(view.dom.querySelector('.ge-image-widget img')).toBeNull();
    expect(lineElement(view, 1).textContent).toBe('![Galley mark](assets/galley.png)');
  });

  it('keeps the first adjacent image widget when the cursor is at the second image start', () => {
    const renderer = vi.fn((imageInfo: GalleyImageInfo) => {
      const image = document.createElement('img');
      image.alt = imageInfo.alt;
      image.src = imageInfo.url;
      return image;
    });
    const first = '![a](a){width=1}';
    const second = '![b](b)';
    const doc = `${first}${second}`;
    const view = createEditorView({
      doc,
      selection: EditorSelection.cursor(first.length),
      extensions: imagesPlugin.extensions(resolveClassNames(), {
        theme: 'light',
        imageRenderer: renderer,
      }),
    });
    views.push(view);

    const images = [...view.dom.querySelectorAll('.ge-image-widget img')];
    expect(images).toHaveLength(1);
    expect(images[0]?.getAttribute('alt')).toBe('a');
    expect(lineElement(view, 1).textContent).toContain(second);
    expect(lineElement(view, 1).textContent).not.toContain(first);
  });

  it('keeps image widgets in preview mode when the cursor is inside image syntax', () => {
    const doc = '![Galley mark](assets/galley.png)\n\nplain';
    const view = createEditorView({
      doc,
      selection: EditorSelection.cursor(3),
      extensions: imagesPlugin.extensions(resolveClassNames(), {
        theme: 'light',
        mode: 'preview',
      }),
    });
    views.push(view);

    const image = view.dom.querySelector('.ge-image-widget img');
    expect(image).toBeInstanceOf(HTMLImageElement);
    expect(image?.getAttribute('src')).toBe('assets/galley.png');
  });

  it('uses a custom imageRenderer widget when provided', () => {
    const renderer = vi.fn(({ alt, url }: { alt: string; url: string }) => {
      const image = document.createElement('img');
      image.alt = alt;
      image.src = url;
      return image;
    });
    const doc = '![Galley mark](assets/galley.png)\n\nplain';
    const view = createEditorView({
      doc,
      selection: EditorSelection.cursor(doc.indexOf('plain')),
      extensions: imagesPlugin.extensions(resolveClassNames(), {
        theme: 'light',
        imageRenderer: renderer,
      }),
    });
    views.push(view);

    const image = view.dom.querySelector('.ge-image-widget img');
    expect(image).toBeInstanceOf(HTMLImageElement);
    expect(image?.getAttribute('alt')).toBe('Galley mark');
    expect(image?.getAttribute('src')).toBe('assets/galley.png');
  });

  it('shows a missing image placeholder when an image fires an error event', () => {
    const doc = '![Galley mark](missing.png)\n\nplain';
    const view = createEditorView({
      doc,
      selection: EditorSelection.cursor(doc.indexOf('plain')),
      extensions: imagesPlugin.extensions(resolveClassNames()),
    });
    views.push(view);

    const image = view.dom.querySelector('.ge-image-widget img');
    expect(image).toBeInstanceOf(HTMLImageElement);

    image?.dispatchEvent(new Event('error'));

    const missing = view.dom.querySelector('.ge-image-missing');
    expect(missing).toBeInstanceOf(HTMLElement);
    expect(missing?.textContent).toContain('Image unavailable');
    expect(missing?.textContent).toContain('Galley mark');
    expect(view.dom.querySelector('.ge-image-widget img')).toBeNull();
  });

  it('uses custom missingImageRenderer on error and passes image metadata', () => {
    const missingRenderer = vi.fn((image: GalleyMissingImageInfo) => {
      const element = document.createElement('div');
      element.className = 'custom-missing';
      element.textContent = `${image.reason}:${image.alt}`;
      return element;
    });
    const doc = '![Galley mark](missing.png)\n\nplain';
    const view = createEditorView({
      doc,
      selection: EditorSelection.cursor(doc.indexOf('plain')),
      extensions: imagesPlugin.extensions(resolveClassNames(), {
        theme: 'light',
        missingImageRenderer: missingRenderer,
      }),
    });
    views.push(view);

    view.dom.querySelector('.ge-image-widget img')?.dispatchEvent(new Event('error'));

    expect(view.dom.querySelector('.custom-missing')?.textContent).toBe('error:Galley mark');
    expect(missingRenderer).toHaveBeenCalledWith(expect.objectContaining({
      reason: 'error',
      alt: 'Galley mark',
      url: 'missing.png',
    }));
  });

  it('handles an imageRenderer wrapper with an img descendant that fires an error event', () => {
    const renderer = vi.fn((imageInfo: GalleyImageInfo) => {
      const figure = document.createElement('figure');
      const image = document.createElement('img');
      image.alt = imageInfo.alt;
      image.src = imageInfo.url;
      figure.append(image);
      return figure;
    });
    const doc = '![Wrapped mark](missing.png)\n\nplain';
    const view = createEditorView({
      doc,
      selection: EditorSelection.cursor(doc.indexOf('plain')),
      extensions: imagesPlugin.extensions(resolveClassNames(), {
        theme: 'light',
        imageRenderer: renderer,
      }),
    });
    views.push(view);

    view.dom.querySelector('.ge-image-widget figure img')?.dispatchEvent(new Event('error'));

    const missing = view.dom.querySelector('.ge-image-missing');
    expect(missing).toBeInstanceOf(HTMLElement);
    expect(missing?.textContent).toContain('Wrapped mark');
    expect(view.dom.querySelector('.ge-image-widget figure')).toBeNull();
  });

  it('renders empty-url images as missing placeholders with empty-url metadata', () => {
    const doc = '![Empty]()\n\nplain';
    const defaultView = createEditorView({
      doc,
      selection: EditorSelection.cursor(doc.indexOf('plain')),
      extensions: imagesPlugin.extensions(resolveClassNames()),
    });
    views.push(defaultView);

    const missing = defaultView.dom.querySelector('.ge-image-missing');
    expect(missing).toBeInstanceOf(HTMLElement);
    expect(missing?.textContent).toContain('Image unavailable');
    expect(missing?.textContent).toContain('Empty');

    const missingRenderer = vi.fn((image: GalleyMissingImageInfo) => {
      const element = document.createElement('div');
      element.className = 'custom-empty-url';
      element.textContent = `${image.reason}:${image.alt}`;
      return element;
    });
    const customView = createEditorView({
      doc,
      selection: EditorSelection.cursor(doc.indexOf('plain')),
      extensions: imagesPlugin.extensions(resolveClassNames(), {
        theme: 'light',
        missingImageRenderer: missingRenderer,
      }),
    });
    views.push(customView);

    expect(customView.dom.querySelector('.custom-empty-url')?.textContent).toBe('empty-url:Empty');
    expect(missingRenderer).toHaveBeenCalledWith(expect.objectContaining({
      reason: 'empty-url',
      alt: 'Empty',
      url: '',
    }));
  });

  it('passes image metadata and source range to custom imageRenderer widgets', () => {
    const renderer = vi.fn((imageInfo: GalleyImageInfo) => {
      const image = document.createElement('img');
      image.alt = imageInfo.alt;
      image.src = imageInfo.url;
      image.dataset.width = String(imageInfo.width);
      image.dataset.height = String(imageInfo.height);
      image.dataset.from = String(imageInfo.from);
      image.dataset.to = String(imageInfo.to);
      return image;
    });
    const raw = '![Diagram](diagram.png "System"){width=640 height=360}';
    const doc = `${raw}\n\nplain`;
    const view = createEditorView({
      doc,
      selection: EditorSelection.cursor(doc.indexOf('plain')),
      extensions: imagesPlugin.extensions(resolveClassNames(), {
        theme: 'light',
        imageRenderer: renderer,
      }),
    });
    views.push(view);

    const image = view.dom.querySelector('.ge-image-widget img');
    expect(image).toBeInstanceOf(HTMLImageElement);
    expect(image?.getAttribute('data-width')).toBe('640');
    expect(image?.getAttribute('data-height')).toBe('360');
    expect(image?.getAttribute('data-from')).toBe('0');
    expect(image?.getAttribute('data-to')).toBe(String(raw.length));
    expect(renderer).toHaveBeenCalledWith(expect.objectContaining({
      alt: 'Diagram',
      url: 'diagram.png',
      title: 'System',
      width: 640,
      height: 360,
      raw,
      from: 0,
      to: raw.length,
    }));
  });

  it('falls back to safe alt text when imageRenderer returns null', () => {
    const doc = '![Galley mark](assets/galley.png)\n\nplain';
    const view = createEditorView({
      doc,
      selection: EditorSelection.cursor(doc.indexOf('plain')),
      extensions: imagesPlugin.extensions(resolveClassNames(), {
        theme: 'light',
        imageRenderer: () => null,
      }),
    });
    views.push(view);

    expect(view.dom.querySelector('.ge-image-widget img')).toBeNull();
    expect(lineElement(view, 1).textContent).toBe('Galley mark');
  });
});
