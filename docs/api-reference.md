# API Reference

Complete reference for all public exports from `@inky/neutrino-editor`.

## Components

### `NeutrinoEditor`

The main editor component. A React `forwardRef` wrapper around `EditorController`.

```tsx
import { NeutrinoEditor } from '@inky/neutrino-editor';

<NeutrinoEditor
  ref={editorRef}
  value={markdown}
  onChange={setMarkdown}
  minRows={10}
/>
```

#### Props (`NeutrinoEditorProps`)

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
| `classNames` | `NeutrinoClassNames` | `DEFAULT_CLASS_NAMES` | Override semantic CSS class names |
| `theme` | `'light' \| 'dark' \| 'auto'` | `'auto'` | Color scheme |
| `plugins` | `NeutrinoPlugin[]` | `[]` | Additional plugins alongside built-ins |
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
| `onSubmit` | `() => void` | Cmd/Ctrl+Enter pressed |

### `ErrorBoundary`

React error boundary for graceful error handling.

```tsx
import { ErrorBoundary } from '@inky/neutrino-editor';

<ErrorBoundary fallback={<div>Editor failed to load</div>}>
  <NeutrinoEditor value={value} onChange={setValue} />
</ErrorBoundary>
```

#### Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `ReactNode` | -- | Content to render |
| `fallback` | `ReactNode` | Built-in error UI | Custom fallback UI on error |

---

## Imperative Handle (`NeutrinoHandle`)

Access via React ref:

```tsx
const ref = useRef<NeutrinoHandle>(null);
<NeutrinoEditor ref={ref} ... />
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

## Types

### `RevealStrategy`

```typescript
type RevealStrategy = 'line' | 'select' | 'active' | boolean;
```

Controls when raw markdown is shown instead of rendered decoration. See [Plugins > Reveal Strategies](./plugins.md#reveal-strategies).

### `NeutrinoPlugin`

```typescript
interface NeutrinoPlugin {
  id: string;
  extensions(classNames: NeutrinoClassNames): Extension[];
}
```

### `NeutrinoPluginSpec`

```typescript
interface NeutrinoPluginSpec {
  createDecoration(node: SyntaxNodeRef, state: EditorState, parentDepths: ReadonlyMap<string, number>): WidgetType | Decoration | null;
  getDecorationRange?(node: SyntaxNodeRef, state: EditorState): [number] | [number, number] | null;
  getRevealStrategy?(node: SyntaxNodeRef, state: EditorState): RevealStrategy;
  hideWhenNearCursor?: boolean;
  shouldForceRerender?(transaction: Transaction): boolean;
}
```

### `NeutrinoClassNames`

Override semantic CSS class names applied to rendered elements:

```typescript
interface NeutrinoClassNames {
  bold?: string;          // default: 'ne-bold'
  italic?: string;        // default: 'ne-italic'
  strikethrough?: string; // default: 'ne-strikethrough'
  inlineCode?: string;    // default: 'ne-code-inline'
  link?: string;          // default: 'ne-link'
  heading?: string;       // default: 'ne-heading'
  h1?: string;            // default: 'ne-h1'
  h2?: string;            // default: 'ne-h2'
  h3?: string;            // default: 'ne-h3'
  h4?: string;            // default: 'ne-h4'
  h5?: string;            // default: 'ne-h5'
  h6?: string;            // default: 'ne-h6'
  blockCode?: string;     // default: 'ne-code-fence'
  blockQuote?: string;    // default: 'ne-blockquote'
  table?: string;         // default: 'ne-table'
  divider?: string;       // default: 'ne-divider'
  dividerWidget?: string; // default: 'ne-divider-widget'
  checkbox?: string;      // default: 'ne-checkbox'
  completedTask?: string; // default: 'ne-completed-task'
  listMarker?: string;    // default: 'ne-list-marker'
}
```

### `BuiltinCommand`

Union type of all 23 built-in command names:

```typescript
type BuiltinCommand =
  | 'toggleBold' | 'toggleItalic' | 'toggleCode' | 'toggleStrikethrough'
  | 'toggleHeading1' | 'toggleHeading2' | 'toggleHeading3'
  | 'toggleHeading4' | 'toggleHeading5' | 'toggleHeading6'
  | 'toggleBulletList' | 'toggleOrderedList' | 'toggleCheckList'
  | 'insertLink' | 'insertImage' | 'insertCodeBlock' | 'insertTable' | 'insertHr'
  | 'indent' | 'outdent'
  | 'undo' | 'redo' | 'selectAll';
```

### `CommandFn`

```typescript
type CommandFn = (view: EditorView, ...args: unknown[]) => unknown;
```

---

## Rendering Utilities

### `makeInlinePlugin(spec: NeutrinoPluginSpec): Extension`

Creates a `ViewPlugin` that iterates visible ranges to produce inline decorations. See [Plugins > Factory Functions](./plugins.md#factory-functions).

### `makeBlockPlugin(spec: NeutrinoPluginSpec): Extension[]`

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
| `toggleHeading1` - `toggleHeading6` | Adds/removes `# ` through `###### ` prefix. Auto-clears other heading levels on the same line. | -- |

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

#### Editing

| Command | Description | Arguments |
|---|---|---|
| `indent` | Indents selected lines by one tab unit | -- |
| `outdent` | Outdents selected lines by one tab unit | -- |
| `undo` | Undoes last change | -- |
| `redo` | Redoes last undone change | -- |
| `selectAll` | Selects all document content | -- |

---

## Plugins

### `BUILT_IN_PLUGINS: NeutrinoPlugin[]`

Array of all 10 built-in plugins, in registration order:

1. `headingsPlugin` (`ne:headings`)
2. `emphasisPlugin` (`ne:emphasis`)
3. `codeInlinePlugin` (`ne:code-inline`)
4. `codeFencePlugin` (`ne:code-fence`)
5. `blockquotePlugin` (`ne:blockquote`)
6. `linksPlugin` (`ne:links`)
7. `listsPlugin` (`ne:lists`)
8. `checkboxesPlugin` (`ne:checkboxes`)
9. `dividersPlugin` (`ne:dividers`)
10. `tablesPlugin` (`ne:tables`)

Each plugin is also exported individually for selective inclusion.

---

## CSS

### `style.css`

Optional stylesheet with minimal visual defaults. Import it for quick setup:

```typescript
import '@inky/neutrino-editor/style.css';
```

See [Styling Guide](./styling.md) for details on all classes and customization.
