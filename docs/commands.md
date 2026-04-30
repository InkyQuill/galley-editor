# Commands

Galley commands are available through the editor ref:

```tsx
editorRef.current?.execCommand('toggleBold');
editorRef.current?.execCommand('insertLink', 'Docs', 'https://example.com');
```

Custom commands registered with `registerCommand()` take precedence over built-ins with the same name.

## Default Keymap

`DEFAULT_KEYMAP` exports Galley's command keybindings. The controller also keeps callback-driven editing keys such as Enter, Tab, Backspace, and Escape.

| Key | Command | Description |
|---|---|---|
| `Mod-D` | `duplicateLine` | Duplicate the current line or selected lines. |
| `Alt-ArrowUp` | `swapLineUp` | Swap the current line upward. |
| `Alt-ArrowDown` | `swapLineDown` | Swap the current line downward. |
| `Mod-Alt-ArrowUp` | `insertLineBefore` | Insert a blank line before the current line. |
| `Mod-Alt-ArrowDown` | `insertLineAfter` | Insert a blank line after the current line. |
| `Mod-K` | `insertLink` | Insert a markdown link. |
| `Mod-B` | `toggleBold` | Toggle bold formatting. |
| `Mod-I` | `toggleItalic` | Toggle italic formatting. |
| `Mod-Z` | `undo` | Undo the last change. |
| `Mod-Shift-Z` | `redo` | Redo the last undone change. |
| `Mod-A` | `selectAll` | Select the full document. |

Use the function form to extend defaults:

```tsx
<GalleyEditor
  keymap={(defaults) => [
    ...defaults,
    { key: 'Mod-Shift-K', run: (view) => insertCallout(view) },
  ]}
/>
```

Use the array form only for a full replacement:

```tsx
<GalleyEditor keymap={[{ key: 'F8', run: runCustomCommand }]} />
```

## Inline Formatting

### `toggleBold`

Wraps or unwraps the selection with `**`. With a cursor only, inserts bold markers.

Default keybinding: `Mod-B`

```ts
editorRef.current?.execCommand('toggleBold');
```

### `toggleItalic`

Wraps or unwraps the selection with `*`. With a cursor only, inserts italic markers.

Default keybinding: `Mod-I`

```ts
editorRef.current?.execCommand('toggleItalic');
```

### `toggleCode`

Wraps or unwraps the selection with inline backticks.

Default keybinding: none

```ts
editorRef.current?.execCommand('toggleCode');
```

### `toggleStrikethrough`

Wraps or unwraps the selection with `~~`.

Default keybinding: none

```ts
editorRef.current?.execCommand('toggleStrikethrough');
```

## Block Formatting

### `toggleHeading`

Adds, removes, or changes ATX heading markers on touched lines.

Arguments: `level: 1 | 2 | 3 | 4 | 5 | 6`

```ts
editorRef.current?.execCommand('toggleHeading', 2);
```

### `toggleBulletList`

Adds or removes `- ` list markers on touched lines.

```ts
editorRef.current?.execCommand('toggleBulletList');
```

### `toggleOrderedList`

Adds or removes ordered-list markers on touched lines.

```ts
editorRef.current?.execCommand('toggleOrderedList');
```

### `toggleCheckList`

Adds or removes task-list markers on touched lines.

```ts
editorRef.current?.execCommand('toggleCheckList');
```

## Insert Commands

### `insertLink`

Inserts a markdown link.

Arguments: `label?: string`, `url?: string`

Default keybinding: `Mod-K`

```ts
editorRef.current?.execCommand('insertLink', 'Galley', 'https://example.com');
```

### `insertImage`

Inserts a markdown image.

Arguments: `alt?: string`, `url?: string`

```ts
editorRef.current?.execCommand('insertImage', 'Screenshot', '/image.png');
```

### `updateImageMetadata`

Updates the markdown image at the current cursor or selection. Use this for asset inspectors, image detail forms, and custom `imageRenderer` controls.

Arguments: `{ alt?: string; url?: string; title?: string | null; width?: number | null; height?: number | null }`

```ts
editorRef.current?.execCommand('updateImageMetadata', {
  alt: 'Alt',
  url: 'image.png',
  title: 'Title',
  width: 640,
  height: 360,
});
```

Galley's image metadata syntax is:

```md
![Alt](image.png "Title"){width=640 height=360}
```

Use `null` for `title`, `width`, or `height` to remove that field.

Named export:

```ts
import { updateImageMetadata } from '@inky/galley-editor';

updateImageMetadata(view, { width: 640, height: 360 });
```

### `clearImageDimensions`

Removes `width` and `height` metadata from the image at the current cursor or selection.

```ts
editorRef.current?.execCommand('clearImageDimensions');
```

Named export:

```ts
import { clearImageDimensions } from '@inky/galley-editor';

clearImageDimensions(view);
```

### `insertCodeBlock`

Inserts a fenced code block.

Arguments: `language?: string`

```ts
editorRef.current?.execCommand('insertCodeBlock', 'typescript');
```

### `insertTable`

Inserts a starter two-column markdown table.

```ts
editorRef.current?.execCommand('insertTable');
```

### `insertHr`

Inserts a markdown horizontal rule.

```ts
editorRef.current?.execCommand('insertHr');
```

## Line Editing

### `duplicateLine`

Duplicates the current line, or every line touched by each selection range, and moves the selection to the duplicate.

Default keybinding: `Mod-D`

```ts
editorRef.current?.execCommand('duplicateLine');
```

### `sortSelectedLines`

Sorts selected lines in place. Cursor-only selections return `false` unless `wholeDocument` is set.

Arguments: `direction?: 'asc' | 'desc'` or `{ direction?: 'asc' | 'desc'; wholeDocument?: boolean }`

```ts
editorRef.current?.execCommand('sortSelectedLines', 'desc');
editorRef.current?.execCommand('sortSelectedLines', { wholeDocument: true });
```

### `swapLineUp`

Swaps the current line with the line above. At the top of the document it returns `false`.

Default keybinding: `Alt-ArrowUp`

```ts
editorRef.current?.execCommand('swapLineUp');
```

### `swapLineDown`

Swaps the current line with the line below. At the bottom of the document it returns `false`.

Default keybinding: `Alt-ArrowDown`

```ts
editorRef.current?.execCommand('swapLineDown');
```

### `insertLineBefore`

Inserts a blank line before the current line and moves the cursor to the new line.

Default keybinding: `Mod-Alt-ArrowUp`

```ts
editorRef.current?.execCommand('insertLineBefore');
```

### `insertLineAfter`

Inserts a blank line after the current line and moves the cursor to the new line.

Default keybinding: `Mod-Alt-ArrowDown`

```ts
editorRef.current?.execCommand('insertLineAfter');
```

## Navigation and Search

### `jumpToHash`

Finds a markdown heading by GitHub-like slug, moves the cursor to that heading, scrolls it into view, and returns whether a match was found.

Arguments: `hash: string`

```ts
editorRef.current?.execCommand('jumpToHash', 'my-section');
editorRef.current?.execCommand('jumpToHash', '#my-section');
```

### `findInDocument`

Performs a plain-text or regex scan and returns match positions.

Arguments: `needle: string`, `opts?: FindOpts`

```ts
const matches = editorRef.current?.execCommand('findInDocument', 'todo', {
  wholeWord: true,
});
```

Named export:

```ts
import { findInDocument } from '@inky/galley-editor';

const matches = findInDocument(view, 'heading', { caseSensitive: true });
```

## Indent and History

### `indent`

Indents touched lines by one indent unit.

### `outdent`

Outdents touched lines by one indent unit.

### `undo`

Undo the last change.

Default keybinding: `Mod-Z`

### `redo`

Redo the last undone change.

Default keybinding: `Mod-Shift-Z`

### `selectAll`

Selects the entire document.

Default keybinding: `Mod-A`
