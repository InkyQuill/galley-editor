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
| `onFiles` | Handles pasted or dropped files and returns markdown to insert. |
| `onFileError` | Receives errors thrown or rejected by `onFiles`. |
| `onFileStatus` | Receives file workflow `start`, `progress`, `complete`, and `error` status updates. |
| `onSubmit` | Cmd/Ctrl+Enter hook. |

## File Workflows

```ts
type GalleyFileSource = 'paste' | 'drop';
type GalleyFileStatusPhase = 'start' | 'progress' | 'complete' | 'error';

interface GalleyFileStatusUpdate {
  phase: GalleyFileStatusPhase;
  progress?: number;
  message?: string;
  error?: unknown;
}

interface GalleyFileInput {
  id: string;
  files: File[];
  source: GalleyFileSource;
  event: ClipboardEvent | DragEvent;
  view: EditorView;
  selection: { from: number; to: number; anchor: number; head: number };
  report(update: GalleyFileStatusUpdate): void;
}

interface GalleyFileStatus {
  id: string;
  phase: GalleyFileStatusPhase;
  progress?: number;
  message?: string;
  error?: unknown;
  files: File[];
  source: GalleyFileSource;
  selection: { from: number; to: number; anchor: number; head: number };
}
```

`onFiles(input)` may return a markdown string, an array of markdown strings, `false`, `null`, or a promise of those values. Arrays are joined with newlines and inserted at the original paste selection or drop position.

Use `input.report()` for upload progress. Galley forwards those updates to `onFileStatus(status)` and emits `start`, `complete`, and `error` phases around the handler. `onFileError(error, input)` runs when the handler throws or rejects.

```tsx
const escapeMarkdownAlt = (value: string) =>
  value.replace(/[\n\r[\]\\]/g, ' ').trim();

const fakeUpload = async (file: File) =>
  `![${escapeMarkdownAlt(file.name)}](/uploads/${encodeURIComponent(file.name)})`;

<GalleyEditor
  onFiles={async (input) => {
    input.report({ phase: 'progress', progress: 0.5, message: 'Uploading...' });
    return Promise.all(input.files.map(fakeUpload));
  }}
  onFileStatus={(status) => setUploadStatus(status)}
  onFileError={(error, input) => logUploadFailure(input.files, error)}
/>
```

## Image Renderer

```ts
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

Image metadata uses this markdown syntax:

```md
![Alt](image.png "Title"){width=640 height=360}
```

`imageRenderer` receives `url` rather than `src`, plus source positions (`from`, `to`) so custom widgets can select the image and call metadata commands.

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

## Image Commands

```ts
editor.current?.execCommand('updateImageMetadata', {
  alt: 'Alt',
  url: 'image.png',
  title: 'Title',
  width: 640,
  height: 360,
});

editor.current?.execCommand('clearImageDimensions');
```

`updateImageMetadata` updates the image at the current cursor or selection. Pass `null` for `title`, `width`, or `height` to remove that field. `clearImageDimensions` removes only `width` and `height`.

Both commands are also named exports:

```ts
import { clearImageDimensions, updateImageMetadata } from '@inky/galley-editor';
```

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
