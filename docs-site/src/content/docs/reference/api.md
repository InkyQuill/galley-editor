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
| `value` | `string` | none |
| `defaultValue` | `string` | `''` |
| `onChange` | `(value: string) => void` | none |
| `editable` | `boolean` | `true` |
| `placeholder` | `string` | `''` |
| `ariaLabel` | `string` | none |
| `spellcheck` | `boolean` | CodeMirror default |
| `minRows` | `number` | `3` |
| `maxRows` | `number` | none |
| `layout` | `'autosize' \| 'fill'` | `'autosize'` |
| `horizontalScroll` | `boolean` | `false` |
| `theme` | `'light' \| 'dark' \| 'auto' \| 'inherit'` | `'auto'` |
| `mode` | `'live' \| 'markdown' \| 'preview'` | `'live'` |
| `toolbar` | `boolean \| GalleyToolbarOptions` | `true` |
| `labels` | `Partial<GalleyLabels>` | English |
| `footer` | `boolean \| GalleyFooterOptions` | `true` |

Set `value` and update it synchronously in `onChange` when React owns the
document. Debounce saving or downstream consumers of the document. A delayed
`value` is applied as an external edit, so sending an older snapshot can
replace newer local text. External edits map the current selection through the
change and preserve undo history for edits outside the changed range. They do not emit `onChange`
or create a new undo step. Passing the same `value` again leaves local edits
in place. To replace the draft explicitly, call `setContent()` for an undoable
change or change `docKey` for a fresh document with reset history, selection, and
scroll. Omit `value` and supply `defaultValue` when the editor owns the document.
Toolbar and footer slots read the live Markdown in either case.

```tsx
<GalleyEditor
  id="draft"
  data-document="chapter-7"
  style={{ minWidth: 0 }}
  defaultValue="# Chapter 7"
  spellcheck
  onChange={saveDraft}
/>
```

`id`, `style`, `className`, and `data-*` go on the outer wrapper. Use
`surface.className` and `surface.style` to style the inner editor shell. Use
`editorClassName` to target CodeMirror itself.

Extension props:

| Prop | Purpose |
| --- | --- |
| `classNames` | Override semantic `ge-*` classes. |
| `keymap` | Replace or extend the default keymap. |
| `codeHighlighter` | Render inactive fenced code blocks. |
| `imageRenderer` | Render Markdown image widgets. |
| `resolveImageSource` | Resolve a Markdown URL for the built-in image renderer. |
| `missingImageRenderer` | Render empty or failed images. |
| `imageControlsRenderer` | Render selected-image controls. |
| `tableControlIcons` | Replace rendered table editor control icons/text. |
| `onLinkClick` | Intercept Cmd/Ctrl-click links. |
| `plugins` | Add Galley plugins. |
| `disabledPlugins` | Disable built-in plugin ids. |
| `extensions` | Append CodeMirror extensions. |

Keep plugin arrays, class-name overrides, extensions, renderer callbacks, and
keymap overrides stable between renders unless their contents change. Define
static configuration outside the wrapper component or memoize it in React.

Use `resolveImageSource` when your application stores relative image paths and
needs to serve them through a local asset protocol or a document-scoped URL.
Return `undefined` to use the Markdown URL as written or `null` to show the
missing image placeholder. The resolver is synchronous and leaves the source
document and image metadata intact. Galley can call the resolver again when it
rebuilds image widgets after an edit. Keep lookups cheap and reuse resolved URLs.
If you use object URLs, create and revoke them in the host code that manages the
assets. A custom `imageRenderer` owns its own URL resolution.

```tsx
<GalleyEditor
  defaultValue="![Cover](assets/cover.png)"
  resolveImageSource={({ url }) => documentAssets.get(url)}
/>
```

Event props:

| Prop | Purpose |
| --- | --- |
| `onReady` | Called after each CodeMirror view mounts and the public ref is assigned. React Strict Mode may create a second view during development. |
| `onFocus`, `onBlur` | Focus lifecycle. |
| `onSelectionChange` | Selection changes. |
| `onScroll` | Scroll fraction from 0 to 1. |
| `onViewportChange` | Reports the initial visible source range on the first animation frame after observation is enabled, then reports changed ranges at most once per frame. |
| `onEnter`, `onEscape`, `onSubmit` | Keyboard hooks. |
| `onPaste` | Raw paste event. |
| `onFiles`, `onFileStatus`, `onFileError` | Paste/drop file workflows. |

Read `ref.current?.view` for the current view if you need to retain an editor
reference beyond `onReady`. An earlier view can be destroyed during a remount.
Switching an active viewport callback to another function preserves the current
range. The replacement receives the next changed range. Turning observation off
and back on sends a fresh initial range.

### `ErrorBoundary`

React error boundary for isolating editor failures:

```tsx
<ErrorBoundary resetKey={documentId} fallback={<p>Editor unavailable.</p>} onError={reportEditorError}>
  <GalleyEditor value={value} onChange={setValue} />
</ErrorBoundary>
```

Supply `resetKey` to recover when the document changes. Without a custom
fallback, the default recovery screen announces the error as an alert, uses the host theme, and accepts localized
`labels.heading`, `labels.details`, and `labels.retry` strings.

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
| `setContent(value)` | Replace the text as an undoable edit and emit `onChange` if the text changed. |
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
| `getViewport()` | Measure the source range of the currently visible lines. Call outside CodeMirror update listeners. |
| `revealPosition(position, options?)` | Scroll to a source offset using nearest-edge alignment by default. Pass `align: 'start'` to put the target at the top, `select: true` to move the caret, or `focus: true` to focus the editor. Invalid offsets are ignored. |
| `addExtension(ext)` | Add a CodeMirror extension at runtime. |
| `view` | The underlying CodeMirror `EditorView`, or `null` before mount. |

### Document outlines

Read the outline after the editor mounts and when its Markdown changes. Galley
parses the current Markdown and caches the result for the same document. Entries
cover ATX headings (with one to six `#` markers), including headings in lists
and blockquotes. Fenced and indented code, leading YAML front matter that starts
with a key-value field, and Setext headings are omitted. The entry text omits
formatting markers and link destinations. Use a source offset to navigate even
if an entry has no slug. Offsets count UTF-16 code units, as they do in
JavaScript strings and CodeMirror documents.

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
intercept the link through `onLinkClick`. An unmatched fragment leaves the
editor in place and `jumpToHash()` returns `false`.

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
