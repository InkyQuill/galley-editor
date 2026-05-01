import type { CSSProperties, ReactNode, RefObject } from 'react';
import type { EditorSelection, EditorState, Extension, Transaction } from '@codemirror/state';
import type { Decoration, EditorView, KeyBinding, WidgetType } from '@codemirror/view';
import type { SyntaxNodeRef } from '@lezer/common';

export type GalleyMode = 'live' | 'markdown' | 'preview';

export type CodeHighlighter = (input: {
  code: string;
  language: string;
  theme: 'light' | 'dark';
}) => string | HTMLElement;

export interface GalleyRenderContext {
  theme: 'light' | 'dark';
  mode?: GalleyMode;
  canEdit?: boolean;
  codeHighlighter?: CodeHighlighter;
  imageRenderer?: ImageRenderer;
  missingImageRenderer?: MissingImageRenderer;
  imageControlsRenderer?: ImageControlsRenderer;
  onLinkClick?: LinkClickHandler;
}

export type GalleyFileSource = 'paste' | 'drop';

export interface GalleySelectionInfo {
  from: number;
  to: number;
  anchor: number;
  head: number;
}

export type GalleyFileStatusPhase = 'start' | 'progress' | 'complete' | 'error';

export interface GalleyFileStatusUpdate {
  phase: GalleyFileStatusPhase;
  progress?: number;
  message?: string;
  error?: unknown;
}

export interface GalleyFileStatus extends GalleyFileStatusUpdate {
  id: string;
  files: File[];
  source: GalleyFileSource;
  selection: GalleySelectionInfo;
}

export interface GalleyUploadInfo {
  id: string;
  files: File[];
  source: GalleyFileSource;
  selection: GalleySelectionInfo;
  phase: GalleyFileStatusPhase;
  progress?: number;
  message?: string;
  error?: unknown;
}

export type GalleyUploadInteraction = 'inline' | 'overlay' | 'locked';

export type UploadPlaceholderRenderer = (upload: GalleyUploadInfo) => HTMLElement | null;

export type DropIndicatorRenderer = (input: {
  source: 'drag';
  pos: number;
  lineFrom: number;
  lineTo: number;
}) => HTMLElement | null;

export type UploadOverlayRenderer = (uploads: GalleyUploadInfo[]) => HTMLElement | null;

export type GalleyFileReporter = (update: GalleyFileStatusUpdate) => void;

export interface GalleyFileInput {
  id: string;
  files: File[];
  source: GalleyFileSource;
  event: ClipboardEvent | DragEvent;
  view: EditorView;
  selection: GalleySelectionInfo;
  report: GalleyFileReporter;
}

export type GalleyFileHandlerResult = string | string[] | null | false;

export type GalleyFileHandler =
  (input: GalleyFileInput) => GalleyFileHandlerResult | Promise<GalleyFileHandlerResult>;

export interface GalleyImageInfo {
  alt: string;
  url: string;
  title?: string;
  width?: number;
  height?: number;
  attrs?: string[];
  raw: string;
  from: number;
  to: number;
}

export interface GalleyMissingImageInfo extends GalleyImageInfo {
  reason: 'error' | 'empty-url';
}

export interface GalleyImageMetadataInput {
  alt?: string;
  url?: string;
  title?: string | null;
  width?: number | null;
  height?: number | null;
}

export type ImageRenderer = (image: GalleyImageInfo) => HTMLElement | null;

export type MissingImageRenderer = (image: GalleyMissingImageInfo) => HTMLElement | null;

export type ImageControlsRenderer = (input: {
  image: GalleyImageInfo;
  selected: boolean;
  resizing: boolean;
  update(metadata: GalleyImageMetadataInput): void;
  clearDimensions(): void;
  revealSource(): void;
}) => HTMLElement | null;

export type LinkClickHandler = (url: string, event: MouseEvent) => boolean | void;

export type ToolbarIconName =
  | 'bold'
  | 'italic'
  | 'strikethrough'
  | 'inlineCode'
  | 'bulletList'
  | 'orderedList'
  | 'taskList'
  | 'link'
  | 'image'
  | 'codeBlock'
  | 'table'
  | 'divider'
  | 'undo'
  | 'redo'
  | 'mode';

export type ToolbarIconRenderer = (input: {
  name: ToolbarIconName;
  label: string;
  mode: GalleyMode;
}) => ReactNode;

export interface GalleyToolbarContext {
  value: string;
  mode: GalleyMode;
  canEdit: boolean;
  editor: GalleyHandle | null;
  execCommand(name: BuiltinCommand | string, ...args: unknown[]): unknown;
  setMode(mode: GalleyMode): void;
  cycleMode(): void;
}

export type GalleyToolbarSlot =
  | ReactNode
  | ((context: GalleyToolbarContext) => ReactNode);

export interface GalleyToolbarOptions {
  enabled?: boolean;
  showModeToggle?: boolean;
  icons?: Partial<Record<ToolbarIconName, ReactNode | ToolbarIconRenderer>>;
  before?: GalleyToolbarSlot;
  after?: GalleyToolbarSlot;
}

export interface GalleyFooterContext {
  value: string;
  mode: GalleyMode;
  wordCount: number;
  characterCount: number;
  editor: GalleyHandle | null;
}

export type GalleyFooterSlot =
  | ReactNode
  | ((context: GalleyFooterContext) => ReactNode);

export interface GalleyFooterOptions {
  wordCount?: boolean;
  characterCount?: boolean;
  logo?: boolean;
  before?: GalleyFooterSlot;
  after?: GalleyFooterSlot;
}

export interface GalleySurfaceOptions {
  className?: string;
  style?: CSSProperties;
  contentPadding?: string;
  toolbarPadding?: string;
  footerPadding?: string;
}

// ── Reveal strategy ─────────────────────────────────────────────────────────

/** Controls when raw markdown is shown instead of the rendered decoration. */
export type RevealStrategy = 'line' | 'select' | 'active' | boolean;

// ── Plugin spec (low-level, for building plugins) ───────────────────────────

export interface GalleyPluginSpec {
  /**
   * Return a Decoration or WidgetType to apply at this node, or null to skip.
   * `parentDepths` tracks nesting counts for parent node names during tree iteration.
   */
  createDecoration(
    node: SyntaxNodeRef,
    state: EditorState,
    parentDepths: ReadonlyMap<string, number>,
  ): WidgetType | Decoration | null;

  /** Range for line decorations. Every touched line receives the decoration. */
  getLineRange?(node: SyntaxNodeRef, state: EditorState): { from: number; to: number } | null;

  /** Range for mark and replace decorations. Null uses the full node span. */
  getMarkRange?(node: SyntaxNodeRef, state: EditorState): { from: number; to: number } | null;

  /** Position for point widgets. */
  getPointPosition?(node: SyntaxNodeRef, state: EditorState): number | null;

  /** When to show raw markdown instead of the decoration. Defaults to 'line'. */
  getRevealStrategy?(node: SyntaxNodeRef, state: EditorState): RevealStrategy;

  /** Whether cursor proximity hides the decoration. Defaults to true. */
  hideWhenNearCursor?: boolean;

  /** Performance hook for skipping selection-only decoration rebuilds. Defaults to true. */
  selectionAffectsDecorations?(prev: EditorSelection, next: EditorSelection): boolean;

  /** Force full re-render on specific transactions (e.g. external resource reload). */
  shouldForceRerender?(transaction: Transaction): boolean;
}

// ── Plugin (high-level, what consumers register) ────────────────────────────

export interface GalleyPlugin {
  /** Stable identifier. Built-ins use 'ge:headings', 'ge:emphasis', etc. */
  id: string;
  /** Return CM6 extensions that implement this plugin's behavior. */
  extensions(classNames: GalleyClassNames, context?: GalleyRenderContext): Extension[];
}

// ── Semantic CSS class overrides ────────────────────────────────────────────

export interface GalleyClassNames {
  bold?: string;
  italic?: string;
  strikethrough?: string;
  inlineCode?: string;
  link?: string;
  heading?: string;
  h1?: string;
  h2?: string;
  h3?: string;
  h4?: string;
  h5?: string;
  h6?: string;
  blockCode?: string;
  blockQuote?: string;
  table?: string;
  image?: string;
  divider?: string;
  dividerWidget?: string;
  checkbox?: string;
  completedTask?: string;
  listMarker?: string;
}

export const DEFAULT_CLASS_NAMES: Required<GalleyClassNames> = {
  bold: 'ge-bold',
  italic: 'ge-italic',
  strikethrough: 'ge-strikethrough',
  inlineCode: 'ge-code-inline',
  link: 'ge-link',
  heading: 'ge-heading',
  h1: 'ge-h1',
  h2: 'ge-h2',
  h3: 'ge-h3',
  h4: 'ge-h4',
  h5: 'ge-h5',
  h6: 'ge-h6',
  blockCode: 'ge-code-fence',
  blockQuote: 'ge-blockquote',
  table: 'ge-table',
  image: 'ge-image-frame',
  divider: 'ge-divider',
  dividerWidget: 'ge-divider-widget',
  checkbox: 'ge-checkbox',
  completedTask: 'ge-completed-task',
  listMarker: 'ge-list-marker',
};

export function resolveClassNames(overrides?: GalleyClassNames): Required<GalleyClassNames> {
  return { ...DEFAULT_CLASS_NAMES, ...overrides };
}

// ── Built-in commands ───────────────────────────────────────────────────────

export type BuiltinCommand =
  | 'toggleBold'
  | 'toggleItalic'
  | 'toggleCode'
  | 'toggleStrikethrough'
  | 'toggleHeading'
  | 'toggleBulletList'
  | 'toggleOrderedList'
  | 'toggleCheckList'
  | 'insertLink'
  | 'insertImage'
  | 'updateImageMetadata'
  | 'clearImageDimensions'
  | 'insertCodeBlock'
  | 'insertTable'
  | 'normalizeTable'
  | 'commitTableCell'
  | 'insertTableRowBefore'
  | 'insertTableRowAfter'
  | 'deleteTableRow'
  | 'insertTableColumnBefore'
  | 'insertTableColumnAfter'
  | 'deleteTableColumn'
  | 'setTableColumnAlignment'
  | 'revealTableSource'
  | 'insertHr'
  | 'indent'
  | 'outdent'
  | 'duplicateLine'
  | 'sortSelectedLines'
  | 'swapLineUp'
  | 'swapLineDown'
  | 'insertLineAfter'
  | 'insertLineBefore'
  | 'jumpToHash'
  | 'findInDocument'
  | 'undo'
  | 'redo'
  | 'selectAll';

export type CommandFn = (view: EditorView, ...args: unknown[]) => unknown;

export interface FindOpts {
  caseSensitive?: boolean;
  wholeWord?: boolean;
  regex?: boolean;
}

export interface FindResult {
  from: number;
  to: number;
  line: number;
}

// ── Imperative handle (exposed via React ref) ───────────────────────────────

export interface GalleyHandle {
  /** Get the current document content. */
  getContent(): string;
  /** Replace the entire document content. */
  setContent(value: string): void;
  /** Insert text at the current cursor position, replacing any selection. */
  insertText(text: string): void;

  /** Focus the editor. */
  focus(): void;
  /** Blur the editor. */
  blur(): void;
  /** Set the selection range. */
  select(anchor: number, head?: number): void;
  /** Get the current selection. */
  getSelection(): { from: number; to: number; anchor: number; head: number };

  /** Execute a built-in or custom command by name. */
  execCommand(name: BuiltinCommand | string, ...args: unknown[]): unknown;
  /** Register a custom command. */
  registerCommand(name: string, fn: CommandFn): void;

  /** Undo the last change. */
  undo(): void;
  /** Redo the last undone change. */
  redo(): void;

  /** Scroll to a fraction (0–1) of the document. */
  scrollTo(fraction: number): void;
  /** Scroll the current selection into view. */
  scrollSelectionIntoView(): void;

  /** Add a CM6 extension at runtime. Returns a handle to remove it. */
  addExtension(ext: Extension): { remove(): void };

  /** The underlying CodeMirror EditorView (escape hatch), or null before mount. */
  readonly view: EditorView | null;
}

export interface UseGalleyOptions {
  initialValue?: string;
  onChange?: (value: string) => void;
}

export interface UseGalleyResult {
  ref: RefObject<GalleyHandle | null>;
  content: string;
  setContent(value: string): void;
  insertText(text: string): void;
  focus(): void;
  blur(): void;
  select(anchor: number, head?: number): void;
  getSelection(): { from: number; to: number; anchor: number; head: number };
  execCommand(name: BuiltinCommand | string, ...args: unknown[]): unknown;
  undo(): void;
  redo(): void;
}

// ── Editor props ────────────────────────────────────────────────────────────

export interface GalleyEditorProps {
  /** The markdown content (controlled). */
  value?: string;
  /** Called when the document changes. */
  onChange?: (value: string) => void;

  /** Whether the editor is editable. Default: true. */
  editable?: boolean;
  /** Placeholder text shown when the editor is empty. */
  placeholder?: string;
  /** Accessible name for the underlying CodeMirror content element. */
  ariaLabel?: string;

  /** Minimum visible rows. Default: 3. */
  minRows?: number;
  /** Maximum visible rows before scrolling. Default: undefined (unlimited). */
  maxRows?: number;

  /** CSS class for the outer wrapper div. */
  className?: string;
  /** CSS class applied to the CodeMirror .cm-editor element. */
  editorClassName?: string;
  /** Override semantic CSS class names for rendered elements. */
  classNames?: GalleyClassNames;

  /** Color scheme. Default: 'auto'. */
  theme?: 'light' | 'dark' | 'auto';
  /** Tab inserts/deletes indentation instead of moving focus out. Default: true. */
  tabIndents?: boolean;
  /** Override or extend the default keymap. */
  keymap?: KeyBinding[] | ((defaults: KeyBinding[]) => KeyBinding[]);
  /** Optional code highlighter for inactive fenced code block rendering. */
  codeHighlighter?: CodeHighlighter;
  /** Optional renderer for markdown images. Defaults to built-in image widgets. */
  imageRenderer?: ImageRenderer;
  /** Optional renderer for unavailable markdown images. */
  missingImageRenderer?: MissingImageRenderer;
  /** Optional renderer for selected markdown image controls. */
  imageControlsRenderer?: ImageControlsRenderer;
  /** Optional Cmd/Ctrl-click link handler. Return true to suppress default opening. */
  onLinkClick?: LinkClickHandler;
  /** Add dir="auto" to editor lines for browser bidi handling. Default: false. */
  bidi?: boolean;
  /** Show and customize the built-in command toolbar, including icon overrides and before/after slots. Default: true. */
  toolbar?: boolean | GalleyToolbarOptions;
  /** Show and customize the built-in status footer, including stats/logo visibility and before/after widgets. Default: true. */
  footer?: boolean | GalleyFooterOptions;
  /** Visual mode. Default: 'live'. `editable={false}` always renders as 'preview'. */
  mode?: GalleyMode;
  /** Called when the built-in mode toggle requests a mode change. */
  onModeChange?: (mode: GalleyMode) => void;
  /** Optional shell styling hooks for gradients, frosted glass, and paddings. */
  surface?: GalleySurfaceOptions;

  /** Additional plugins to register alongside built-ins. */
  plugins?: GalleyPlugin[];
  /** Built-in plugin IDs to disable. */
  disabledPlugins?: string[];
  /** Additional CM6 extensions (appended after all internal extensions). */
  extensions?: Extension[];

  // ── Events ────────────────────────────────────────────────────────────────
  onFocus?: () => void;
  onBlur?: () => void;
  onSelectionChange?: (selection: { from: number; to: number; anchor: number; head: number }) => void;
  onScroll?: (fraction: number) => void;
  /** Handle Enter key. Return true to suppress default behavior. */
  onEnter?: (mod: boolean, shift: boolean) => boolean;
  /** Handle Escape key. Return true to consume the key. */
  onEscape?: () => boolean | void;
  /** Handle paste events. */
  onPaste?: (event: ClipboardEvent, view: EditorView) => void;
  /** Handle pasted or dropped files before built-in insertion. */
  onFiles?: GalleyFileHandler;
  /** Controls how in-flight uploads are represented. Default: 'inline'. */
  uploadInteraction?: GalleyUploadInteraction;
  /** Optional renderer for inline upload placeholders. */
  uploadPlaceholderRenderer?: UploadPlaceholderRenderer;
  /** Optional renderer for drag/drop insertion indicators. */
  dropIndicatorRenderer?: DropIndicatorRenderer;
  /** Optional renderer for aggregate upload overlays. */
  uploadOverlayRenderer?: UploadOverlayRenderer;
  /** Handle errors raised while processing pasted or dropped files. */
  onFileError?: (error: unknown, input: GalleyFileInput) => void;
  /** Observe consumer-owned file handling status and progress. */
  onFileStatus?: (status: GalleyFileStatus) => void;
  /** Handle Cmd/Ctrl+Enter. */
  onSubmit?: () => void;
}
