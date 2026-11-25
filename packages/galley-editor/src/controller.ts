/**
 * EditorController: owns the CodeMirror EditorView and provides the imperative API.
 *
 * Uses Compartments to update extensions and reset history without recreating the view.
 */

import {
  EditorView,
  ViewPlugin,
  keymap,
  placeholder as cmPlaceholder,
  type KeyBinding,
  type ViewUpdate,
} from '@codemirror/view';
import {
  Annotation,
  Compartment,
  EditorSelection,
  EditorState,
  StateEffect,
  Transaction,
  type Extension,
} from '@codemirror/state';
import { markdown } from '@codemirror/lang-markdown';
import { GFM } from '@lezer/markdown';
import {
  history,
  standardKeymap,
  historyKeymap,
} from '@codemirror/commands';
import { indentOnInput, bracketMatching } from '@codemirror/language';
import { drawSelection, dropCursor, highlightSpecialChars } from '@codemirror/view';
import { openSearchPanel, search, searchKeymap } from '@codemirror/search';

import { buildCmTheme, resolveColorScheme, type ColorScheme } from './theme';
import { autosizeExtension } from './autosize';
import { BUILT_IN_PLUGINS } from './plugins';
import { biDirectionalTextExtension } from './plugins/bidi';
import {
  addUpload,
  clearDropIndicator,
  removeUpload,
  setDropIndicator,
  updateUpload,
  uploadRangeById,
  uploadUiExtension,
} from './upload-ui';
import {
  BUILTIN_COMMANDS,
  DEFAULT_KEYMAP,
  makeSmartBackspaceTransaction,
  makeSmartEnterTransaction,
  makeSmartTabTransaction,
  type GalleyKeyBinding,
} from './commands';
import { getHeadings, getViewport, revealPosition, type GalleyViewport, type RevealPositionOptions } from './commands/navigation/headings';
import { parseListLine } from './commands/list-syntax';
import {
  resolveClassNames,
  type CommandFn,
  type CodeHighlighter,
  type GalleyFileHandler,
  type GalleyFileInput,
  type GalleyFileReporter,
  type GalleyFileSource,
  type GalleyFileStatus,
  type GalleyFileStatusUpdate,
  type GalleyUploadInteraction,
  type GalleyUploadInfo,
  type ImageRenderer,
  type ImageSourceResolver,
  type ImageControlsRenderer,
  type LinkClickHandler,
  type MissingImageRenderer,
  type DropIndicatorRenderer,
  type GalleyClassNames,
  type GalleyHandle,
  type GalleyLayoutMode,
  type GalleyMode,
  type GalleyPlugin,
  type GalleyTableControlIcons,
  type UploadOverlayRenderer,
  type UploadPlaceholderRenderer,
} from './types';

// ── Callback refs (stable references that the static extensions call into) ──

const externalValue = Annotation.define<boolean>();

export interface EditorCallbacks {
  onUpdate?: (update: ViewUpdate, value?: string) => void;
  onChange?: (value: string) => void;
  onSelectionChange?: (sel: {
    from: number;
    to: number;
    anchor: number;
    head: number;
  }) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onScroll?: (fraction: number) => void;
  onViewportChange?: (viewport: GalleyViewport) => void;
  onPaste?: (event: ClipboardEvent, view: EditorView) => void;
  onFiles?: GalleyFileHandler;
  onFileError?: (error: unknown, input: GalleyFileInput) => void;
  onFileStatus?: (status: GalleyFileStatus) => void;
  onEnter?: (mod: boolean, shift: boolean) => boolean;
  onEscape?: () => boolean | void;
  onSubmit?: () => void;
}

// ── Settings used for Compartment reconfiguration ───────────────────────────

export interface ControllerSettings {
  editable: boolean;
  placeholder: string;
  ariaLabel?: string;
  spellcheck?: boolean;
  theme: ColorScheme;
  editorClassName: string;
  classNames?: GalleyClassNames;
  minRows: number;
  maxRows?: number;
  layout: GalleyLayoutMode;
  horizontalScroll: boolean;
  tabIndents: boolean;
  keymap?: KeyBinding[] | ((defaults: KeyBinding[]) => KeyBinding[]);
  codeHighlighter?: CodeHighlighter;
  imageRenderer?: ImageRenderer;
  resolveImageSource?: ImageSourceResolver;
  missingImageRenderer?: MissingImageRenderer;
  imageControlsRenderer?: ImageControlsRenderer;
  tableControlIcons?: GalleyTableControlIcons;
  onLinkClick?: LinkClickHandler;
  bidi: boolean;
  mode: GalleyMode;
  plugins: GalleyPlugin[];
  disabledPlugins: string[];
  extraExtensions: Extension[];
  uploadInteraction: GalleyUploadInteraction;
  uploadPlaceholderRenderer?: UploadPlaceholderRenderer;
  dropIndicatorRenderer?: DropIndicatorRenderer;
  uploadOverlayRenderer?: UploadOverlayRenderer;
}

function getScrollFraction(view: EditorView): number {
  const { scrollTop, scrollHeight, clientHeight } = view.scrollDOM;
  const max = scrollHeight - clientHeight;
  return max > 0 ? scrollTop / max : 0;
}

interface CoalescedCallback<T extends unknown[]> {
  (...args: T): void;
  cancel(): void;
}

function rafCoalesce<T extends unknown[]>(fn: (...args: T) => void): CoalescedCallback<T> {
  let frame: number | null = null;
  let latest: T | null = null;

  const coalesced = ((...args: T) => {
    latest = args;
    if (frame !== null) return;
    frame = requestAnimationFrame(() => {
      frame = null;
      const value = latest;
      latest = null;
      if (value) fn(...value);
    });
  }) as CoalescedCallback<T>;

  coalesced.cancel = () => {
    if (frame !== null) {
      cancelAnimationFrame(frame);
      frame = null;
    }
    latest = null;
  };

  return coalesced;
}

function classTokens(className: string): Set<string> {
  return new Set(className.split(/\s+/).filter(Boolean));
}

function syncClassTokens(view: EditorView, previous: Set<string>, next: Set<string>): void {
  for (const token of previous) {
    if (!next.has(token)) view.dom.classList.remove(token);
  }
  for (const token of next) {
    if (!previous.has(token)) view.dom.classList.add(token);
  }
}

function editorClassNameExtension(className: string): Extension {
  const desiredTokens = classTokens(className);

  return [
    EditorView.editorAttributes.of(className ? { class: className } : {}),
    ViewPlugin.define((view) => {
      let previousTokens = new Set<string>();
      const sync = () => {
        syncClassTokens(view, previousTokens, desiredTokens);
        previousTokens = new Set(desiredTokens);
      };

      sync();

      return {
        update: sync,
        destroy() {
          syncClassTokens(view, previousTokens, new Set());
        },
      };
    }),
  ];
}

// ── EditorController ────────────────────────────────────────────────────────

export class EditorController implements GalleyHandle {
  readonly view: EditorView;

  private readonly dynamicCompartment = new Compartment();
  private readonly horizontalLayoutCompartment = new Compartment();
  private readonly autosizeCompartment = new Compartment();
  private readonly historyCompartment = new Compartment();
  private readonly keymapCompartment = new Compartment();
  private readonly runtimeExtensionsCompartment = new Compartment();
  private readonly editorClassNameCompartment = new Compartment();
  private readonly runtimeExtensions = new Map<symbol, Extension>();
  private readonly pendingFileRanges = new Set<{ from: number; to: number }>();
  private resolvedKeymap: GalleyKeyBinding[] = [];

  private fileOperationSeq = 0;
  private readonly customCommands = new Map<string, CommandFn>();
  private settings: ControllerSettings;
  private resolvedTheme: ReturnType<typeof resolveColorScheme>;
  private callbacks: EditorCallbacks;
  private readonly dispatchSelectionChange: CoalescedCallback<[{
    from: number;
    to: number;
    anchor: number;
    head: number;
  }]>;
  private lastViewport: GalleyViewport | undefined;
  private readonly dispatchViewportChange: CoalescedCallback<[]>;
  private readonly dispatchScroll: CoalescedCallback<[number]>;

  constructor(
    parent: HTMLElement,
    initialValue: string,
    settings: ControllerSettings,
    callbacks: EditorCallbacks,
  ) {
    this.settings = settings;
    this.resolvedTheme = resolveColorScheme(settings.theme);
    this.callbacks = callbacks;
    this.dispatchSelectionChange = rafCoalesce((sel) => {
      this.callbacks.onSelectionChange?.(sel);
    });
    this.dispatchViewportChange = rafCoalesce(() => {
      const viewport = this.getViewport();
      if (viewport.from === this.lastViewport?.from && viewport.to === this.lastViewport.to) return;
      this.lastViewport = viewport;
      this.callbacks.onViewportChange?.(viewport);
    });
    this.dispatchScroll = rafCoalesce((fraction) => {
      this.callbacks.onScroll?.(fraction);
    });

    const state = EditorState.create({
      doc: initialValue,
      extensions: [
        // Static extensions (never change)
        ...this.buildStaticExtensions(),
        // Dynamic (reconfigured on settings change)
        this.dynamicCompartment.of(this.buildDynamicExtensions()),
        // Horizontal layout (reconfigured when line wrapping changes)
        this.horizontalLayoutCompartment.of(
          this.buildHorizontalLayoutExtension(settings.horizontalScroll),
        ),
        // Autosize (reconfigured on minRows/maxRows change)
        this.autosizeCompartment.of(
          settings.layout === 'autosize'
            ? autosizeExtension(settings.minRows, settings.maxRows)
            : [],
        ),
        // History (separate so it can be cleared independently)
        this.historyCompartment.of(history()),
        // Configured keymap
        this.keymapCompartment.of(this.buildKeymap(this.settings)),
        // Runtime extensions added through the imperative handle
        this.runtimeExtensionsCompartment.of([]),
        // Classes applied to the .cm-editor root
        this.editorClassNameCompartment.of(
          editorClassNameExtension(settings.editorClassName),
        ),
      ],
    });

    this.view = new EditorView({ state, parent });
  }

  // ── Static extensions (created once) ──────────────────────────────────

  private buildHorizontalLayoutExtension(horizontalScroll: boolean): Extension {
    return [
      EditorView.editorAttributes.of({
        class: horizontalScroll ? 'ge-horizontal-scroll' : 'ge-width-constrained',
      }),
      ...(horizontalScroll ? [] : [EditorView.lineWrapping]),
      EditorView.theme({
        '.cm-scroller': {
          overflowX: horizontalScroll ? 'auto' : 'hidden',
        },
      }),
    ];
  }

  private buildStaticExtensions(): Extension[] {
    return [
      // Galley's keymap owns list continuation/deletion and callback hooks.
      markdown({ extensions: [GFM], addKeymap: false }),
      highlightSpecialChars(),
      drawSelection(),
      dropCursor(),
      indentOnInput(),
      bracketMatching(),
      search(),
      EditorState.allowMultipleSelections.of(true),
      EditorState.tabSize.of(2),

      // Event listeners (use callback refs so they never go stale)
      EditorView.updateListener.of((update) => {
        let value: string | undefined;
        if (update.docChanged) {
          this.mapPendingFileRanges(update);
          value = update.state.doc.toString();
          if (update.transactions.some((tr) => tr.docChanged && !tr.annotation(externalValue))) {
            this.callbacks.onChange?.(value);
          }
        }
        this.callbacks.onUpdate?.(update, value);
        if (update.viewportChanged || update.geometryChanged || update.docChanged) {
          this.dispatchViewportChange();
        }
        if (update.selectionSet) {
          const sel = update.state.selection.main;
          this.dispatchSelectionChange({
            from: sel.from,
            to: sel.to,
            anchor: sel.anchor,
            head: sel.head,
          });
        }
        if (update.focusChanged) {
          if (update.view.hasFocus) {
            this.callbacks.onFocus?.();
          } else {
            this.callbacks.onBlur?.();
          }
        }
      }),

      EditorView.domEventHandlers({
        scroll: (_e, view) => {
          this.dispatchScroll(getScrollFraction(view));
          this.dispatchViewportChange();
        },
        paste: (e, view) => {
          const files = this.filesFromDataTransfer(e.clipboardData);
          if (this.canEditDocument() && files.length > 0 && this.callbacks.onFiles) {
            e.preventDefault();
            void this.handleFiles(files, 'paste', e);
          }
          this.callbacks.onPaste?.(e, view);
        },
        dragover: (e) => {
          if (
            this.canEditDocument() &&
            this.callbacks.onFiles &&
            this.hasFileData(e.dataTransfer)
          ) {
            e.preventDefault();
            this.setDropIndicatorForEvent(e);
          }
        },
        dragleave: () => {
          this.view.dispatch({ effects: clearDropIndicator.of(undefined) });
        },
        drop: (e) => {
          const files = this.filesFromDataTransfer(e.dataTransfer);
          if (!this.canEditDocument() || !this.callbacks.onFiles || files.length === 0) return;
          e.preventDefault();
          this.view.dispatch({ effects: clearDropIndicator.of(undefined) });
          const insertAt = this.dropPositionForEvent(e);
          void this.handleFiles(files, 'drop', e, insertAt, insertAt);
        },
      }),
    ];
  }

  private canEditDocument(): boolean {
    return this.settings.editable && this.settings.mode !== 'preview';
  }

  private getSelectionInfo() {
    const sel = this.view.state.selection.main;
    return { from: sel.from, to: sel.to, anchor: sel.anchor, head: sel.head };
  }

  private mapPendingFileRanges(update: ViewUpdate): void {
    for (const range of this.pendingFileRanges) {
      if (range.from === range.to) {
        const pos = update.changes.mapPos(range.from, 1);
        range.from = pos;
        range.to = pos;
        continue;
      }

      range.from = update.changes.mapPos(range.from, 1);
      range.to = update.changes.mapPos(range.to, -1);
      if (range.to < range.from) range.to = range.from;
    }
  }

  private filesFromDataTransfer(dataTransfer: DataTransfer | null): File[] {
    return Array.from(dataTransfer?.files ?? []);
  }

  private hasFileData(dataTransfer: DataTransfer | null): boolean {
    if (!dataTransfer) return false;
    return dataTransfer.files.length > 0 || Array.from(dataTransfer.types).includes('Files');
  }

  private dropPositionForEvent(event: DragEvent): number {
    let pos: number | null = null;
    try {
      pos = this.view.posAtCoords({ x: event.clientX, y: event.clientY });
    } catch {
      pos = null;
    }
    return pos ?? this.view.state.selection.main.from;
  }

  private setDropIndicatorForEvent(event: DragEvent): void {
    const pos = this.dropPositionForEvent(event);
    const line = this.view.state.doc.lineAt(pos);
    this.view.dispatch({
      effects: setDropIndicator.of({
        pos,
        lineFrom: line.from,
        lineTo: line.to,
      }),
    });
  }

  private insertFileHandlerMarkdown(
    markdown: string | string[],
    from: number,
    to: number,
    effects: StateEffect<unknown>[] = [],
  ): void {
    if (!this.canEditDocument()) return;
    const text = Array.isArray(markdown) ? markdown.join('\n') : markdown;
    if (!text) return;
    this.view.dispatch({
      changes: { from, to, insert: text },
      effects,
      selection: { anchor: from + text.length },
      scrollIntoView: true,
    });
  }

  private async handleFiles(
    files: File[],
    source: GalleyFileSource,
    event: ClipboardEvent | DragEvent,
    from = this.view.state.selection.main.from,
    to = this.view.state.selection.main.to,
  ): Promise<void> {
    const handler = this.callbacks.onFiles;
    if (!handler || files.length === 0) return;
    const pendingRange = { from, to };
    this.pendingFileRanges.add(pendingRange);
    const id = `galley-file-${++this.fileOperationSeq}`;
    const selection = this.getSelectionInfo();
    const uploadInfo = (update: GalleyFileStatusUpdate): GalleyUploadInfo => ({
      id,
      files,
      source,
      selection,
      ...update,
    });
    const report: GalleyFileReporter = (update) => {
      const nextUpload = uploadInfo(update);
      this.view.dispatch({ effects: updateUpload.of(nextUpload) });
      try {
        this.callbacks.onFileStatus?.(nextUpload);
      } catch (error) {
        console.error('Galley file status handler failed', error);
      }
    };

    const input: GalleyFileInput = {
      id,
      files,
      source,
      event,
      view: this.view,
      selection,
      report,
    };

    try {
      const startUpload = uploadInfo({ phase: 'start', progress: 0 });
      this.view.dispatch({
        effects: addUpload.of({
          upload: startUpload,
          from: pendingRange.from,
          to: pendingRange.to,
        }),
      });
      try {
        this.callbacks.onFileStatus?.(startUpload);
      } catch (error) {
        console.error('Galley file status handler failed', error);
      }
      const result = await handler(input);
      if (result !== false && result !== null) {
        const completeUpload = uploadInfo({ phase: 'complete', progress: 1 });
        const mappedRange = uploadRangeById(this.view.state, id) ?? pendingRange;
        this.insertFileHandlerMarkdown(
          result,
          mappedRange.from,
          mappedRange.to,
          [updateUpload.of(completeUpload)],
        );
        try {
          this.callbacks.onFileStatus?.(completeUpload);
        } catch (error) {
          console.error('Galley file status handler failed', error);
        }
      } else {
        report({ phase: 'complete', progress: 1 });
      }
    } catch (error) {
      report({ phase: 'error', error });
      this.callbacks.onFileError?.(error, input);
      if (!this.callbacks.onFileError) {
        console.error('Galley file handler failed', error);
      }
    } finally {
      this.view.dispatch({ effects: removeUpload.of(id) });
      this.pendingFileRanges.delete(pendingRange);
    }
  }

  private handleEnter(cm: EditorView, mod: boolean, shift: boolean): boolean {
    // Mod+Enter triggers submit (Cmd/Ctrl+Enter)
    if (mod && !shift && this.callbacks.onSubmit) {
      this.callbacks.onSubmit();
      return true;
    }
    if (this.callbacks.onEnter) {
      const handled = this.callbacks.onEnter(mod, shift);
      if (handled) return true;
    }

    cm.dispatch({
      ...makeSmartEnterTransaction(cm.state),
      scrollIntoView: true,
    });
    return true;
  }

  private handleDefaultEnter(cm: EditorView): boolean {
    cm.dispatch({
      ...cm.state.changeByRange((range) => ({
        changes: { from: range.from, to: range.to, insert: '\n' },
        range: EditorSelection.cursor(range.from + 1),
      })),
      scrollIntoView: true,
    });
    return true;
  }

  private handleTab(cm: EditorView, shift: boolean): boolean {
    const ranges = cm.state.selection.ranges;
    const hasListSelection = ranges.some((range) => {
      const line = cm.state.doc.lineAt(range.from);
      return parseListLine(line.text) !== null;
    });

    if (hasListSelection) {
      cm.dispatch({
        ...makeSmartTabTransaction(cm.state, shift),
        scrollIntoView: true,
      });
      return true;
    }

    if (!this.settings.tabIndents) {
      return false;
    }

    if (shift) {
      this.execCommand('outdent');
      return true;
    }

    this.execCommand('indent');
    return true;
  }

  private handleBackspace(cm: EditorView): boolean {
    cm.dispatch({
      ...makeSmartBackspaceTransaction(cm.state),
      scrollIntoView: true,
    });
    return true;
  }

  private buildCommandKeymap(): GalleyKeyBinding[] {
    return DEFAULT_KEYMAP.map((binding) => {
      if (!binding.command) return binding;
      const { command, args = [] } = binding;
      return {
        ...binding,
        run: () => (command === 'selectAll' || this.canEditDocument())
          && this.execCommand(command, ...args) !== false,
      } satisfies GalleyKeyBinding;
    });
  }

  private buildKeymap(settings: ControllerSettings): Extension {
    const controllerDefaults: KeyBinding[] = [
      { key: 'Enter', run: (cm) => this.canEditDocument() && this.handleEnter(cm, false, false) },
      { key: 'Shift-Enter', run: (cm) => this.canEditDocument() && this.handleDefaultEnter(cm) },
      { key: 'Mod-Enter', run: (cm) => this.canEditDocument() && this.handleEnter(cm, true, false) },
      { key: 'Mod-Shift-Enter', run: () => false },
      { key: 'Tab', run: (cm) => this.canEditDocument() && this.handleTab(cm, false) },
      { key: 'Shift-Tab', run: (cm) => this.canEditDocument() && this.handleTab(cm, true) },
      { key: 'Backspace', run: (cm) => this.canEditDocument() && this.handleBackspace(cm) },
      {
        key: 'Escape',
        run: () => {
          const handled = this.callbacks.onEscape?.();
          return handled === true;
        },
      },
    ];

    const combinedKeymap: GalleyKeyBinding[] = [
      ...controllerDefaults,
      ...this.buildCommandKeymap(),
      ...searchKeymap,
      ...standardKeymap,
      ...historyKeymap,
    ];
    let resolvedKeymap: KeyBinding[];
    if (typeof settings.keymap === 'function') {
      resolvedKeymap = settings.keymap(combinedKeymap);
    } else if (settings.keymap) {
      resolvedKeymap = settings.keymap;
    } else {
      resolvedKeymap = combinedKeymap;
    }
    this.resolvedKeymap = resolvedKeymap as GalleyKeyBinding[];
    return keymap.of(resolvedKeymap);
  }

  // ── Dynamic extensions (reconfigured on settings change) ──────────────

  private buildDynamicExtensions(): Extension[] {
    const { settings } = this;
    const resolved = resolveClassNames(settings.classNames);
    const disabledSet = new Set(settings.disabledPlugins);
    const canEditDocument = settings.editable && settings.mode !== 'preview';

    const allPlugins = [...BUILT_IN_PLUGINS, ...settings.plugins];
    const renderContext = {
      theme: this.resolvedTheme,
      mode: settings.mode,
      canEdit: canEditDocument,
      codeHighlighter: settings.codeHighlighter,
      imageRenderer: settings.imageRenderer,
      resolveImageSource: settings.resolveImageSource,
      missingImageRenderer: settings.missingImageRenderer,
      imageControlsRenderer: settings.imageControlsRenderer,
      tableControlIcons: settings.tableControlIcons,
      onLinkClick: settings.onLinkClick,
    };
    const pluginExtensions = settings.mode === 'markdown'
      ? []
      : allPlugins
        .filter((p) => !disabledSet.has(p.id))
        .flatMap((p) => p.extensions(resolved, renderContext));

    return [
      // Theme
      ...buildCmTheme(this.resolvedTheme),
      // Editability
      EditorView.editable.of(canEditDocument),
      EditorState.readOnly.of(!canEditDocument),
      EditorView.contentAttributes.of({
        ...(settings.ariaLabel ? { 'aria-label': settings.ariaLabel } : {}),
        ...(settings.spellcheck !== undefined ? { spellcheck: String(settings.spellcheck) } : {}),
        // Non-editable content still needs keyboard focus for search and copy.
        ...(!canEditDocument ? { tabindex: '0' } : {}),
      }),
      // Placeholder
      ...(settings.placeholder ? [cmPlaceholder(settings.placeholder)] : []),
      ...uploadUiExtension({
        interaction: settings.uploadInteraction,
        placeholderRenderer: settings.uploadPlaceholderRenderer,
        dropIndicatorRenderer: settings.dropIndicatorRenderer,
        overlayRenderer: settings.uploadOverlayRenderer,
      }),
      // All plugin extensions
      ...pluginExtensions,
      ...(settings.bidi ? [biDirectionalTextExtension] : []),
      // Consumer's extra extensions (last, so they can override)
      ...settings.extraExtensions,
    ];
  }

  // ── Public: update settings without destroying the view ───────────────

  updateSettings(newSettings: ControllerSettings) {
    const resolvedTheme = resolveColorScheme(newSettings.theme);
    const previous = this.settings;
    const dynamicChanged =
      resolvedTheme !== this.resolvedTheme ||
      newSettings.editable !== previous.editable ||
      newSettings.mode !== previous.mode ||
      newSettings.ariaLabel !== previous.ariaLabel ||
      newSettings.spellcheck !== previous.spellcheck ||
      newSettings.placeholder !== previous.placeholder ||
      newSettings.classNames !== previous.classNames ||
      newSettings.plugins !== previous.plugins ||
      newSettings.disabledPlugins !== previous.disabledPlugins ||
      newSettings.extraExtensions !== previous.extraExtensions ||
      newSettings.bidi !== previous.bidi ||
      newSettings.codeHighlighter !== previous.codeHighlighter ||
      newSettings.imageRenderer !== previous.imageRenderer ||
      newSettings.resolveImageSource !== previous.resolveImageSource ||
      newSettings.missingImageRenderer !== previous.missingImageRenderer ||
      newSettings.imageControlsRenderer !== previous.imageControlsRenderer ||
      newSettings.tableControlIcons !== previous.tableControlIcons ||
      newSettings.onLinkClick !== previous.onLinkClick ||
      newSettings.uploadInteraction !== previous.uploadInteraction ||
      newSettings.uploadPlaceholderRenderer !== previous.uploadPlaceholderRenderer ||
      newSettings.dropIndicatorRenderer !== previous.dropIndicatorRenderer ||
      newSettings.uploadOverlayRenderer !== previous.uploadOverlayRenderer;
    const effects: StateEffect<unknown>[] = [];

    const keymapChanged =
      newSettings.tabIndents !== this.settings.tabIndents ||
      newSettings.keymap !== this.settings.keymap;

    if (newSettings.horizontalScroll !== this.settings.horizontalScroll) {
      effects.push(
        this.horizontalLayoutCompartment.reconfigure(
          this.buildHorizontalLayoutExtension(newSettings.horizontalScroll),
        ),
      );
    }

    // Check if autosize needs reconfiguring
    if (
      newSettings.layout !== this.settings.layout ||
      newSettings.minRows !== this.settings.minRows ||
      newSettings.maxRows !== this.settings.maxRows
    ) {
      effects.push(
        this.autosizeCompartment.reconfigure(
          newSettings.layout === 'autosize'
            ? autosizeExtension(newSettings.minRows, newSettings.maxRows)
            : [],
        ),
      );
    }

    if (newSettings.editorClassName !== this.settings.editorClassName) {
      effects.push(
        this.editorClassNameCompartment.reconfigure(
          editorClassNameExtension(newSettings.editorClassName),
        ),
      );
    }

    if (keymapChanged) {
      effects.push(
        this.keymapCompartment.reconfigure(this.buildKeymap(newSettings)),
      );
    }

    this.settings = newSettings;

    this.resolvedTheme = resolvedTheme;
    if (dynamicChanged) {
      effects.push(this.dynamicCompartment.reconfigure(this.buildDynamicExtensions()));
    }

    if (effects.length > 0) {
      this.view.dispatch({ effects });
    }
  }

  // ── GalleyHandle implementation ─────────────────────────────────────

  getResolvedKeymap(): readonly GalleyKeyBinding[] {
    return this.resolvedKeymap;
  }

  getContent(): string {
    return this.view.state.doc.toString();
  }

  getHeadings() {
    return getHeadings(this.view.state);
  }

  getViewport(): GalleyViewport {
    return getViewport(this.view);
  }

  revealPosition(position: number, options?: RevealPositionOptions): void {
    revealPosition(this.view, position, options);
  }

  setContent(value: string): void {
    this.replaceContent(value, false);
  }

  syncValue(value: string, documentChanged: boolean): void {
    if (documentChanged) this.replaceDocument(value, true);
    else this.replaceContent(value, true);
  }

  private replaceContent(value: string, external: boolean): void {
    const { state } = this.view;
    const current = state.doc.toString();
    const next = state.toText(value);
    if (next.eq(state.doc)) return;

    let from = 0;
    let to = current.length;
    let nextTo = next.length;
    if (external) {
      // Keep changes outside the replaced range available in the undo history.
      const normalized = next.toString();
      const limit = Math.min(to, nextTo);
      while (from < limit && current[from] === normalized[from]) from++;
      while (to > from && nextTo > from && current[to - 1] === normalized[nextTo - 1]) {
        to--;
        nextTo--;
      }
    }
    const clamp = (pos: number) => Math.min(pos, next.length);
    const nextRanges = state.selection.ranges.map((range) =>
      EditorSelection.range(clamp(range.anchor), clamp(range.head)),
    );
    this.view.dispatch({
      changes: { from, to, insert: next.slice(from, nextTo) },
      annotations: external ? [externalValue.of(true), Transaction.addToHistory.of(false)] : undefined,
      selection: EditorSelection.create(nextRanges, state.selection.mainIndex),
    });
  }

  setDocument(value: string): void {
    this.replaceDocument(value, false);
  }

  private replaceDocument(value: string, external: boolean): void {
    const { state } = this.view;
    this.view.dispatch({
      changes: { from: 0, to: state.doc.length, insert: value },
      selection: EditorSelection.cursor(0),
      annotations: [Transaction.addToHistory.of(false), externalValue.of(external)],
      effects: this.historyCompartment.reconfigure([]),
    });
    this.view.dispatch({
      effects: this.historyCompartment.reconfigure(history()),
    });
    this.view.scrollDOM.scrollTop = 0;
  }

  insertText(text: string): void {
    this.view.dispatch(this.view.state.replaceSelection(text));
  }

  focus(): void {
    this.view.focus();
  }

  blur(): void {
    this.view.contentDOM.blur();
  }

  openSearch(): boolean {
    return openSearchPanel(this.view);
  }

  select(anchor: number, head?: number): void {
    const len = this.view.state.doc.length;
    const a = Math.max(0, Math.min(anchor, len));
    const h = Math.max(0, Math.min(head ?? anchor, len));
    this.view.dispatch({
      selection: EditorSelection.range(a, h),
    });
  }

  getSelection() {
    const sel = this.view.state.selection.main;
    return { from: sel.from, to: sel.to, anchor: sel.anchor, head: sel.head };
  }

  execCommand(name: string, ...args: unknown[]): unknown {
    if (this.customCommands.has(name)) {
      return this.customCommands.get(name)!(this.view, ...args);
    }
    const builtin = BUILTIN_COMMANDS[name as keyof typeof BUILTIN_COMMANDS];
    if (builtin) {
      return builtin(this.view, ...args);
    }
    console.warn(`[GalleyEditor] Unknown command: ${name}`);
    return undefined;
  }

  registerCommand(name: string, fn: CommandFn): void {
    this.customCommands.set(name, fn);
  }

  undo(): void {
    this.execCommand('undo');
  }

  redo(): void {
    this.execCommand('redo');
  }

  scrollTo(fraction: number): void {
    const { scrollHeight, clientHeight } = this.view.scrollDOM;
    const max = scrollHeight - clientHeight;
    this.view.scrollDOM.scrollTop = fraction * max;
  }

  scrollSelectionIntoView(): void {
    this.view.dispatch({ scrollIntoView: true });
  }

  addExtension(ext: Extension): { remove: () => void } {
    const id = Symbol('runtimeExtension');
    this.runtimeExtensions.set(id, ext);
    this.reconfigureRuntimeExtensions();
    return {
      remove: () => {
        if (!this.runtimeExtensions.delete(id)) return;
        this.reconfigureRuntimeExtensions();
      },
    };
  }

  private reconfigureRuntimeExtensions(): void {
    this.view.dispatch({
      effects: this.runtimeExtensionsCompartment.reconfigure(
        Array.from(this.runtimeExtensions.values()),
      ),
    });
  }

  /** Clean up the editor view. */
  destroy(): void {
    this.dispatchSelectionChange.cancel();
    this.dispatchScroll.cancel();
    this.dispatchViewportChange.cancel();
    this.view.destroy();
  }
}
