import type { CSSProperties, ReactNode, RefObject } from 'react';
import type { EditorSelection, EditorState, Extension, Transaction } from '@codemirror/state';
import type { Decoration, EditorView, KeyBinding, WidgetType } from '@codemirror/view';
import type { SyntaxNodeRef } from '@lezer/common';

export type NeutrinoMode = 'live' | 'markdown' | 'preview';

export type CodeHighlighter = (input: {
  code: string;
  language: string;
  theme: 'light' | 'dark';
}) => string | HTMLElement;

export interface NeutrinoRenderContext {
  theme: 'light' | 'dark';
  mode?: NeutrinoMode;
  codeHighlighter?: CodeHighlighter;
  imageRenderer?: ImageRenderer;
  onLinkClick?: LinkClickHandler;
}

export type ImageRenderer = (image: {
  alt: string;
  url: string;
  title?: string;
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
  mode: NeutrinoMode;
}) => ReactNode;

export interface NeutrinoToolbarContext {
  value: string;
  mode: NeutrinoMode;
  canEdit: boolean;
  editor: NeutrinoHandle | null;
  execCommand(name: BuiltinCommand | string, ...args: unknown[]): unknown;
  setMode(mode: NeutrinoMode): void;
  cycleMode(): void;
}

export type NeutrinoToolbarSlot =
  | ReactNode
  | ((context: NeutrinoToolbarContext) => ReactNode);

export interface NeutrinoToolbarOptions {
  enabled?: boolean;
  showModeToggle?: boolean;
  icons?: Partial<Record<ToolbarIconName, ReactNode | ToolbarIconRenderer>>;
  before?: NeutrinoToolbarSlot;
  after?: NeutrinoToolbarSlot;
}

export interface NeutrinoFooterContext {
  value: string;
  mode: NeutrinoMode;
  wordCount: number;
  characterCount: number;
  editor: NeutrinoHandle | null;
}

export type NeutrinoFooterSlot =
  | ReactNode
  | ((context: NeutrinoFooterContext) => ReactNode);

export interface NeutrinoFooterOptions {
  wordCount?: boolean;
  characterCount?: boolean;
  logo?: boolean;
  before?: NeutrinoFooterSlot;
  after?: NeutrinoFooterSlot;
}

export interface NeutrinoSurfaceOptions {
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

export interface NeutrinoPluginSpec {
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

export interface NeutrinoPlugin {
  /** Stable identifier. Built-ins use 'ne:headings', 'ne:emphasis', etc. */
  id: string;
  /** Return CM6 extensions that implement this plugin's behavior. */
  extensions(classNames: NeutrinoClassNames, context?: NeutrinoRenderContext): Extension[];
}

// ── Semantic CSS class overrides ────────────────────────────────────────────

export interface NeutrinoClassNames {
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

export const DEFAULT_CLASS_NAMES: Required<NeutrinoClassNames> = {
  bold: 'ne-bold',
  italic: 'ne-italic',
  strikethrough: 'ne-strikethrough',
  inlineCode: 'ne-code-inline',
  link: 'ne-link',
  heading: 'ne-heading',
  h1: 'ne-h1',
  h2: 'ne-h2',
  h3: 'ne-h3',
  h4: 'ne-h4',
  h5: 'ne-h5',
  h6: 'ne-h6',
  blockCode: 'ne-code-fence',
  blockQuote: 'ne-blockquote',
  table: 'ne-table',
  image: 'ne-image-frame',
  divider: 'ne-divider',
  dividerWidget: 'ne-divider-widget',
  checkbox: 'ne-checkbox',
  completedTask: 'ne-completed-task',
  listMarker: 'ne-list-marker',
};

export function resolveClassNames(overrides?: NeutrinoClassNames): Required<NeutrinoClassNames> {
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
  | 'insertCodeBlock'
  | 'insertTable'
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

export interface NeutrinoHandle {
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

export interface UseNeutrinoOptions {
  initialValue?: string;
  onChange?: (value: string) => void;
}

export interface UseNeutrinoResult {
  ref: RefObject<NeutrinoHandle | null>;
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

export interface NeutrinoEditorProps {
  /** The markdown content (controlled). */
  value?: string;
  /** Called when the document changes. */
  onChange?: (value: string) => void;

  /** Whether the editor is editable. Default: true. */
  editable?: boolean;
  /** Placeholder text shown when the editor is empty. */
  placeholder?: string;

  /** Minimum visible rows. Default: 3. */
  minRows?: number;
  /** Maximum visible rows before scrolling. Default: undefined (unlimited). */
  maxRows?: number;

  /** CSS class for the outer wrapper div. */
  className?: string;
  /** CSS class applied to the CodeMirror .cm-editor element. */
  editorClassName?: string;
  /** Override semantic CSS class names for rendered elements. */
  classNames?: NeutrinoClassNames;

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
  /** Optional Cmd/Ctrl-click link handler. Return true to suppress default opening. */
  onLinkClick?: LinkClickHandler;
  /** Add dir="auto" to editor lines for browser bidi handling. Default: false. */
  bidi?: boolean;
  /** Show and customize the built-in command toolbar, including icon overrides and before/after slots. Default: true. */
  toolbar?: boolean | NeutrinoToolbarOptions;
  /** Show and customize the built-in status footer, including stats/logo visibility and before/after widgets. Default: true. */
  footer?: boolean | NeutrinoFooterOptions;
  /** Visual mode. Default: 'live'. `editable={false}` always renders as 'preview'. */
  mode?: NeutrinoMode;
  /** Called when the built-in mode toggle requests a mode change. */
  onModeChange?: (mode: NeutrinoMode) => void;
  /** Optional shell styling hooks for gradients, frosted glass, and paddings. */
  surface?: NeutrinoSurfaceOptions;

  /** Additional plugins to register alongside built-ins. */
  plugins?: NeutrinoPlugin[];
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
  /** Handle Cmd/Ctrl+Enter. */
  onSubmit?: () => void;
}
