# API Reference

Complete reference for all public exports from `@inky/galley-editor`.

## Components

### `GalleyEditor`

The main editor component. A React `forwardRef` wrapper around `EditorController`.

```tsx
import { GalleyEditor } from '@inky/galley-editor';

<GalleyEditor
  ref={editorRef}
  value={markdown}
  onChange={setMarkdown}
  minRows={10}
/>
```

#### Props (`GalleyEditorProps`)

| Prop | Type | Default | Description |
|---|---|---|---|
| `value` | `string` | `''` | The markdown content (controlled) |
| `onChange` | `(value: string) => void` | -- | Called when the document changes |
| `editable` | `boolean` | `true` | Whether the editor is editable |
| `placeholder` | `string` | `''` | Placeholder text shown when empty |
| `minRows` | `number` | `3` | Minimum visible rows |
| `maxRows` | `number` | `undefined` | Maximum rows before scrolling (unlimited if omitted) |
| `className` | `string` | `''` | CSS class for the outer wrapper `<div>` |
| `editorClassName` | `string` | `''` | CSS class applied to the CodeMirror `.cm-editor` element |
| `classNames` | `GalleyClassNames` | `DEFAULT_CLASS_NAMES` | Override semantic CSS class names |
| `theme` | `'light' \| 'dark' \| 'auto'` | `'auto'` | Color scheme |
| `tabIndents` | `boolean` | `true` | When `true`, Tab indents in the editor; when `false`, Tab can move focus out unless a list item is being indented |
| `keymap` | `KeyBinding[] \| ((defaults: KeyBinding[]) => KeyBinding[])` | `undefined` | Array form replaces the keymap; function form receives defaults and returns the full keymap |
| `codeHighlighter` | `CodeHighlighter` | `undefined` | Optional custom highlighter for inactive fenced code block rendering |
| `imageRenderer` | `ImageRenderer` | `undefined` | Optional custom renderer for markdown image widgets. Receives parsed image metadata including `url`, source range, and dimensions |
| `missingImageRenderer` | `MissingImageRenderer` | `undefined` | Optional custom renderer for broken images and empty image sources |
| `imageControlsRenderer` | `ImageControlsRenderer` | `undefined` | Optional renderer for selected image controls. Returning `null` uses the built-in resize handles |
| `onLinkClick` | `LinkClickHandler` | `undefined` | Intercept Cmd/Ctrl-click link activation. Return `true` to suppress default `window.open` |
| `bidi` | `boolean` | `false` | Adds `dir="auto"` to editor lines for browser bidi handling |
| `toolbar` | `boolean \| GalleyToolbarOptions` | `true` | Show and customize the built-in command toolbar |
| `footer` | `boolean \| GalleyFooterOptions` | `true` | Show and customize the built-in status footer with word count, character count, logo, and consumer widgets |
| `mode` | `'live' \| 'markdown' \| 'preview'` | `'live'` | Rendering mode. `editable={false}` forces preview mode |
| `onModeChange` | `(mode: GalleyMode) => void` | `undefined` | Called when the built-in mode toggle requests a mode change |
| `surface` | `GalleySurfaceOptions` | `undefined` | Shell styling hooks for gradients, frosted glass, and padding overrides |
| `plugins` | `GalleyPlugin[]` | `[]` | Additional plugins alongside built-ins |
| `disabledPlugins` | `string[]` | `[]` | Built-in plugin IDs to disable |
| `extensions` | `Extension[]` | `[]` | Additional CM6 extensions (appended last) |

#### Event Props

| Prop | Type | Description |
|---|---|---|
| `onFocus` | `() => void` | Editor gained focus |
| `onBlur` | `() => void` | Editor lost focus |
| `onSelectionChange` | `(sel: { from, to, anchor, head }) => void` | Selection changed |
| `onScroll` | `(fraction: number) => void` | Scroll position changed (0-1) |
| `onEnter` | `(mod: boolean, shift: boolean) => boolean` | Enter key pressed. Return `true` to suppress default newline |
| `onEscape` | `() => boolean \| void` | Escape key pressed. Return `true` to consume the event; return `false` or `void` to let it pass through |
| `onPaste` | `(event: ClipboardEvent, view: EditorView) => void` | Paste event |
| `onFiles` | `(input: GalleyFileInput) => string \| string[] \| null \| false \| Promise<...>` | Handles pasted or dropped files and returns markdown to insert |
| `uploadInteraction` | `'inline' \| 'overlay' \| 'locked'` | Controls editor-resident upload UI |
| `uploadPlaceholderRenderer` | `UploadPlaceholderRenderer` | Custom inline upload placeholder renderer |
| `dropIndicatorRenderer` | `DropIndicatorRenderer` | Custom drag/drop insertion indicator renderer |
| `uploadOverlayRenderer` | `UploadOverlayRenderer` | Custom aggregate upload overlay renderer |
| `onFileError` | `(error: unknown, input: GalleyFileInput) => void` | Called when `onFiles` throws or rejects |
| `onFileStatus` | `(status: GalleyFileStatus) => void` | Receives `start`, `progress`, `complete`, and `error` updates for file workflows |
| `onSubmit` | `() => void` | Cmd/Ctrl+Enter pressed |

#### File Workflows

When `onFiles` is provided, Galley intercepts paste/drop operations that contain files, calls the handler, and inserts returned markdown at the original paste selection or drop position.

onFiles owns upload behavior; Galley owns default upload UI state and calls input.report() updates into both onFileStatus and the active placeholder renderer.

```typescript
uploadInteraction?: 'inline' | 'overlay' | 'locked';
uploadPlaceholderRenderer?: UploadPlaceholderRenderer;
dropIndicatorRenderer?: DropIndicatorRenderer;
uploadOverlayRenderer?: UploadOverlayRenderer;
missingImageRenderer?: MissingImageRenderer;
imageControlsRenderer?: ImageControlsRenderer;
```

```tsx
const escapeMarkdownAlt = (value: string) =>
  value.replace(/[\n\r[\]\\]/g, ' ').trim();

const fakeUpload = async (file: File) =>
  `![${escapeMarkdownAlt(file.name)}](/uploads/${encodeURIComponent(file.name)})`;

<GalleyEditor
  onFiles={async (input) => {
    input.report({ phase: 'progress', progress: 0.25, message: 'Uploading...' });
    const markdown = await Promise.all(input.files.map(fakeUpload));
    input.report({ phase: 'progress', progress: 0.9, message: 'Finishing...' });
    return markdown;
  }}
  onFileStatus={(status) => {
    console.log(status.id, status.phase, status.progress, status.message);
  }}
  onFileError={(error, input) => {
    console.error('Upload failed', input.source, error);
  }}
/>
```

`onFiles(input)` receives:

```typescript
interface GalleyFileInput {
  id: string;
  files: File[];
  source: 'paste' | 'drop';
  event: ClipboardEvent | DragEvent;
  view: EditorView;
  selection: { from: number; to: number; anchor: number; head: number };
  report(update: GalleyFileStatusUpdate): void;
}
```

`input.report()` is the consumer progress channel. Galley forwards each update through `onFileStatus(status)` with the same operation `id`, original `files`, `source`, and `selection`.

```typescript
type GalleyFileStatusPhase = 'start' | 'progress' | 'complete' | 'error';

interface GalleyFileStatusUpdate {
  phase: GalleyFileStatusPhase;
  progress?: number;
  message?: string;
  error?: unknown;
}

interface GalleyFileStatus {
  id: string;
  phase: GalleyFileStatusPhase;
  progress?: number;
  message?: string;
  error?: unknown;
  files: File[];
  source: 'paste' | 'drop';
  selection: { from: number; to: number; anchor: number; head: number };
}
```

Galley emits `start` before calling `onFiles`, `complete` after successful markdown insertion, and `error` when the handler rejects. Returned `string[]` values are joined with newlines. Return `false` or `null` when the app handled the files without document insertion.

`uploadInteraction` controls how active uploads appear:

- `inline`: the default. Galley inserts an editor-resident placeholder at the paste/drop target and shows the drop indicator during drag.
- `overlay`: Galley shows the inline placeholder/drop indicator plus an overlay while uploads are active.
- `locked`: same overlay behavior as `overlay`, and user document edits are blocked while uploads are active. Selection, scrolling, and upload completion updates still work.

Upload renderers receive the current upload state and must return an `HTMLElement` or `null`:

```typescript
type GalleyUploadInteraction = 'inline' | 'overlay' | 'locked';
type UploadPlaceholderRenderer = (upload: GalleyUploadInfo) => HTMLElement | null;
type DropIndicatorRenderer = (input: {
  source: 'drag';
  pos: number;
  lineFrom: number;
  lineTo: number;
}) => HTMLElement | null;
type UploadOverlayRenderer = (uploads: GalleyUploadInfo[]) => HTMLElement | null;
```

`uploadPlaceholderRenderer` is called again as `input.report()` changes the upload phase, progress, or message. `dropIndicatorRenderer` customizes the editor insertion marker while files are dragged over the editor. `uploadOverlayRenderer` customizes the overlay used by `overlay` and `locked` interactions.

#### Image Fallbacks And Controls

Markdown images render as visual widgets when inactive. An ordinary click selects the image visually and shows the built-in resize handles. Ctrl/Cmd-click, or moving the caret into the image source, reveals the raw markdown source instead. Dragging or keyboard-operating the resize handles updates `{width height}` metadata on the markdown image.

When an image has an empty URL or the rendered image fires an error event, Galley replaces it with a missing-image placeholder. Use `missingImageRenderer` to override that fallback.

```typescript
interface GalleyMissingImageInfo extends GalleyImageInfo {
  reason: 'error' | 'empty-url';
}

type MissingImageRenderer = (image: GalleyMissingImageInfo) => HTMLElement | null;

type ImageControlsRenderer = (input: {
  image: GalleyImageInfo;
  selected: boolean;
  resizing: boolean;
  update(metadata: GalleyImageMetadataInput): void;
  clearDimensions(): void;
  revealSource(): void;
}) => HTMLElement | null;
```

`imageControlsRenderer` overrides the selected image controls. Its callbacks update image metadata, clear dimensions, or reveal the raw image source. Return `null` to keep Galley's built-in resize handles.

### `ErrorBoundary`

React error boundary for graceful error handling.

```tsx
import { ErrorBoundary } from '@inky/galley-editor';

<ErrorBoundary fallback={<div>Editor failed to load</div>}>
  <GalleyEditor value={value} onChange={setValue} />
</ErrorBoundary>
```

#### Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `ReactNode` | -- | Content to render |
| `fallback` | `ReactNode` | Built-in error UI | Custom fallback UI on error |

---

## Imperative Handle (`GalleyHandle`)

Access via React ref:

```tsx
const ref = useRef<GalleyHandle>(null);
<GalleyEditor ref={ref} ... />
```

### Content Methods

#### `getContent(): string`

Returns the current document content as a string.

#### `setContent(value: string): void`

Replaces the entire document content. Preserves cursor position (clamped to new content length). No-op if value equals current content.

#### `insertText(text: string): void`

Inserts text at the current cursor position, replacing any selection.

### Focus & Selection

#### `focus(): void`

Focuses the editor.

#### `blur(): void`

Blurs the editor.

#### `select(anchor: number, head?: number): void`

Sets the selection range. If `head` is omitted, creates a cursor at `anchor`. Both values are clamped to the document length.

#### `getSelection(): { from: number; to: number; anchor: number; head: number }`

Returns the current selection. `from`/`to` are the ordered positions; `anchor`/`head` may be reversed (head < anchor when selecting backwards).

### Commands

#### `execCommand(name: string, ...args: unknown[]): unknown`

Executes a built-in or custom command by name. Custom commands take precedence. Returns the command's return value, or `undefined` if the command is not found.

```typescript
ref.current.execCommand('toggleBold');
ref.current.execCommand('insertLink', 'Click here', 'https://example.com');
ref.current.execCommand('duplicateLine');
ref.current.execCommand('jumpToHash', 'my-section');
```

#### `registerCommand(name: string, fn: CommandFn): void`

Registers a custom command. The function signature is `(view: EditorView, ...args: unknown[]) => unknown`.

```typescript
ref.current.registerCommand('insertTimestamp', (view) => {
  view.dispatch(view.state.replaceSelection(new Date().toISOString()));
  return true;
});
```

### History

#### `undo(): void`

Undoes the last change.

#### `redo(): void`

Redoes the last undone change.

### Scrolling

#### `scrollTo(fraction: number): void`

Scrolls to a fraction (0-1) of the document. `0` = top, `1` = bottom.

#### `scrollSelectionIntoView(): void`

Scrolls the current selection into view.

### Extensions

#### `addExtension(ext: Extension): { remove(): void }`

Adds a CodeMirror 6 extension at runtime. Returns a handle with a `remove()` method to unregister the extension.

```typescript
const handle = ref.current.addExtension(EditorView.lineWrapping);
// Later:
handle.remove();
```

### Escape Hatch

#### `view: EditorView | null` (readonly)

Direct access to the underlying CodeMirror `EditorView`, or `null` before the editor has mounted. Use for advanced operations not covered by the handle API.

---

## Hook API

### `useGalley(options?)`

Hooks-first wrapper around the imperative handle. It owns a ref, tracks controlled content, and returns stable method wrappers.

```tsx
import { GalleyEditor, useGalley } from '@inky/galley-editor';

function Editor() {
  const editor = useGalley({
    initialValue: '# Hello',
    onChange: (value) => console.log(value),
  });

  return (
    <GalleyEditor
      ref={editor.ref}
      value={editor.content}
      onChange={editor.setContent}
    />
  );
}
```

Returns `ref`, `content`, `setContent`, `insertText`, `focus`, `blur`, `select`, `getSelection`, `execCommand`, `undo`, and `redo`.

---

## Types

### `RevealStrategy`

```typescript
type RevealStrategy = 'line' | 'select' | 'active' | boolean;
```

Controls when raw markdown is shown instead of rendered decoration. See [Plugins > Reveal Strategies](./plugins.md#reveal-strategies).

### `GalleyPlugin`

```typescript
interface GalleyPlugin {
  id: string;
  extensions(classNames: GalleyClassNames, context?: GalleyRenderContext): Extension[];
}
```

### `GalleyRenderContext`

```typescript
interface GalleyRenderContext {
  theme: 'light' | 'dark';
  mode?: GalleyMode;
  codeHighlighter?: CodeHighlighter;
  imageRenderer?: ImageRenderer;
  missingImageRenderer?: MissingImageRenderer;
  imageControlsRenderer?: ImageControlsRenderer;
  onLinkClick?: LinkClickHandler;
}
```

Built-in plugins use this to adapt rendering for preview mode, custom code highlighting, image widgets, missing-image fallbacks, and link activation. Third-party plugins can ignore the second argument.

### `GalleyMode`

```typescript
type GalleyMode = 'live' | 'markdown' | 'preview';
```

- `live`: default half-WYSIWYG editing. Markdown syntax reveals around the cursor.
- `markdown`: raw Markdown editing. Built-in render plugins are disabled.
- `preview`: rendered Markdown view. Syntax stays hidden and blocks do not revert to Markdown on click or selection.

`editable={false}` always uses `preview` mode, even if `mode` is set to another value.

### `GalleyToolbarOptions`

```typescript
type ToolbarIconName =
  | 'bold' | 'italic' | 'strikethrough' | 'inlineCode'
  | 'bulletList' | 'orderedList' | 'taskList'
  | 'link' | 'image' | 'codeBlock' | 'table' | 'divider'
  | 'undo' | 'redo' | 'mode';

type ToolbarIconRenderer = (input: {
  name: ToolbarIconName;
  label: string;
  mode: GalleyMode;
}) => ReactNode;

interface GalleyToolbarOptions {
  enabled?: boolean;
  showModeToggle?: boolean;
  icons?: Partial<Record<ToolbarIconName, ReactNode | ToolbarIconRenderer>>;
  before?: GalleyToolbarSlot;
  after?: GalleyToolbarSlot;
}
```

Use `icons` to pass inline SVG elements, Lucide React components, or render functions. Use `before` and `after` to add consumer-owned controls into the built-in toolbar.

```tsx
import { Bold, Italic } from 'lucide-react';

<GalleyEditor
  toolbar={{
    icons: {
      bold: <Bold size={16} />,
      italic: ({ label }) => <Italic aria-label={label} size={16} />,
    },
    after: ({ execCommand, canEdit }) => (
      <button
        className="ge-toolbar-button"
        disabled={!canEdit}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => execCommand('insertHr')}
      >
        Section
      </button>
    ),
  }}
/>
```

Toolbar slot render functions receive `{ value, mode, canEdit, editor, execCommand, setMode, cycleMode }`.

### `GalleyFooterOptions`

```typescript
interface GalleyFooterOptions {
  wordCount?: boolean;
  characterCount?: boolean;
  logo?: boolean;
  before?: GalleyFooterSlot;
  after?: GalleyFooterSlot;
}
```

Footer slot render functions receive `{ value, mode, wordCount, characterCount, editor }`.

### `GalleySurfaceOptions`

```typescript
interface GalleySurfaceOptions {
  className?: string;
  style?: React.CSSProperties;
  contentPadding?: string;
  toolbarPadding?: string;
  footerPadding?: string;
}
```

`surface.style` is applied to the editor shell, so consumers can set gradients, `backdropFilter`, box shadows, or custom CSS variables. Padding helpers map to `--ge-content-padding`, `--ge-toolbar-padding`, and `--ge-footer-padding`.

### `GalleyPluginSpec`

```typescript
interface GalleyPluginSpec {
  createDecoration(node: SyntaxNodeRef, state: EditorState, parentDepths: ReadonlyMap<string, number>): WidgetType | Decoration | null;
  getLineRange?(node: SyntaxNodeRef, state: EditorState): { from: number; to: number } | null;
  getMarkRange?(node: SyntaxNodeRef, state: EditorState): { from: number; to: number } | null;
  getPointPosition?(node: SyntaxNodeRef, state: EditorState): number | null;
  getRevealStrategy?(node: SyntaxNodeRef, state: EditorState): RevealStrategy;
  hideWhenNearCursor?: boolean;
  selectionAffectsDecorations?(prev: EditorSelection, next: EditorSelection): boolean;
  shouldForceRerender?(transaction: Transaction): boolean;
}
```

Only one of `getLineRange`, `getMarkRange`, and `getPointPosition` may be defined on a spec. The factory throws at construction time if multiple range selectors are present.

### `ImageRenderer`

```typescript
interface GalleyImageInfo {
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

type ImageRenderer = (image: GalleyImageInfo) => HTMLElement | null;
```

Returning `null` falls back to rendered alt text without an image element. `width` and `height` come from Galley's image metadata syntax:

```md
![Alt](image.png "Title"){width=640 height=360}
```

Unknown metadata attributes are preserved in `attrs`.

### `LinkClickHandler`

```typescript
type LinkClickHandler = (url: string, event: MouseEvent) => boolean | void;
```

Returning `true` means the consumer handled the click and Galley will not call `window.open`.

### `GalleyClassNames`

Override semantic CSS class names applied to rendered elements:

```typescript
interface GalleyClassNames {
  bold?: string;          // default: 'ge-bold'
  italic?: string;        // default: 'ge-italic'
  strikethrough?: string; // default: 'ge-strikethrough'
  inlineCode?: string;    // default: 'ge-code-inline'
  link?: string;          // default: 'ge-link'
  heading?: string;       // default: 'ge-heading'
  h1?: string;            // default: 'ge-h1'
  h2?: string;            // default: 'ge-h2'
  h3?: string;            // default: 'ge-h3'
  h4?: string;            // default: 'ge-h4'
  h5?: string;            // default: 'ge-h5'
  h6?: string;            // default: 'ge-h6'
  blockCode?: string;     // default: 'ge-code-fence'
  blockQuote?: string;    // default: 'ge-blockquote'
  table?: string;         // default: 'ge-table'
  image?: string;         // default: 'ge-image-frame'
  divider?: string;       // default: 'ge-divider'
  dividerWidget?: string; // default: 'ge-divider-widget'
  checkbox?: string;      // default: 'ge-checkbox'
  completedTask?: string; // default: 'ge-completed-task'
  listMarker?: string;    // default: 'ge-list-marker'
}
```

### `BuiltinCommand`

Union type of all built-in command names:

```typescript
type BuiltinCommand =
  | 'toggleBold' | 'toggleItalic' | 'toggleCode' | 'toggleStrikethrough'
  | 'toggleHeading'
  | 'toggleBulletList' | 'toggleOrderedList' | 'toggleCheckList'
  | 'insertLink' | 'insertImage' | 'insertCodeBlock' | 'insertTable' | 'insertHr'
  | 'updateImageMetadata' | 'clearImageDimensions'
  | 'normalizeTable' | 'commitTableCell'
  | 'insertTableRowBefore' | 'insertTableRowAfter' | 'deleteTableRow'
  | 'insertTableColumnBefore' | 'insertTableColumnAfter' | 'deleteTableColumn'
  | 'setTableColumnAlignment' | 'revealTableSource'
  | 'indent' | 'outdent'
  | 'duplicateLine' | 'sortSelectedLines'
  | 'swapLineUp' | 'swapLineDown'
  | 'insertLineAfter' | 'insertLineBefore'
  | 'jumpToHash' | 'findInDocument'
  | 'undo' | 'redo' | 'selectAll';
```

### `CommandFn`

```typescript
type CommandFn = (view: EditorView, ...args: unknown[]) => unknown;
```

### `FindOpts` and `FindResult`

```typescript
interface FindOpts {
  caseSensitive?: boolean;
  wholeWord?: boolean;
  regex?: boolean;
}

interface FindResult {
  from: number;
  to: number;
  line: number;
}
```

### `CodeHighlighter`

```typescript
type CodeHighlighter = (input: {
  code: string;
  language: string;
  theme: 'light' | 'dark';
}) => string | HTMLElement;
```

Used by inactive fenced code blocks. String results are treated as highlighted HTML; consumers are responsible for sanitizing output from third-party highlighters.

### Table Model Types

Table command helpers expose rendered table model types for integrations that need to track a selected cell or prepare replacements:

```typescript
type TableAlignment = 'left' | 'center' | 'right' | null;

interface TableCellRef {
  row: number;
  column: number;
}

interface GalleyTableCell extends TableCellRef {
  text: string;
  sourceFrom: number;
  sourceTo: number;
  cellFrom: number;
  cellTo: number;
  header: boolean;
}

interface GalleyTable {
  from: number;
  to: number;
  rows: GalleyTableCell[][];
  alignments: TableAlignment[];
  columnCount: number;
}

interface GalleyTableReplacement {
  table: GalleyTable;
  next: GalleyTable;
}
```

---

## Rendering Utilities

### `makeInlinePlugin(spec: GalleyPluginSpec): Extension`

Creates a `ViewPlugin` that iterates visible ranges to produce inline decorations. See [Plugins > Factory Functions](./plugins.md#factory-functions).

### `makeBlockPlugin(spec: GalleyPluginSpec): Extension[]`

Creates a `StateField` that iterates the full document to produce block decorations. See [Plugins > Factory Functions](./plugins.md#factory-functions).

### `HIDE_DECORATION: Decoration`

A shared `Decoration.replace({})` instance used to hide (replace with nothing) formatting marks.

### `nodeIntersectsSelection(selection: EditorSelection, node: SyntaxNodeRef): boolean`

Returns `true` if the selection overlaps the node's range in any way (contains, is contained by, or partially overlaps).

### `BLOCK_CURSOR_LINE_PROXIMITY: number`

Constant `1`. In `makeBlockPlugin`, decorations are hidden when the cursor is within this many lines of the block node.

---

## Commands

### `BUILTIN_COMMANDS: Record<BuiltinCommand, CommandFn>`

The registry of all built-in commands. Each command is a function that takes an `EditorView` and optional arguments.

### `BUILTIN_COMMAND_NAMES: readonly BuiltinCommand[]`

Autocomplete-friendly list of built-in command names.

### `DEFAULT_KEYMAP: KeyBinding[]`

The default command keybindings, including `Mod-D` duplicate line, line swapping, insert-line commands, link insertion, undo/redo, and select-all.

### `findInDocument(view, needle, opts?): FindResult[]`

Named export for programmatic search. The same behavior is available through `execCommand('findInDocument', needle, opts)`.

### `jumpToHash(view, hash): boolean`

Named export for heading navigation. Accepts hashes with or without a leading `#`.

### Table command helpers

Named exports for visual table editing: `normalizeTable`, `commitTableCell`, `insertTableRowBefore`, `insertTableRowAfter`, `deleteTableRow`, `insertTableColumnBefore`, `insertTableColumnAfter`, `deleteTableColumn`, `setTableColumnAlignment`, `revealTableSource`, `replaceTable`, and `replaceTables`.

#### Inline Formatting

| Command | Description | Arguments |
|---|---|---|
| `toggleBold` | Wraps/unwraps selection with `**` | -- |
| `toggleItalic` | Wraps/unwraps selection with `*` | -- |
| `toggleCode` | Wraps/unwraps selection with `` ` `` | -- |
| `toggleStrikethrough` | Wraps/unwraps selection with `~~` | -- |

#### Headings

| Command | Description | Arguments |
|---|---|---|
| `toggleHeading` | Adds/removes heading syntax for the requested level. Replaces other heading levels on the same line. | `level?: 1 \| 2 \| 3 \| 4 \| 5 \| 6` |

#### Lists

| Command | Description | Arguments |
|---|---|---|
| `toggleBulletList` | Adds/removes `- ` prefix (excludes checkbox lines) | -- |
| `toggleOrderedList` | Adds/removes `1. ` prefix | -- |
| `toggleCheckList` | Adds/removes `- [ ] ` prefix | -- |

#### Insert

| Command | Description | Arguments |
|---|---|---|
| `insertLink` | Inserts `[label](url)` at cursor | `label?: string`, `url?: string` |
| `insertImage` | Inserts `![alt](url)` at cursor | `alt?: string`, `url?: string` |
| `insertCodeBlock` | Inserts fenced code block | `language?: string` |
| `insertTable` | Inserts a 2x2 markdown table | -- |
| `insertHr` | Inserts `---` horizontal rule | -- |
| `updateImageMetadata` | Updates the image at the current selection/cursor | `{ alt?: string; url?: string; title?: string \| null; width?: number \| null; height?: number \| null }` |
| `clearImageDimensions` | Removes `width` and `height` metadata from the image at the current selection/cursor | -- |

#### Table Editing

| Command | Description | Arguments |
|---|---|---|
| `normalizeTable` | Rewrites selected tables with canonical pipe-table serialization | -- |
| `commitTableCell` | Updates a rendered table cell. Header row is `0`; body rows start at `1`; the separator row is not rendered or editable. | `{ row: number; column: number }`, `text: string` |
| `insertTableRowBefore` | Inserts a body row before the current rendered row | -- |
| `insertTableRowAfter` | Inserts a body row after the current rendered row | -- |
| `deleteTableRow` | Deletes the current body row. Header-row deletion returns `false`. | -- |
| `insertTableColumnBefore` | Inserts a column before the current column | -- |
| `insertTableColumnAfter` | Inserts a column after the current column | -- |
| `deleteTableColumn` | Deletes the current column. Last-column deletion returns `false`. | -- |
| `setTableColumnAlignment` | Sets or clears the current column alignment | `'left' \| 'center' \| 'right' \| null` |
| `revealTableSource` | Moves the selection to the current or requested cell source | `{ row: number; column: number }?` |

All table editing commands return `false` outside a supported table.

#### Editing

| Command | Description | Arguments |
|---|---|---|
| `indent` | Indents selected lines by one tab unit | -- |
| `outdent` | Outdents selected lines by one tab unit | -- |
| `duplicateLine` | Duplicates touched lines and moves selection to the duplicate | -- |
| `sortSelectedLines` | Sorts selected lines in place | `'asc' \| 'desc'` or `{ direction?: 'asc' \| 'desc'; wholeDocument?: boolean }` |
| `swapLineUp` | Swaps touched lines with the line above | -- |
| `swapLineDown` | Swaps touched lines with the line below | -- |
| `insertLineAfter` | Inserts blank lines after touched lines | -- |
| `insertLineBefore` | Inserts blank lines before touched lines | -- |
| `jumpToHash` | Jumps to a markdown heading slug | `hash: string` |
| `findInDocument` | Returns search match positions | `needle: string`, `opts?: FindOpts` |
| `undo` | Undoes last change | -- |
| `redo` | Redoes last undone change | -- |
| `selectAll` | Selects all document content | -- |

---

## Plugins

### `BUILT_IN_PLUGINS: GalleyPlugin[]`

Array of all 11 built-in plugins, in registration order:

1. `headingsPlugin` (`ge:headings`)
2. `emphasisPlugin` (`ge:emphasis`)
3. `codeInlinePlugin` (`ge:code-inline`)
4. `codeFencePlugin` (`ge:code-fence`)
5. `blockquotePlugin` (`ge:blockquote`)
6. `linksPlugin` (`ge:links`)
7. `imagesPlugin` (`ge:images`)
8. `listsPlugin` (`ge:lists`)
9. `checkboxesPlugin` (`ge:checkboxes`)
10. `dividersPlugin` (`ge:dividers`)
11. `tablesPlugin` (`ge:tables`)

Each plugin is also exported individually for selective inclusion.

---

## CSS

### `style.css`

Optional stylesheet with minimal visual defaults. Import it for quick setup:

```typescript
import '@inky/galley-editor/style.css';
```

See [Styling Guide](./styling.md) for details on all classes and customization.
