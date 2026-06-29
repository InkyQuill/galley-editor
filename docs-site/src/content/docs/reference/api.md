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
| `theme` | `'light' \| 'dark' \| 'auto'` | `'auto'` |
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
| `select(anchor, head?)` | Set selection. |
| `getSelection()` | Read selection. |
| `execCommand(name, ...args)` | Execute built-in or custom commands. |
| `registerCommand(name, fn)` | Register a custom command. |
| `undo()` / `redo()` | History actions. |
| `scrollTo(fraction)` | Scroll by document fraction. |
| `scrollSelectionIntoView()` | Reveal current selection. |
| `addExtension(ext)` | Add a CodeMirror extension at runtime. |
| `view` | The underlying CodeMirror `EditorView`, or `null` before mount. |

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
