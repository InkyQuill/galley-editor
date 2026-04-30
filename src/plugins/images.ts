import { Decoration, WidgetType } from '@codemirror/view';
import type { EditorState } from '@codemirror/state';
import { HIDE_DECORATION, makeInlinePlugin } from '../rendering';
import type {
  ImageRenderer,
  NeutrinoClassNames,
  NeutrinoPlugin,
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
    wrapper.className = `${this.imageClass} ne-image-widget`;
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

const imagesPlugin: NeutrinoPlugin = {
  id: 'ne:images',
  extensions(classNames: NeutrinoClassNames, context) {
    const imageClass = classNames.image ?? 'ne-image-frame';
    const preview = context?.mode === 'preview';
    const renderer = context?.imageRenderer;

    const hideSyntaxExt = makeInlinePlugin({
      createDecoration(node) {
        const parent = node.node.parent;
        if (!parent || parent.name !== 'Image') return null;
        if (
          node.name === 'LinkMark' ||
          node.name === 'URL' ||
          node.name === 'LinkTitle'
        ) {
          return HIDE_DECORATION;
        }
        return null;
      },
      getRevealStrategy(node, state) {
        if (preview) return false;
        const parent = node.node.parent;
        if (!parent || parent.name !== 'Image') return 'select';
        return selectionIntersects(parent.from, parent.to, state);
      },
    });

    const classExt = makeInlinePlugin({
      createDecoration(node) {
        if (renderer) return null;
        if (node.name !== 'Image') return null;
        return Decoration.mark({ class: imageClass });
      },
      getRevealStrategy: () => false,
      hideWhenNearCursor: false,
    });

    const widgetExt = makeInlinePlugin({
      createDecoration(node, state) {
        if (!renderer || node.name !== 'Image') return null;
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

    return renderer ? [widgetExt] : [hideSyntaxExt, classExt];
  },
};

export default imagesPlugin;
