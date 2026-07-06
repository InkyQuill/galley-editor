---
title: Commands
description: Execute Galley commands from toolbar buttons, keyboard shortcuts, menus, and application code.
sidebar:
  order: 30
---

Galley exposes editor actions as commands. Commands can be called through the imperative ref, bound to CodeMirror keymaps, or wrapped by your own toolbar.

## Execute a Command

```tsx
import { useRef } from 'react';
import { GalleyEditor, type GalleyHandle } from '@inkyquill/galley-editor';

export function Editor() {
  const editor = useRef<GalleyHandle>(null);

  return (
    <>
      <button type="button" onClick={() => editor.current?.execCommand('toggleBold')}>
        Bold
      </button>
      <GalleyEditor ref={editor} />
    </>
  );
}
```

Most editing commands return `true` when they changed the document and `false` when the command cannot apply at the current selection.

## Command Toolbar Recipe

Use commands for app-owned toolbars, menus, palettes, or side panels. Prevent mouse-down from taking focus before command execution when the command should apply to the current editor selection.

```tsx
const editor = useRef<GalleyHandle>(null);

function run(command: string, ...args: unknown[]) {
  editor.current?.execCommand(command, ...args);
}

return (
  <>
    <div className="app-toolbar">
      <button
        type="button"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => run('toggleBold')}
      >
        Bold
      </button>
      <button
        type="button"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => run('insertTable')}
      >
        Table
      </button>
      <button
        type="button"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => run('insertImage', 'Alt text', '/uploads/image.png')}
      >
        Image
      </button>
    </div>
    <GalleyEditor ref={editor} toolbar={false} />
  </>
);
```

Keep the built-in toolbar when it already fits your workflow and use [`toolbar.icons`](/galley-editor/guides/customization/#replace-built-in-toolbar-icons) or toolbar slots for lighter customization.

## Built-In Commands

Inline formatting:

| Command | Description |
| --- | --- |
| `toggleBold` | Toggle `**bold**`. |
| `toggleItalic` | Toggle `*italic*`. |
| `toggleCode` | Toggle inline backticks. |
| `toggleStrikethrough` | Toggle `~~strikethrough~~`. |

Block formatting:

| Command | Description |
| --- | --- |
| `toggleHeading(level)` | Toggle an ATX heading from level 1 to 6. |
| `toggleBulletList` | Toggle unordered list markers. |
| `toggleOrderedList` | Toggle ordered list markers. |
| `toggleCheckList` | Toggle task-list markers. |
| `insertCodeBlock(language?)` | Insert a fenced code block. |
| `insertTable` | Insert a starter pipe table. |
| `insertHr` | Insert a horizontal rule. |

Editing and navigation:

| Command | Description |
| --- | --- |
| `indent` / `outdent` | Adjust indentation. |
| `duplicateLine` | Duplicate the current line or selected lines. |
| `sortSelectedLines(options?)` | Sort selected lines. |
| `swapLineUp` / `swapLineDown` | Move lines up or down. |
| `insertLineBefore` / `insertLineAfter` | Insert a blank line around the current line. |
| `jumpToHash(hash)` | Move to a matching heading. |
| `findInDocument(needle, opts?)` | Return matching ranges. |
| `undo` / `redo` / `selectAll` | Standard document actions. |

Links and images:

| Command | Description |
| --- | --- |
| `insertLink(label?, url?)` | Insert a Markdown link. |
| `insertImage(alt?, url?)` | Insert a Markdown image. |
| `updateImageMetadata(input)` | Update the selected image. |
| `clearImageDimensions` | Remove width and height metadata. |

Tables:

| Command | Description |
| --- | --- |
| `normalizeTable` | Serialize selected tables into Galley's canonical pipe-table format. |
| `commitTableCell(ref, text)` | Replace a rendered cell's text. |
| `insertTableRowBefore` / `insertTableRowAfter` | Add a body row around the current row. |
| `deleteTableRow` | Delete the current body row. |
| `insertTableColumnBefore` / `insertTableColumnAfter` | Add a column around the current column. |
| `deleteTableColumn` | Delete the current column. |
| `setTableColumnAlignment(alignment)` | Update column alignment. |
| `revealTableSource` | Put focus back into the table source. |

## Default Keymap

`DEFAULT_KEYMAP` is exported for reuse. Galley installs it by default.

| Key | Command |
| --- | --- |
| `Mod-D` | `duplicateLine` |
| `Alt-ArrowUp` | `swapLineUp` |
| `Alt-ArrowDown` | `swapLineDown` |
| `Mod-Alt-ArrowUp` | `insertLineBefore` |
| `Mod-Alt-ArrowDown` | `insertLineAfter` |
| `Mod-K` | `insertLink` |
| `Mod-B` | `toggleBold` |
| `Mod-I` | `toggleItalic` |
| `Mod-Z` | `undo` |
| `Mod-Shift-Z` | `redo` |
| `Mod-A` | `selectAll` |

Use the function form of `keymap` to extend the defaults:

```tsx
<GalleyEditor
  keymap={(defaults) => [
    ...defaults,
    {
      key: 'Mod-Shift-8',
      run(view) {
        return Boolean(view);
      },
    },
  ]}
/>
```

Use the array form only when you want to replace every default binding.

## Custom Commands

Register custom commands after mount:

```tsx
editor.current?.registerCommand('insertCallout', (view) => {
  view.dispatch(view.state.replaceSelection(':::note\nWrite a note.\n:::'));
  return true;
});

editor.current?.execCommand('insertCallout');
```

Custom commands take precedence over built-ins with the same name. Prefer unique names for app-specific behavior so future Galley releases do not surprise your command registry.
