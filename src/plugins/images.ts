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
  GalleyImageInfo,
  GalleyClassNames,
  GalleyPlugin,
} from '../types';

type ParsedImage = GalleyImageInfo;

class ImageWidget extends WidgetType {
  private readonly image: ParsedImage;
  private readonly imageClass: string;
  private readonly renderer: ImageRenderer;

  constructor(image: ParsedImage, imageClass: string, renderer: ImageRenderer) {
    super();
    this.image = image;
    this.imageClass = imageClass;
    this.renderer = renderer;
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
      other.renderer === this.renderer
    );
  }

  toDOM(): HTMLElement {
    const rendered = this.renderer(this.image);
    if (!rendered) {
      const span = document.createElement('span');
      span.className = this.imageClass;
      span.textContent = this.image.alt;
      return span;
    }

    const wrapper = document.createElement('span');
    wrapper.className = `${this.imageClass} ge-image-widget`;
    wrapper.append(rendered);
    return wrapper;
  }

  ignoreEvent(): boolean {
    return false;
  }
}

function imageRangeTo(state: EditorState, to: number): number {
  return to + imageTrailingAttrsLength(state, to);
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

const imagesPlugin: GalleyPlugin = {
  id: 'ge:images',
  extensions(classNames: GalleyClassNames, context) {
    const imageClass = classNames.image ?? 'ge-image-frame';
    const preview = context?.mode === 'preview';
    const renderer = context?.imageRenderer ?? defaultImageRenderer;

    const widgetExt = makeInlinePlugin({
      createDecoration(node, state) {
        if (node.name !== 'Image') return null;
        const to = imageRangeTo(state, node.to);
        const parsed = parseImageMarkdown(state.sliceDoc(node.from, to), node.from, to);
        if (!parsed) return null;
        return new ImageWidget(parsed, imageClass, renderer);
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
