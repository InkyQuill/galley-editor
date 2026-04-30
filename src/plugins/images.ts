import { WidgetType } from '@codemirror/view';
import type { EditorState } from '@codemirror/state';
import { makeInlinePlugin } from '../rendering';
import {
  imageRangeIntersectsSelection,
  imageTrailingAttrsLength,
  parseImageMarkdown,
} from '../image-markdown';
import type {
  ImageRenderer,
  MissingImageRenderer,
  GalleyImageInfo,
  GalleyMissingImageInfo,
  GalleyClassNames,
  GalleyPlugin,
} from '../types';

type ParsedImage = GalleyImageInfo;

class ImageWidget extends WidgetType {
  private readonly image: ParsedImage;
  private readonly imageClass: string;
  private readonly renderer: ImageRenderer;
  private readonly missingRenderer: MissingImageRenderer | undefined;

  constructor(
    image: ParsedImage,
    imageClass: string,
    renderer: ImageRenderer,
    missingRenderer: MissingImageRenderer | undefined,
  ) {
    super();
    this.image = image;
    this.imageClass = imageClass;
    this.renderer = renderer;
    this.missingRenderer = missingRenderer;
  }

  eq(other: ImageWidget): boolean {
    return (
      other.image.alt === this.image.alt &&
      other.image.url === this.image.url &&
      other.image.title === this.image.title &&
      other.image.width === this.image.width &&
      other.image.height === this.image.height &&
      other.image.attrs?.join('\0') === this.image.attrs?.join('\0') &&
      other.image.raw === this.image.raw &&
      other.image.from === this.image.from &&
      other.image.to === this.image.to &&
      other.imageClass === this.imageClass &&
      other.renderer === this.renderer &&
      other.missingRenderer === this.missingRenderer
    );
  }

  toDOM(): HTMLElement {
    if (this.image.url.trim() === '') {
      const wrapper = this.createWrapper();
      wrapper.append(this.renderMissingImage('empty-url'));
      return wrapper;
    }

    const rendered = this.renderer(this.image);
    if (!rendered) {
      const span = document.createElement('span');
      span.className = this.imageClass;
      span.textContent = this.image.alt;
      return span;
    }

    const wrapper = this.createWrapper();
    this.attachErrorListeners(wrapper, rendered);
    wrapper.append(rendered);
    return wrapper;
  }

  ignoreEvent(): boolean {
    return false;
  }

  private createWrapper(): HTMLElement {
    const wrapper = document.createElement('span');
    wrapper.className = `${this.imageClass} ge-image-widget`;
    return wrapper;
  }

  private attachErrorListeners(wrapper: HTMLElement, rendered: HTMLElement): void {
    let replaced = false;
    const onError = () => {
      if (replaced) return;
      replaced = true;
      wrapper.replaceChildren(this.renderMissingImage('error'));
    };

    if (rendered instanceof HTMLImageElement) {
      rendered.addEventListener('error', onError, { once: true });
    }

    for (const image of rendered.querySelectorAll('img')) {
      image.addEventListener('error', onError, { once: true });
    }
  }

  private renderMissingImage(reason: GalleyMissingImageInfo['reason']): HTMLElement {
    const image = { ...this.image, reason };
    return this.missingRenderer?.(image) ?? defaultMissingImageRenderer(image);
  }
}

function imageRangeTo(state: EditorState, to: number): number {
  return to + imageTrailingAttrsLength(state, to);
}

function parseEmptyUrlImageMarkdown(raw: string, from: number, to: number): GalleyImageInfo | null {
  if (!raw.startsWith('![')) return null;

  const altEnd = raw.indexOf('](', 2);
  if (altEnd === -1) return null;

  let image = raw;
  if (raw.endsWith('}')) {
    const attrsStart = raw.lastIndexOf('{');
    const imagePart = raw.slice(0, attrsStart);
    if (attrsStart !== -1 && imagePart.endsWith(')')) {
      image = imagePart;
    }
  }

  if (!image.endsWith(')')) return null;

  const target = image.slice(altEnd + 2, -1).trim();
  if (target !== '') return null;

  return {
    alt: raw.slice(2, altEnd),
    url: '',
    raw,
    from,
    to,
  };
}

function parseImageWidgetMarkdown(raw: string, from: number, to: number): GalleyImageInfo | null {
  return parseImageMarkdown(raw, from, to) ?? parseEmptyUrlImageMarkdown(raw, from, to);
}

function defaultImageRenderer({ alt, url, title }: ParsedImage): HTMLElement {
  const image = document.createElement('img');
  image.className = 'ge-image';
  image.alt = alt;
  image.src = url;
  image.loading = 'lazy';
  if (title) image.title = title;
  return image;
}

function defaultMissingImageRenderer({ alt }: GalleyMissingImageInfo): HTMLElement {
  const container = document.createElement('span');
  container.className = 'ge-image-missing';

  const label = document.createElement('span');
  label.className = 'ge-image-missing-label';
  label.textContent = 'Image unavailable';
  container.append(label);

  if (alt) {
    const altText = document.createElement('span');
    altText.className = 'ge-image-missing-alt';
    altText.textContent = alt;
    container.append(altText);
  }

  return container;
}

const imagesPlugin: GalleyPlugin = {
  id: 'ge:images',
  extensions(classNames: GalleyClassNames, context) {
    const imageClass = classNames.image ?? 'ge-image-frame';
    const preview = context?.mode === 'preview';
    const renderer = context?.imageRenderer ?? defaultImageRenderer;
    const missingRenderer = context?.missingImageRenderer;

    const widgetExt = makeInlinePlugin({
      createDecoration(node, state) {
        if (node.name !== 'Image') return null;
        const to = imageRangeTo(state, node.to);
        const parsed = parseImageWidgetMarkdown(state.sliceDoc(node.from, to), node.from, to);
        if (!parsed) return null;
        return new ImageWidget(parsed, imageClass, renderer, missingRenderer);
      },
      getMarkRange(node, state) {
        return { from: node.from, to: imageRangeTo(state, node.to) };
      },
      getRevealStrategy: (node, state) =>
        preview ? false : imageRangeIntersectsSelection(state, node.from, imageRangeTo(state, node.to)),
    });

    return [widgetExt];
  },
};

export default imagesPlugin;
