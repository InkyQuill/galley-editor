---
title: API Reference
description: Public components, functions, constants, and types exported by @inkyquill/galley-editor.
sidebar:
  order: 10
---

Import public APIs from the package root:

```ts
import {
  GalleyEditor,
  ErrorBoundary,
  useGalley,
  BUILTIN_COMMANDS,
  BUILTIN_COMMAND_NAMES,
  DEFAULT_KEYMAP,
  BUILT_IN_PLUGINS,
  makeInlinePlugin,
  makeBlockPlugin,
} from '@inkyquill/galley-editor';
```

## Components

### `GalleyEditor`

The main controlled editor component.

```tsx
<GalleyEditor value={markdown} onChange={setMarkdown} />
```

Core props:

| Prop | Type | Default |
| --- | --- | --- |
| `value` | `string` | `''` |
| `onChange` | `(value: string) => void` | none |
| `editable` | `boolean` | `true` |
| `placeholder` | `string` | `''` |
| `ariaLabel` | `string` | none |
| `minRows` | `number` | `3` |
| `maxRows` | `number` | none |
| `layout` | `'autosize' \| 'fill'` | `'autosize'` |
| `horizontalScroll` | `boolean` | `false` |
| `theme` | `'light' \| 'dark' \| 'auto' \| 'inherit'` | `'auto'` |
| `mode` | `'live' \| 'markdown' \| 'preview'` | `'live'` |
| `toolbar` | `boolean \| GalleyToolbarOptions` | `true` |
| `footer` | `boolean \| GalleyFooterOptions` | `true` |

Extension props:

| Prop | Purpose |
| --- | --- |
| `classNames` | Override semantic `ge-*` classes. |
| `keymap` | Replace or extend the default keymap. |
| `codeHighlighter` | Render inactive fenced code blocks. |
| `imageRenderer` | Render Markdown image widgets. |
| `missingImageRenderer` | Render empty or failed images. |
| `imageControlsRenderer` | Render selected-image controls. |
| `tableControlIcons` | Replace rendered table editor control icons/text. |
| `onLinkClick` | Intercept Cmd/Ctrl-click links. |
| `plugins` | Add Galley plugins. |
| `disabledPlugins` | Disable built-in plugin ids. |
| `extensions` | Append CodeMirror extensions. |

Event props:

| Prop | Purpose |
| --- | --- |
| `onFocus`, `onBlur` | Focus lifecycle. |
| `onSelectionChange` | Selection changes. |
| `onScroll` | Scroll fraction from 0 to 1. |
| `onEnter`, `onEscape`, `onSubmit` | Keyboard hooks. |
| `onPaste` | Raw paste event. |
| `onFiles`, `onFileStatus`, `onFileError` | Paste/drop file workflows. |

### `ErrorBoundary`

React error boundary for isolating editor failures:

```tsx
<ErrorBoundary fallback={<p>Editor unavailable.</p>}>
  <GalleyEditor value={value} onChange={setValue} />
</ErrorBoundary>
```

## Hook

### `useGalley(options?)`

Small convenience hook around a `GalleyHandle` ref and local content state.

```tsx
const editor = useGalley({ initialValue: '# Draft' });

<GalleyEditor ref={editor.ref} value={editor.content} onChange={editor.setContent} />;
```

## Imperative Handle

`GalleyHandle` is exposed through `ref`.

| Method | Description |
| --- | --- |
| `getContent()` | Read current Markdown. |
| `setContent(value)` | Replace the document. |
| `insertText(text)` | Insert text at the selection. |
| `focus()` / `blur()` | Control focus. |
| `openSearch()` | Open and focus the built-in CodeMirror search panel. Returns `false` before mount. |
| `select(anchor, head?)` | Set selection. |
| `getSelection()` | Read selection. |
| `execCommand(name, ...args)` | Execute built-in or custom commands. |
| `registerCommand(name, fn)` | Register a custom command. |
| `undo()` / `redo()` | History actions. |
| `scrollTo(fraction)` | Scroll by document fraction. |
| `scrollSelectionIntoView()` | Reveal current selection. |
| `getHeadings()` | Return the document outline in order. Each entry contains `from`, `to`, `level`, `text`, and `slug`. |
| `getViewport()` | Return the source range of the currently visible lines. |
| `revealPosition(position, options?)` | Scroll to a source offset. Pass `align: 'start'` to put the target at the top, `select: true` to move the caret, or `focus: true` to focus the editor. |
| `addExtension(ext)` | Add a CodeMirror extension at runtime. |
| `view` | The underlying CodeMirror `EditorView`, or `null` before mount. |

### Document outlines

Read the outline after the editor mounts and when its Markdown changes. Entries
include ATX headings (with one to six `#` markers), including headings in lists
and blockquotes. Fenced and indented code, leading YAML front matter, and Setext
headings are omitted. The entry text omits formatting markers and link
destinations. Use an offset to navigate even if an entry has no slug.

```tsx
const headings = editor.current?.getHeadings() ?? [];

headings.map((heading) => (
  <button
    key={heading.from}
    onClick={() => editor.current?.revealPosition(heading.from, { align: 'start', focus: true })}
  >
    {heading.text || 'Untitled heading'}
  </button>
));
```

`jumpToHash` uses the same outline. For repeated slugs, it adds a numeric
suffix starting with `-1` and skips already assigned slugs. The hash can include
a leading `#` and percent-encoded characters. Cmd/Ctrl-click uses the same
navigation for local Markdown links such as `[Read more](#details)`. Hosts can
intercept the link through `onLinkClick`.

## Constants

| Export | Description |
| --- | --- |
| `BUILTIN_COMMANDS` | Command implementation map. |
| `BUILTIN_COMMAND_NAMES` | Names of all built-in commands. |
| `DEFAULT_KEYMAP` | Galley's default CodeMirror key bindings. |
| `BUILT_IN_PLUGINS` | Built-in rendering plugin list. |

## Plugin Helpers

| Export | Description |
| --- | --- |
| `makeInlinePlugin(spec)` | Build a viewport-only inline decoration plugin. |
| `makeBlockPlugin(spec)` | Build a full-document block decoration plugin. |
| `nodeIntersectsSelection(selection, node)` | Selection helper for plugin specs. |
| `HIDE_DECORATION` | Shared empty replacement decoration. |
| `BLOCK_CURSOR_LINE_PROXIMITY` | Default block reveal proximity. |

## Command Helpers

The package also exports selected command functions directly, including line editing, table editing, image metadata, `findInDocument`, `jumpToHash`, and `slugifyHeading`.

Use direct command functions when you already have a CodeMirror `EditorView`. Use `execCommand()` when working through the Galley ref.
