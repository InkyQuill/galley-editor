import { syntaxTree } from '@codemirror/language';
import {
  EditorSelection,
  StateEffect,
  StateField,
  type EditorState,
  type Range,
} from '@codemirror/state';
import {
  Decoration,
  type DecorationSet,
  EditorView,
  type ViewUpdate,
  ViewPlugin,
  WidgetType,
} from '@codemirror/view';
import {
  imageRangeIntersectsSelection,
  imageTrailingAttrsLength,
  parseImageMarkdown,
  serializeImageMarkdown,
} from '../image-markdown';
import type {
  ImageControlsRenderer,
  ImageRenderer,
  MissingImageRenderer,
  GalleyImageMetadataInput,
  GalleyImageInfo,
  GalleyMissingImageInfo,
  GalleyClassNames,
  GalleyPlugin,
} from '../types';
import { resizeImageMetadata, type ResizeCorner } from './image-resize';

type ParsedImage = GalleyImageInfo;
type SelectedImageRange = { from: number; to: number };

const selectImage = StateEffect.define<SelectedImageRange | null>({
  map(value, changes) {
    if (!value) return null;

    const from = changes.mapPos(value.from, 1);
    const to = changes.mapPos(value.to, -1);
    return from < to ? { from, to } : null;
  },
});

const selectedImageField = StateField.define<SelectedImageRange | null>({
  create() {
    return null;
  },
  update(value, transaction) {
    let next = value;
    if (next && transaction.docChanged) {
      const from = transaction.changes.mapPos(next.from, 1);
      const to = transaction.changes.mapPos(next.to, -1);
      next = from < to ? { from, to } : null;
    }

    let hasSelectionEffect = false;
    for (const effect of transaction.effects) {
      if (effect.is(selectImage)) {
        hasSelectionEffect = true;
        next = effect.value;
      }
    }

    if (transaction.selection && !hasSelectionEffect) return null;

    return next;
  },
});

class ImageWidget extends WidgetType {
  image: ParsedImage;
  imageClass: string;
  renderer: ImageRenderer;
  missingRenderer: MissingImageRenderer | undefined;
  controlsRenderer: ImageControlsRenderer | undefined;
  selected: boolean;
  canEdit: boolean;
  activeResizeCleanup: (() => void) | undefined;

  constructor(
    image: ParsedImage,
    imageClass: string,
    renderer: ImageRenderer,
    missingRenderer: MissingImageRenderer | undefined,
    controlsRenderer: ImageControlsRenderer | undefined,
    selected: boolean,
    canEdit: boolean,
  ) {
    super();
    this.image = image;
    this.imageClass = imageClass;
    this.renderer = renderer;
    this.missingRenderer = missingRenderer;
    this.controlsRenderer = controlsRenderer;
    this.selected = selected;
    this.canEdit = canEdit;
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
      other.missingRenderer === this.missingRenderer &&
      other.controlsRenderer === this.controlsRenderer &&
      other.selected === this.selected &&
      other.canEdit === this.canEdit
    );
  }

  toDOM(view: EditorView): HTMLElement {
    if (this.image.url.trim() === '') {
      const wrapper = this.createWrapper();
      this.attachSelectionHandler(wrapper, view);
      this.appendImageControls(wrapper, view);
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
    this.attachSelectionHandler(wrapper, view);
    this.attachErrorListeners(wrapper, rendered);
    this.appendImageControls(wrapper, view);
    wrapper.append(rendered);
    return wrapper;
  }

  ignoreEvent(): boolean {
    return false;
  }

  private createWrapper(): HTMLElement {
    const wrapper = document.createElement('span');
    wrapper.className = `${this.imageClass} ge-image-widget${this.selected ? ' ge-image-selected' : ''}`;
    return wrapper;
  }

  private appendImageControls(wrapper: HTMLElement, view: EditorView): void {
    if (!this.selected || !this.canEdit || view.state.readOnly) return;

    const renderedControls = this.controlsRenderer?.({
      image: this.image,
      selected: true,
      resizing: this.activeResizeCleanup !== undefined,
      update: (metadata) => this.updateImageDimensions(view, metadata),
      clearDimensions: () => this.updateImageDimensions(view, { width: null, height: null }),
      revealSource: () => this.revealSource(view),
    });
    if (renderedControls) {
      renderedControls.addEventListener('mousedown', (event) => {
        event.preventDefault();
        event.stopPropagation();
      });
      wrapper.append(renderedControls);
      return;
    }

    const corners: ResizeCorner[] = ['nw', 'ne', 'sw', 'se'];
    for (const corner of corners) {
      const handle = document.createElement('button');
      handle.type = 'button';
      handle.className = `ge-image-resize-handle ge-image-resize-${corner}`;
      handle.ariaLabel = `Resize image ${corner}`;
      handle.addEventListener('mousedown', (event) => {
        this.startResize(event, view, corner, 'mouse');
      });
      handle.addEventListener('pointerdown', (event) => {
        this.startResize(event, view, corner, 'pointer');
      });
      handle.addEventListener('keydown', (event) => {
        this.resizeFromKeyboard(event, view, corner);
      });
      wrapper.append(handle);
    }
  }

  private startResize(
    event: MouseEvent | PointerEvent,
    view: EditorView,
    corner: ResizeCorner,
    eventSource: 'mouse' | 'pointer',
  ): void {
    event.preventDefault();
    event.stopPropagation();

    if (this.activeResizeCleanup) return;

    const startX = event.clientX;
    const startY = event.clientY;
    const freeAtStart = event.shiftKey;
    const moveEvent = eventSource === 'pointer' ? 'pointermove' : 'mousemove';
    const upEvent = eventSource === 'pointer' ? 'pointerup' : 'mouseup';
    const cancelEvent = eventSource === 'pointer' ? 'pointercancel' : 'mouseleave';

    const onMove = (moveEvent: MouseEvent | PointerEvent) => {
      moveEvent.preventDefault();
    };
    const onUp = (upEvent: MouseEvent | PointerEvent) => {
      upEvent.preventDefault();
      removeListeners();

      this.updateImageDimensions(view, resizeImageMetadata(this.image, {
        corner,
        deltaX: upEvent.clientX - startX,
        deltaY: upEvent.clientY - startY,
        free: freeAtStart || upEvent.shiftKey,
      }));
    };
    const onCancel = (cancelEvent: Event) => {
      cancelEvent.preventDefault();
      removeListeners();
    };
    const removeListeners = () => {
      document.removeEventListener(moveEvent, onMove);
      document.removeEventListener(upEvent, onUp);
      document.removeEventListener(cancelEvent, onCancel);
      window.removeEventListener('blur', removeListeners);
      this.activeResizeCleanup = undefined;
    };

    this.activeResizeCleanup = removeListeners;
    document.addEventListener(moveEvent, onMove);
    document.addEventListener(upEvent, onUp);
    document.addEventListener(cancelEvent, onCancel);
    window.addEventListener('blur', removeListeners);
  }

  private resizeFromKeyboard(
    event: KeyboardEvent,
    view: EditorView,
    corner: ResizeCorner,
  ): void {
    const delta = keyboardResizeDelta(event, corner);
    if (!delta) return;

    event.preventDefault();
    event.stopPropagation();

    this.updateImageDimensions(view, resizeImageMetadata(this.image, {
      corner,
      deltaX: delta.deltaX,
      deltaY: delta.deltaY,
      free: event.shiftKey,
    }));
  }

  private updateImageDimensions(
    view: EditorView,
    metadata: GalleyImageMetadataInput,
  ): void {
    if (!this.canEdit || view.state.readOnly) return;

    const next = serializeImageMarkdown(this.image, metadata);
    if (next === this.image.raw) return;

    const nextRange = { from: this.image.from, to: this.image.from + next.length };
    view.dispatch({
      changes: { from: this.image.from, to: this.image.to, insert: next },
      effects: selectImage.of(nextRange),
      scrollIntoView: true,
    });
  }

  destroy(): void {
    this.activeResizeCleanup?.();
  }

  private attachSelectionHandler(wrapper: HTMLElement, view: EditorView): void {
    if (!this.canEdit || view.state.readOnly) return;

    wrapper.addEventListener('mousedown', (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (event.ctrlKey || event.metaKey) {
        this.revealSource(view);
        return;
      }

      view.dispatch({
        effects: selectImage.of({ from: this.image.from, to: this.image.to }),
      });
    });
  }

  private revealSource(view: EditorView): void {
    if (!this.canEdit || view.state.readOnly) return;

    view.dispatch({
      selection: EditorSelection.cursor(Math.min(this.image.from + 1, this.image.to)),
      effects: selectImage.of(null),
    });
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

function keyboardResizeDelta(
  event: KeyboardEvent,
  corner: ResizeCorner,
): { deltaX: number; deltaY: number } | null {
  const step = 10;
  if (event.key === 'ArrowRight') return { deltaX: step, deltaY: 0 };
  if (event.key === 'ArrowLeft') return { deltaX: -step, deltaY: 0 };
  if (event.key === 'ArrowDown') return { deltaX: 0, deltaY: step };
  if (event.key === 'ArrowUp') return { deltaX: 0, deltaY: -step };
  if (event.key !== 'Enter' && event.key !== ' ') return null;

  return {
    deltaX: corner.endsWith('e') ? step : -step,
    deltaY: corner.startsWith('s') ? step : -step,
  };
}

function selectedImageMatchesImage(
  selected: SelectedImageRange | null,
  image: ParsedImage,
): boolean {
  return selected?.from === image.from && selected.to === image.to;
}

function buildImageDecorations(
  view: EditorView,
  imageClass: string,
  renderer: ImageRenderer,
  missingRenderer: MissingImageRenderer | undefined,
  controlsRenderer: ImageControlsRenderer | undefined,
  preview: boolean,
  canEdit: boolean,
): DecorationSet {
  const { state } = view;
  const widgets: Range<Decoration>[] = [];
  const selectedImage = state.field(selectedImageField);

  for (const { from, to } of view.visibleRanges) {
    syntaxTree(state).iterate({
      from,
      to,
      enter(node) {
        if (node.name !== 'Image') return;

        const imageTo = imageRangeTo(state, node.to);
        if (canEdit && !preview && imageRangeIntersectsSelection(state, node.from, imageTo)) return;

        const parsed = parseImageWidgetMarkdown(state.sliceDoc(node.from, imageTo), node.from, imageTo);
        if (!parsed) return;

        widgets.push(
          Decoration.replace({
            widget: new ImageWidget(
              parsed,
              imageClass,
              renderer,
              missingRenderer,
              controlsRenderer,
              selectedImageMatchesImage(selectedImage, parsed),
              canEdit,
            ),
          }).range(node.from, imageTo),
        );
      },
    });
  }

  return Decoration.set(widgets, true);
}

function makeImagesViewPlugin(
  imageClass: string,
  renderer: ImageRenderer,
  missingRenderer: MissingImageRenderer | undefined,
  controlsRenderer: ImageControlsRenderer | undefined,
  preview: boolean,
  canEdit: boolean,
) {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = buildImageDecorations(
          view,
          imageClass,
          renderer,
          missingRenderer,
          controlsRenderer,
          preview,
          canEdit,
        );
      }

      update(update: ViewUpdate) {
        const selectedImageChanged =
          update.startState.field(selectedImageField) !== update.state.field(selectedImageField);
        if (
          update.docChanged ||
          update.viewportChanged ||
          update.selectionSet ||
          selectedImageChanged
        ) {
          this.decorations = buildImageDecorations(
            update.view,
            imageClass,
            renderer,
            missingRenderer,
            controlsRenderer,
            preview,
            canEdit,
          );
        }
      }
    },
    {
      decorations: (plugin) => plugin.decorations,
    },
  );
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

function defaultImageRenderer({ alt, url, title, width, height }: ParsedImage): HTMLElement {
  const image = document.createElement('img');
  image.className = 'ge-image';
  image.alt = alt;
  image.src = url;
  image.loading = 'lazy';
  if (title) image.title = title;
  if (width !== undefined) image.width = width;
  if (height !== undefined) image.height = height;
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
    const canEdit = context?.canEdit ?? !preview;
    const renderer = context?.imageRenderer ?? defaultImageRenderer;
    const missingRenderer = context?.missingImageRenderer;
    const controlsRenderer = context?.imageControlsRenderer;

    return [
      selectedImageField,
      makeImagesViewPlugin(imageClass, renderer, missingRenderer, controlsRenderer, preview, canEdit),
    ];
  },
};

export default imagesPlugin;
