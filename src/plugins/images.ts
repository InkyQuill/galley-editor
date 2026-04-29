import { WidgetType } from '@codemirror/view';
import { makeInlinePlugin } from '../rendering';
import type { NeutrinoPlugin, NeutrinoClassNames } from '../types';

interface ParsedImage {
  alt: string;
  src: string;
}

class ImageWidget extends WidgetType {
  private readonly image: ParsedImage;
  private readonly imageClass: string;

  constructor(image: ParsedImage, imageClass: string) {
    super();
    this.image = image;
    this.imageClass = imageClass;
  }

  eq(other: ImageWidget): boolean {
    return (
      other.image.alt === this.image.alt &&
      other.image.src === this.image.src &&
      other.imageClass === this.imageClass
    );
  }

  toDOM(): HTMLElement {
    const figure = document.createElement('span');
    figure.className = `${this.imageClass} ne-image-widget`;

    const image = document.createElement('img');
    image.className = 'ne-image';
    image.src = this.image.src;
    image.alt = this.image.alt;
    image.loading = 'lazy';
    figure.append(image);

    return figure;
  }

  ignoreEvent(): boolean {
    return false;
  }
}

function parseImage(raw: string): ParsedImage | null {
  const match = /^!\[(?<alt>[^\]]*)\]\((?<src>[^)\s]+)(?:\s+"[^"]*")?\)$/.exec(raw);
  if (!match?.groups) return null;
  return {
    alt: match.groups.alt,
    src: match.groups.src,
  };
}

const imagesPlugin: NeutrinoPlugin = {
  id: 'ne:images',
  extensions(classNames: NeutrinoClassNames, context) {
    const imageClass = classNames.image ?? 'ne-image-frame';
    const preview = context?.mode === 'preview';

    return [
      makeInlinePlugin({
        createDecoration(node, state) {
          if (node.name !== 'Image') return null;
          const parsed = parseImage(state.sliceDoc(node.from, node.to));
          if (!parsed) return null;
          return new ImageWidget(parsed, imageClass);
        },
        getRevealStrategy: (node, state) =>
          preview
            ? false
            : state.selection.ranges.some((range) => range.from <= node.to && range.to >= node.from),
      }),
    ];
  },
};

export default imagesPlugin;
