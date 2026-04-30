import { WidgetType } from '@codemirror/view';
import type { EditorState } from '@codemirror/state';
import { makeInlinePlugin } from '../rendering';
import type {
  ImageRenderer,
  GalleyClassNames,
  GalleyPlugin,
} from '../types';

interface ParsedImage {
  alt: string;
  url: string;
  title?: string;
}

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

function parseImage(raw: string): ParsedImage | null {
  const match = /^!\[(?<alt>[^\]]*)\]\((?<target>.*)\)$/.exec(raw);
  if (!match?.groups) return null;
  const target = match.groups.target.trim();
  if (!target) return null;
  const titleMatch = /^(?<url>.+?)\s+"(?<title>[^"]*)"$/.exec(target);

  return {
    alt: match.groups.alt,
    url: titleMatch?.groups?.url ?? target,
    ...(titleMatch?.groups?.title ? { title: titleMatch.groups.title } : {}),
  };
}

function selectionIntersects(from: number, to: number, state: EditorState): boolean {
  return state.selection.ranges.some((range) => range.from <= to && range.to >= from);
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
        const parsed = parseImage(state.sliceDoc(node.from, node.to));
        if (!parsed) return null;
        return new ImageWidget(parsed, imageClass, renderer);
      },
      getMarkRange(node) {
        return { from: node.from, to: node.to };
      },
      getRevealStrategy: (node, state) =>
        preview ? false : selectionIntersects(node.from, node.to, state),
    });

    return [widgetExt];
  },
};

export default imagesPlugin;
