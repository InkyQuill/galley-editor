# Galley Editor Complete Guide

Galley Editor is a React component library for live-preview Markdown editing. Markdown remains the source of truth. CodeMirror 6 owns editing, Lezer parses Markdown, and Galley adds visual decorations, toolbar controls, commands, renderers, and themeable CSS classes.

## Basic Setup

```tsx
import { useState } from 'react';
import { GalleyEditor } from '@inky/galley-editor';
import '@inky/galley-editor/style.css';

export function NotesEditor() {
  const [value, setValue] = useState('# Notes\n\nStart writing...');

  return (
    <GalleyEditor
      value={value}
      onChange={setValue}
      minRows={10}
      theme="auto"
      placeholder="Write in Markdown..."
    />
  );
}
```

## Custom Commands

Commands receive CodeMirror's `EditorView`. Register them through the imperative handle and run them with `execCommand()`.

```tsx
import { useEffect, useRef, useState } from 'react';
import type { GalleyHandle } from '@inky/galley-editor';
import { GalleyEditor } from '@inky/galley-editor';

export function EditorWithCommands() {
  const ref = useRef<GalleyHandle>(null);
  const [value, setValue] = useState('');

  useEffect(() => {
    ref.current?.registerCommand('insertTimestamp', (view) => {
      view.dispatch(view.state.replaceSelection(new Date().toISOString()));
      return true;
    });
  }, []);

  return <GalleyEditor ref={ref} value={value} onChange={setValue} />;
}
```

Custom commands take precedence over built-ins with the same name.

## Built-In Commands

Built-ins: `toggleBold`, `toggleItalic`, `toggleCode`, `toggleStrikethrough`, `toggleHeading`, `toggleBulletList`, `toggleOrderedList`, `toggleCheckList`, `insertLink`, `insertImage`, `insertCodeBlock`, `insertTable`, `insertHr`, `indent`, `outdent`, `duplicateLine`, `sortSelectedLines`, `swapLineUp`, `swapLineDown`, `insertLineAfter`, `insertLineBefore`, `jumpToHash`, `findInDocument`, `undo`, `redo`, `selectAll`.

Default keybindings include `Mod-B`, `Mod-I`, `Mod-K`, `Mod-D`, `Alt-ArrowUp`, `Alt-ArrowDown`, `Mod-Alt-ArrowUp`, `Mod-Alt-ArrowDown`, `Mod-Z`, `Mod-Shift-Z`, and `Mod-A`.

Use `keymap={(defaults) => [...defaults, customBinding]}` to extend defaults. Use `keymap={[customBinding]}` only when replacing the keymap.

## Supporting Actions

The imperative handle exposes `getContent()`, `setContent(value)`, `insertText(text)`, `focus()`, `blur()`, `select(anchor, head?)`, `getSelection()`, `execCommand(name, ...args)`, `registerCommand(name, fn)`, `undo()`, `redo()`, `scrollTo(fraction)`, `scrollSelectionIntoView()`, `addExtension(extension)`, and read-only `view`.

Event props include `onFocus`, `onBlur`, `onSelectionChange`, `onScroll`, `onEnter`, `onEscape`, `onPaste`, `onFiles`, `onFileStatus`, `onFileError`, and `onSubmit`.

## Custom Toolbar Buttons

Use `toolbar.before` and `toolbar.after` slots. Slot functions receive `{ value, mode, canEdit, editor, execCommand, setMode, cycleMode }`.

```tsx
<GalleyEditor
  toolbar={{
    after: ({ canEdit, execCommand }) => (
      <button
        type="button"
        className="ge-toolbar-button"
        disabled={!canEdit}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => execCommand('insertHr')}
      >
        HR
      </button>
    ),
  }}
/>
```

Use `onMouseDown={(event) => event.preventDefault()}` on toolbar buttons so the editor selection is preserved before the command runs.

## Custom Toolbar Icons

Use `toolbar.icons`. Values can be React nodes or render functions.

```tsx
import { Bold, Code2, Link } from 'lucide-react';

<GalleyEditor
  toolbar={{
    icons: {
      bold: <Bold size={16} aria-hidden="true" />,
      inlineCode: <Code2 size={16} aria-hidden="true" />,
      link: <Link size={16} aria-hidden="true" />,
      mode: ({ mode }) => <span aria-hidden="true">{mode.slice(0, 1).toUpperCase()}</span>,
    },
  }}
/>
```

Supported icon names: `bold`, `italic`, `strikethrough`, `inlineCode`, `bulletList`, `orderedList`, `taskList`, `link`, `image`, `codeBlock`, `table`, `divider`, `undo`, `redo`, `mode`.

## Custom Renderers

`codeHighlighter` returns highlighted HTML as a string or an `HTMLElement`.

```tsx
<GalleyEditor
  codeHighlighter={({ code, language, theme }) => highlight(code, { language, theme })}
/>
```

String output is assigned to `innerHTML`; sanitize unsafe highlighter output.

`imageRenderer` is a DOM renderer, not a React component. Return an `HTMLElement` or `null`.

```tsx
<GalleyEditor
  imageRenderer={({ alt, url, title }) => {
    const image = document.createElement('img');
    image.src = url;
    image.alt = alt;
    image.loading = 'lazy';
    if (title) image.title = title;
    return image;
  }}
/>
```

Return `null` to show image alt text without an image element.

## Custom Render Plugins

Use `makeInlinePlugin()` for viewport-only inline decorations and `makeBlockPlugin()` for full-document block decorations.

```tsx
import { Decoration } from '@codemirror/view';
import { makeInlinePlugin, type GalleyPlugin } from '@inky/galley-editor';

const markPlugin: GalleyPlugin = {
  id: 'app:mark',
  extensions() {
    return [
      makeInlinePlugin({
        createDecoration(node) {
          if (node.name !== 'HighlightMark') return null;
          return Decoration.mark({ class: 'app-highlight' });
        },
        hideWhenNearCursor: false,
        getRevealStrategy: () => false,
      }),
    ];
  },
};

<GalleyEditor plugins={[markPlugin]} />;
```

Disable built-ins with `disabledPlugins`. Built-in IDs are `ge:headings`, `ge:emphasis`, `ge:code-inline`, `ge:code-fence`, `ge:blockquote`, `ge:links`, `ge:images`, `ge:lists`, `ge:checkboxes`, `ge:dividers`, and `ge:tables`.

## Styling

Import `@inky/galley-editor/style.css` for defaults. Scope CSS variable overrides with `className`.

```css
.notes-editor {
  --ge-color-text: #172033;
  --ge-color-text-muted: #667085;
  --ge-color-bg: #ffffff;
  --ge-color-surface: #f7f9fc;
  --ge-color-surface-elevated: #ffffff;
  --ge-color-border: #d5deea;
  --ge-color-link: #0f766e;
  --ge-color-link-hover: #115e59;
  --ge-color-focus-ring: #0f766e;
  --ge-font-body: Inter, ui-sans-serif, system-ui, sans-serif;
  --ge-font-mono: "JetBrains Mono", ui-monospace, monospace;
  --ge-font-size: 1rem;
  --ge-line-height: 1.65;
  --ge-content-padding: 40px 52px;
}
```

Use `editorClassName` for the CodeMirror `.cm-editor` root. Use `classNames` to replace semantic classes such as `ge-h1`, `ge-link`, and `ge-code-fence`.

Important semantic classes include `ge-heading`, `ge-h1` through `ge-h6`, `ge-bold`, `ge-italic`, `ge-strikethrough`, `ge-code-inline`, `ge-code-fence`, `ge-code-block`, `ge-link`, `ge-blockquote`, `ge-table`, `ge-image-frame`, `ge-divider`, `ge-divider-widget`, `ge-checkbox`, `ge-completed-task`, and `ge-list-marker`.

## Custom Theme

The `theme` prop controls `data-theme="light"` or `data-theme="dark"` on the wrapper. `theme="auto"` follows the system preference. A custom theme is a scoped variable set.

```css
.journal-theme {
  --ge-color-bg: #fffdf8;
  --ge-color-surface: #f3f6f3;
  --ge-color-surface-elevated: #ffffff;
  --ge-color-text: #1c2430;
  --ge-color-text-muted: #657080;
  --ge-color-border: #cfd9d0;
  --ge-color-link: #276749;
  --ge-color-link-hover: #22543d;
  --ge-color-code-bg: rgba(39, 103, 73, 0.11);
  --ge-color-code-fence-bg: #f4f7f1;
  --ge-color-focus-ring: #276749;
}

.journal-theme[data-theme='dark'] {
  --ge-color-bg: #111713;
  --ge-color-surface: #17201a;
  --ge-color-surface-elevated: #1c271f;
  --ge-color-text: #eef4ed;
  --ge-color-text-muted: #aab8ad;
  --ge-color-border: rgba(178, 201, 184, 0.22);
  --ge-color-link: #8bd7a7;
  --ge-color-link-hover: #b7e8c8;
  --ge-color-focus-ring: #8bd7a7;
}
```

`surface.style` applies to `.ge-editor-shell`. `surface.contentPadding`, `surface.toolbarPadding`, and `surface.footerPadding` set the matching CSS variables.

## File Uploads

Galley keeps storage and upload behavior app-owned. Provide `onFiles` to handle pasted or dropped files, return Markdown when uploads finish, and use `input.report()` plus `onFileStatus` to keep upload UI responsive while the editor waits for the result.

```tsx
const escapeMarkdownLabel = (value: string) =>
  value.replace(/[\n\r[\]\\]/g, ' ').trim();

async function handleFiles(input: GalleyFileInput) {
  const markdown = [];

  for (const [index, file] of input.files.entries()) {
    input.report({
      phase: 'progress',
      progress: index / input.files.length,
      message: `Uploading ${file.name}`,
    });
    await uploadToStorage(file);
    markdown.push(`[${escapeMarkdownLabel(file.name)}](/uploads/${encodeURIComponent(file.name)})`);
  }

  input.report({ phase: 'progress', progress: 1, message: 'Inserting links' });
  return markdown;
}

<GalleyEditor
  onFiles={handleFiles}
  onFileStatus={(status) => setUploadStatus(status)}
  onFileError={(error, input) => console.error('Upload failed', input.files, error)}
/>;
```

`onFiles` handles both paste and drop. Galley prevents default file handling, preserves the original selection while the promise resolves, and inserts the returned Markdown when the handler completes. Track upload status in app state when needed, or render editor-resident progress with the default inline placeholder or `uploadPlaceholderRenderer`. Resolve uploaded asset IDs or signed URLs in `imageRenderer`.

```tsx
<GalleyEditor
  onFiles={uploadFiles}
  uploadInteraction="inline"
  uploadPlaceholderRenderer={(upload) => {
    const element = document.createElement('div');
    element.textContent = `${upload.phase}: ${Math.round((upload.progress ?? 0) * 100)}%`;
    return element;
  }}
/>
```
