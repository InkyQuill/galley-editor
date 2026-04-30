import {
  type ChangeDesc,
  EditorState,
  StateEffect,
  StateField,
  type Extension,
  type Range,
} from '@codemirror/state';
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
} from '@codemirror/view';
import type {
  DropIndicatorRenderer,
  GalleyUploadInfo,
  GalleyUploadInteraction,
  UploadOverlayRenderer,
  UploadPlaceholderRenderer,
} from './types';

interface UploadEntry {
  upload: GalleyUploadInfo;
  from: number;
  to: number;
}

interface DropIndicator {
  pos: number;
  lineFrom: number;
  lineTo: number;
}

interface UploadUiState {
  uploads: UploadEntry[];
  dropIndicator: DropIndicator | null;
}

interface AddUploadEffect {
  upload: GalleyUploadInfo;
  from: number;
  to: number;
}

export const addUpload = StateEffect.define<AddUploadEffect>();
export const updateUpload = StateEffect.define<GalleyUploadInfo>();
export const removeUpload = StateEffect.define<string>();
export const setDropIndicator = StateEffect.define<DropIndicator>();
export const clearDropIndicator = StateEffect.define<void>();

function mapRange(entry: UploadEntry, changes: ChangeDesc): UploadEntry {
  const from = changes.mapPos(entry.from, 1);
  const to = changes.mapPos(entry.to, -1);
  return { ...entry, from: Math.min(from, to), to: Math.max(from, to) };
}

function mapDropIndicator(dropIndicator: DropIndicator, changes: ChangeDesc): DropIndicator {
  const lineFrom = changes.mapPos(dropIndicator.lineFrom, 1);
  const lineTo = changes.mapPos(dropIndicator.lineTo, -1);
  return {
    pos: changes.mapPos(dropIndicator.pos, 1),
    lineFrom: Math.min(lineFrom, lineTo),
    lineTo: Math.max(lineFrom, lineTo),
  };
}

function canEditWithoutUploadEffect(state: EditorState): boolean {
  return state.field(uploadUiField, false)?.uploads.length === 0;
}

function hasUploadEffect(effects: readonly StateEffect<unknown>[]): boolean {
  return effects.some((effect) => (
    effect.is(addUpload) ||
    effect.is(updateUpload) ||
    effect.is(removeUpload)
  ));
}

function percent(upload: GalleyUploadInfo): number {
  const value = upload.progress ?? 0;
  return Math.max(0, Math.min(100, Math.round(value * 100)));
}

function uploadLabel(upload: GalleyUploadInfo): string {
  const names = upload.files.map((file) => file.name).join(', ');
  return upload.message ? `${names} ${upload.message}` : names;
}

function cloneUpload(upload: GalleyUploadInfo): GalleyUploadInfo {
  return {
    ...upload,
    files: [...upload.files],
    selection: { ...upload.selection },
  };
}

function defaultPlaceholder(upload: GalleyUploadInfo): HTMLElement {
  const wrapper = document.createElement('span');
  wrapper.className = 'ge-upload-placeholder';
  wrapper.setAttribute('role', 'status');
  wrapper.setAttribute('aria-live', 'polite');

  const label = document.createElement('span');
  label.className = 'ge-upload-label';
  label.textContent = uploadLabel(upload);

  const progress = document.createElement('span');
  progress.className = 'ge-upload-progress';
  progress.setAttribute('role', 'progressbar');
  progress.setAttribute('aria-valuemin', '0');
  progress.setAttribute('aria-valuemax', '100');
  progress.setAttribute('aria-valuenow', String(percent(upload)));

  wrapper.append(label, progress);
  return wrapper;
}

function defaultDropIndicator(): HTMLElement {
  const indicator = document.createElement('div');
  indicator.className = 'ge-drop-indicator';
  return indicator;
}

function defaultOverlay(): HTMLElement {
  const overlay = document.createElement('div');
  overlay.className = 'ge-upload-overlay';
  return overlay;
}

class UploadPlaceholderWidget extends WidgetType {
  readonly upload: GalleyUploadInfo;
  readonly renderer: UploadPlaceholderRenderer | undefined;

  constructor(upload: GalleyUploadInfo, renderer: UploadPlaceholderRenderer | undefined) {
    super();
    this.upload = upload;
    this.renderer = renderer;
  }

  eq(other: UploadPlaceholderWidget): boolean {
    return other.upload === this.upload && other.renderer === this.renderer;
  }

  toDOM(): HTMLElement {
    return this.renderer?.(this.upload) ?? defaultPlaceholder(this.upload);
  }
}

class DropIndicatorWidget extends WidgetType {
  readonly dropIndicator: DropIndicator;
  readonly renderer: DropIndicatorRenderer | undefined;

  constructor(dropIndicator: DropIndicator, renderer: DropIndicatorRenderer | undefined) {
    super();
    this.dropIndicator = dropIndicator;
    this.renderer = renderer;
  }

  eq(other: DropIndicatorWidget): boolean {
    return (
      other.dropIndicator.pos === this.dropIndicator.pos &&
      other.dropIndicator.lineFrom === this.dropIndicator.lineFrom &&
      other.dropIndicator.lineTo === this.dropIndicator.lineTo &&
      other.renderer === this.renderer
    );
  }

  toDOM(): HTMLElement {
    return this.renderer?.({ source: 'drag', ...this.dropIndicator }) ?? defaultDropIndicator();
  }
}

function buildDecorations(
  state: UploadUiState,
  placeholderRenderer: UploadPlaceholderRenderer | undefined,
  dropIndicatorRenderer: DropIndicatorRenderer | undefined,
): DecorationSet {
  const decorations: Range<Decoration>[] = [];

  for (const entry of state.uploads) {
    const widget = new UploadPlaceholderWidget(entry.upload, placeholderRenderer);
    if (entry.from === entry.to) {
      decorations.push(Decoration.widget({ widget }).range(entry.from));
    } else {
      decorations.push(Decoration.replace({ widget }).range(entry.from, entry.to));
    }
  }

  if (state.dropIndicator) {
    const widget = new DropIndicatorWidget(state.dropIndicator, dropIndicatorRenderer);
    decorations.push(Decoration.widget({ widget, block: true }).range(state.dropIndicator.pos));
  }

  return Decoration.set(decorations, true);
}

const uploadUiField = StateField.define<UploadUiState>({
  create() {
    return { uploads: [], dropIndicator: null };
  },

  update(value, tr) {
    let next: UploadUiState = {
      uploads: value.uploads.map((entry) => mapRange(entry, tr.changes)),
      dropIndicator: value.dropIndicator ? mapDropIndicator(value.dropIndicator, tr.changes) : null,
    };

    for (const effect of tr.effects) {
      if (effect.is(addUpload)) {
        const from = Math.min(effect.value.from, effect.value.to);
        const to = Math.max(effect.value.from, effect.value.to);
        const entry = {
          upload: cloneUpload(effect.value.upload),
          from,
          to,
        };
        next = {
          ...next,
          uploads: [
            ...next.uploads.filter((upload) => upload.upload.id !== entry.upload.id),
            entry,
          ],
        };
      } else if (effect.is(updateUpload)) {
        next = {
          ...next,
          uploads: next.uploads.map((entry) => (
            entry.upload.id === effect.value.id ? { ...entry, upload: cloneUpload(effect.value) } : entry
          )),
        };
      } else if (effect.is(removeUpload)) {
        next = {
          ...next,
          uploads: next.uploads.filter((entry) => entry.upload.id !== effect.value),
        };
      } else if (effect.is(setDropIndicator)) {
        next = { ...next, dropIndicator: effect.value };
      } else if (effect.is(clearDropIndicator)) {
        next = { ...next, dropIndicator: null };
      }
    }

    return next;
  },
});

export function activeUploads(state: EditorState): GalleyUploadInfo[] {
  return state.field(uploadUiField, false)?.uploads.map((entry) => cloneUpload(entry.upload)) ?? [];
}

export function uploadRangeById(
  state: EditorState,
  id: string,
): { from: number; to: number } | null {
  const entry = state.field(uploadUiField, false)?.uploads.find((upload) => upload.upload.id === id);
  return entry ? { from: entry.from, to: entry.to } : null;
}

function uploadDecorationsExtension(
  placeholderRenderer: UploadPlaceholderRenderer | undefined,
  dropIndicatorRenderer: DropIndicatorRenderer | undefined,
): Extension {
  return EditorView.decorations.compute([uploadUiField], (state) => (
    buildDecorations(state.field(uploadUiField), placeholderRenderer, dropIndicatorRenderer)
  ));
}

function uploadOverlayExtension(
  interaction: GalleyUploadInteraction,
  overlayRenderer: UploadOverlayRenderer | undefined,
): Extension {
  return ViewPlugin.fromClass(
    class {
      readonly view: EditorView;
      dom: HTMLElement | null = null;

      constructor(view: EditorView) {
        this.view = view;
        this.sync();
      }

      update(update: ViewUpdate): void {
        if (update.docChanged || update.transactions.some((tr) => tr.effects.length > 0)) {
          this.sync();
        }
      }

      destroy(): void {
        this.dom?.remove();
      }

      sync(): void {
        const uploads = activeUploads(this.view.state);
        const shouldShow = uploads.length > 0 && (interaction === 'overlay' || interaction === 'locked');

        if (!shouldShow) {
          this.dom?.remove();
          this.dom = null;
          return;
        }

        const nextDom = overlayRenderer?.(uploads) ?? defaultOverlay();
        this.dom?.remove();
        this.dom = nextDom;
        this.view.dom.append(nextDom);
      }
    },
  );
}

function lockedEditFilter(interaction: GalleyUploadInteraction): Extension {
  if (interaction !== 'locked') return [];

  return EditorState.transactionFilter.of((tr) => {
    if (!tr.docChanged || canEditWithoutUploadEffect(tr.startState) || hasUploadEffect(tr.effects)) {
      return tr;
    }

    return [];
  });
}

export function uploadUiExtension(options: {
  interaction: GalleyUploadInteraction;
  placeholderRenderer?: UploadPlaceholderRenderer;
  dropIndicatorRenderer?: DropIndicatorRenderer;
  overlayRenderer?: UploadOverlayRenderer;
}): Extension[] {
  return [
    uploadUiField,
    uploadDecorationsExtension(options.placeholderRenderer, options.dropIndicatorRenderer),
    uploadOverlayExtension(options.interaction, options.overlayRenderer),
    lockedEditFilter(options.interaction),
  ];
}
