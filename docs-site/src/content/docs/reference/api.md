---
title: API Reference
description: Public React component props, handle methods, hooks, and extension points.
---

## Component

```tsx
import { GalleyEditor } from '@inky/galley-editor';
```

```tsx
<GalleyEditor
  value={markdown}
  onChange={setMarkdown}
  minRows={10}
/>
```

## Core Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `value` | `string` | `''` | Controlled Markdown content. |
| `onChange` | `(value: string) => void` | | Called when the document changes. |
| `editable` | `boolean` | `true` | Enables or disables editing. |
| `placeholder` | `string` | `''` | Placeholder text for an empty document. |
| `minRows` | `number` | `3` | Minimum visible editor rows. |
| `maxRows` | `number` | | Maximum visible rows before scrolling. |
| `theme` | `'light' \| 'dark' \| 'auto'` | `'auto'` | Color scheme. |
| `mode` | `'live' \| 'markdown' \| 'preview'` | `'live'` | Rendering mode. |
| `toolbar` | `boolean \| GalleyToolbarOptions` | `true` | Built-in toolbar and toolbar slots. |
| `footer` | `boolean \| GalleyFooterOptions` | `true` | Built-in footer and footer slots. |
| `surface` | `GalleySurfaceOptions` | | Shell styling overrides. |
| `className` | `string` | `''` | Class for the outer wrapper. |
| `editorClassName` | `string` | `''` | Class for the CodeMirror editor element. |
| `classNames` | `GalleyClassNames` | defaults | Override semantic class names. |
| `plugins` | `GalleyPlugin[]` | `[]` | Additional Galley plugins. |
| `disabledPlugins` | `string[]` | `[]` | Built-in plugin IDs to disable. |
| `extensions` | `Extension[]` | `[]` | Extra CodeMirror extensions. |

## Renderer Props

| Prop | Description |
| --- | --- |
| `codeHighlighter` | Optional highlighter for inactive fenced code block widgets. |
| `imageRenderer` | Optional renderer for Markdown image widgets. |
| `onLinkClick` | Intercepts Cmd/Ctrl-click link activation. |

## Event Props

| Prop | Description |
| --- | --- |
| `onFocus` | Editor gained focus. |
| `onBlur` | Editor lost focus. |
| `onSelectionChange` | Selection changed. |
| `onScroll` | Scroller moved, reported as a 0-1 fraction. |
| `onEnter` | Enter key hook. Return `true` to consume. |
| `onEscape` | Escape key hook. Return `true` to consume. |
| `onPaste` | Clipboard paste hook. |
| `onSubmit` | Cmd/Ctrl+Enter hook. |

## Imperative Handle

```tsx
import { useRef } from 'react';
import type { GalleyHandle } from '@inky/galley-editor';

const editor = useRef<GalleyHandle>(null);
```

| Method | Description |
| --- | --- |
| `getContent()` | Returns the current Markdown document. |
| `setContent(value)` | Replaces the full document. |
| `insertText(text)` | Inserts text at the current selection. |
| `focus()` | Focuses the editor. |
| `blur()` | Blurs the editor. |
| `select(anchor, head?)` | Sets the current selection. |
| `getSelection()` | Returns `{ from, to, anchor, head }`. |
| `execCommand(name, ...args)` | Executes a built-in or custom command. |
| `registerCommand(name, fn)` | Registers a custom command. |
| `undo()` | Undo. |
| `redo()` | Redo. |
| `scrollTo(fraction)` | Scrolls by 0-1 fraction. |
| `scrollSelectionIntoView()` | Scrolls the selection into view. |
| `addExtension(ext)` | Adds a runtime CodeMirror extension and returns a remove handle. |
| `view` | Read-only access to the current CodeMirror `EditorView`. |

## Hook

`useGalley(options?)` owns a ref, tracks controlled content, and returns stable method wrappers.

```tsx
import { GalleyEditor, useGalley } from '@inky/galley-editor';

export function Editor() {
  const editor = useGalley({ initialValue: '# Hello' });

  return (
    <GalleyEditor
      ref={editor.ref}
      value={editor.content}
      onChange={editor.setContent}
    />
  );
}
```
