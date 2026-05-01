---
title: Complete Guide
description: Commands, renderers, toolbar controls, styling, themes, uploads, and LLM-readable docs for Galley Editor.
---

This guide covers the main extension points in Galley Editor. It is written for React apps that want a controlled Markdown editor, app-owned commands, custom rendering, toolbar controls, theme integration, and file upload workflows.

## LLM-Readable Copy

Use these links when you want to give the documentation to an assistant, crawler, or build script:

- [Machine-readable guide](../../llms/complete-guide.md) - this page as plain Markdown.
- [LLM index](../../llms.txt) - stable entry points for machine-readable docs.

The Markdown copy is intentionally static and source-like. It is better for retrieval, copying into prompts, and diffing than the rendered HTML page.

The public GitLab Pages URLs are:

- `https://pages.inkyquill.net/inky/galley-editor/llms.txt`
- `https://pages.inkyquill.net/inky/galley-editor/llms/complete-guide.md`

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
      ariaLabel="Notes body"
    />
  );
}
```

`value` is controlled Markdown. `onChange` receives the next Markdown document. Galley does not convert your document to HTML; CodeMirror and Lezer parse the Markdown source and Galley adds visual decorations on top.

## Add Custom Commands

Commands are functions that receive the underlying CodeMirror `EditorView`. Register commands through the imperative handle, then call them with `execCommand()`.

```tsx
import { useEffect, useRef, useState } from 'react';
import type { GalleyHandle } from '@inky/galley-editor';
import { GalleyEditor } from '@inky/galley-editor';

export function EditorWithCommands() {
  const ref = useRef<GalleyHandle>(null);
  const [value, setValue] = useState('');

  useEffect(() => {
    ref.current?.registerCommand('insertTimestamp', (view) => {
      const stamp = new Date().toISOString();
      view.dispatch(view.state.replaceSelection(stamp));
      return true;
    });
  }, []);

  return (
    <>
      <button type="button" onClick={() => ref.current?.execCommand('insertTimestamp')}>
        Insert timestamp
      </button>
      <GalleyEditor ref={ref} value={value} onChange={setValue} />
    </>
  );
}
```

Custom commands take precedence over built-ins with the same name. Use unique names such as `app:insertCallout` if you want to avoid accidental overrides.

## Built-In Commands

All built-ins are available with `editor.execCommand(name, ...args)`, toolbar buttons, and the exported `BUILTIN_COMMANDS` registry.

| Command | Arguments | What it does |
| --- | --- | --- |
| `toggleBold` | none | Toggle `**bold**`. |
| `toggleItalic` | none | Toggle `*italic*`. |
| `toggleCode` | none | Toggle inline backtick code. |
| `toggleStrikethrough` | none | Toggle `~~strikethrough~~`. |
| `toggleHeading` | `level?: 1 | 2 | 3 | 4 | 5 | 6` | Add, remove, or change ATX heading syntax. |
| `toggleBulletList` | none | Add or remove `- ` markers. |
| `toggleOrderedList` | none | Add or remove ordered-list markers. |
| `toggleCheckList` | none | Add or remove `- [ ] ` task markers. |
| `insertLink` | `label?: string`, `url?: string` | Insert `[label](url)`. |
| `insertImage` | `alt?: string`, `url?: string` | Insert `![alt](url)`. |
| `insertCodeBlock` | `language?: string` | Insert a fenced code block. |
| `insertTable` | none | Insert a starter Markdown table. |
| `normalizeTable` | none | Rewrite selected tables with canonical pipe-table formatting. |
| `commitTableCell` | `{ row: number; column: number }`, `text: string` | Update a rendered table cell. |
| `insertTableRowBefore` | none | Insert a body row before the current table row. |
| `insertTableRowAfter` | none | Insert a body row after the current table row. |
| `deleteTableRow` | none | Delete the current body row. |
| `insertTableColumnBefore` | none | Insert a column before the current table column. |
| `insertTableColumnAfter` | none | Insert a column after the current table column. |
| `deleteTableColumn` | none | Delete the current table column. |
| `setTableColumnAlignment` | `'left' | 'center' | 'right' | null` | Set or clear current column alignment. |
| `revealTableSource` | `{ row: number; column: number }?` | Move the selection to table cell source. |
| `insertHr` | none | Insert a horizontal rule. |
| `indent` | none | Indent touched lines. |
| `outdent` | none | Outdent touched lines. |
| `duplicateLine` | none | Duplicate the current or selected lines. |
| `sortSelectedLines` | `'asc' | 'desc'` or options | Sort selected lines. |
| `swapLineUp` | none | Move touched lines upward. |
| `swapLineDown` | none | Move touched lines downward. |
| `insertLineBefore` | none | Insert a blank line before touched lines. |
| `insertLineAfter` | none | Insert a blank line after touched lines. |
| `jumpToHash` | `hash: string` | Move the cursor to a heading slug. |
| `findInDocument` | `needle: string`, `opts?: FindOpts` | Return search match positions. |
| `undo` | none | Undo. |
| `redo` | none | Redo. |
| `selectAll` | none | Select the whole document. |

Default command keybindings include `Mod-B`, `Mod-I`, `Mod-K`, `Mod-D`, `Alt-ArrowUp`, `Alt-ArrowDown`, `Mod-Alt-ArrowUp`, `Mod-Alt-ArrowDown`, `Mod-Z`, `Mod-Shift-Z`, and `Mod-A`.

Table commands use rendered cell indexes: header row `0`, body rows start at `1`, and the separator row stays structural Markdown source. In editable live mode, clicking a rendered table cell starts visual table editing; Ctrl/Cmd-click or `revealTableSource` returns to Markdown source. Table editing commands return `false` when the selection is outside a supported table.

Use the `keymap` prop to extend or replace bindings:

```tsx
<GalleyEditor
  keymap={(defaults) => [
    ...defaults,
    {
      key: 'Mod-Shift-T',
      run: (view) => {
        view.dispatch(view.state.replaceSelection(':::tip\n\n:::\n'));
        return true;
      },
    },
  ]}
/>
```

## Supporting Actions

The imperative handle also exposes non-command actions:

| Method | Purpose |
| --- | --- |
| `getContent()` | Read the current Markdown document. |
| `setContent(value)` | Replace the document. |
| `insertText(text)` | Insert text at the current selection. |
| `focus()` / `blur()` | Control focus. |
| `select(anchor, head?)` | Set cursor or selection. |
| `getSelection()` | Read `{ from, to, anchor, head }`. |
| `scrollTo(fraction)` | Scroll by `0` to `1` fraction. |
| `scrollSelectionIntoView()` | Reveal the current selection. |
| `addExtension(extension)` | Register a CodeMirror extension at runtime and receive a `remove()` handle. |
| `view` | Read-only access to the current CodeMirror `EditorView`. |

Event props include `onFocus`, `onBlur`, `onSelectionChange`, `onScroll`, `onEnter`, `onEscape`, `onPaste`, `onFiles`, `onFileStatus`, `onFileError`, and `onSubmit`.

Use `ariaLabel` to give the underlying editable CodeMirror content element an accessible name:

```tsx
<GalleyEditor
  value={value}
  onChange={setValue}
  ariaLabel="Release notes body"
/>
```

## Add Custom Toolbar Buttons

Use `toolbar.before` and `toolbar.after` to render custom controls into the built-in toolbar. Slot render functions receive `{ value, mode, canEdit, editor, execCommand, setMode, cycleMode }`.

```tsx
<GalleyEditor
  value={value}
  onChange={setValue}
  toolbar={{
    after: ({ canEdit, execCommand }) => (
      <button
        type="button"
        className="ge-toolbar-button"
        disabled={!canEdit}
        title="Insert callout"
        aria-label="Insert callout"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => execCommand('app:insertCallout', 'note')}
      >
        !
      </button>
    ),
  }}
/>
```

Keep `onMouseDown={(event) => event.preventDefault()}` on toolbar buttons. It preserves the editor selection before the click handler runs.

## Add Custom Toolbar Icons

The `toolbar.icons` map replaces built-in button contents. Values can be React nodes or render functions.

```tsx
import { Bold, Code2, Image, Link, Redo2, Undo2 } from 'lucide-react';

<GalleyEditor
  toolbar={{
    icons: {
      bold: <Bold size={16} aria-hidden="true" />,
      inlineCode: <Code2 size={16} aria-hidden="true" />,
      link: <Link size={16} aria-hidden="true" />,
      image: <Image size={16} aria-hidden="true" />,
      undo: <Undo2 size={16} aria-hidden="true" />,
      redo: <Redo2 size={16} aria-hidden="true" />,
      mode: ({ mode }) => <span aria-hidden="true">{mode.slice(0, 1).toUpperCase()}</span>,
    },
  }}
/>
```

Supported icon names are `bold`, `italic`, `strikethrough`, `inlineCode`, `bulletList`, `orderedList`, `taskList`, `link`, `image`, `codeBlock`, `table`, `divider`, `undo`, `redo`, and `mode`.

The complete icon-name contract is exported as `ToolbarIconName`. This example uses Remix Icon components:

```tsx
import {
  RiBold,
  RiCodeLine,
  RiImageLine,
  RiLink,
  RiListOrdered,
  RiListUnordered,
  RiTableLine,
} from '@remixicon/react';
import type { ReactNode } from 'react';
import type { ToolbarIconName } from '@inky/galley-editor';

const icons = {
  bold: <RiBold size={16} aria-hidden="true" />,
  inlineCode: <RiCodeLine size={16} aria-hidden="true" />,
  bulletList: <RiListUnordered size={16} aria-hidden="true" />,
  orderedList: <RiListOrdered size={16} aria-hidden="true" />,
  link: <RiLink size={16} aria-hidden="true" />,
  image: <RiImageLine size={16} aria-hidden="true" />,
  table: <RiTableLine size={16} aria-hidden="true" />,
} satisfies Partial<Record<ToolbarIconName, ReactNode>>;

<GalleyEditor toolbar={{ icons }} />;
```

## Add Custom Renderers

Galley has three renderer layers:

- `codeHighlighter` for inactive fenced code blocks.
- `imageRenderer` for Markdown image widgets.
- `plugins` and `extensions` for deeper CodeMirror rendering behavior.

### Code Highlighter

`codeHighlighter` returns highlighted HTML as a string or an `HTMLElement`.

```tsx
<GalleyEditor
  codeHighlighter={({ code, language, theme }) => {
    return highlight(code, { language, theme });
  }}
/>
```

String output is assigned to `innerHTML`. If a third-party highlighter can emit unsafe HTML, sanitize it before returning.

### Image Renderer

`imageRenderer` is a DOM renderer, not a React component. Return an `HTMLElement` or `null`.

```tsx
<GalleyEditor
  imageRenderer={({ alt, url, title }) => {
    const figure = document.createElement('figure');
    figure.className = 'asset-preview';

    const image = document.createElement('img');
    image.src = url;
    image.alt = alt;
    image.loading = 'lazy';
    if (title) image.title = title;

    figure.append(image);
    if (title) {
      const caption = document.createElement('figcaption');
      caption.textContent = title;
      figure.append(caption);
    }

    return figure;
  }}
/>
```

Return `null` when you want Galley to show the image alt text without an image element.

## Add Custom Render Plugins

Use `makeInlinePlugin()` for viewport-only inline decorations and `makeBlockPlugin()` for full-document block decorations.

```tsx
import { Decoration } from '@codemirror/view';
import { makeInlinePlugin, type GalleyPlugin } from '@inky/galley-editor';

const markPlugin: GalleyPlugin = {
  id: 'app:mark',
  extensions() {
    return [
      makeInlinePlugin({
        createDecoration(node, state) {
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

Disable built-ins with their plugin IDs:

```tsx
<GalleyEditor disabledPlugins={['ge:tables', 'ge:images']} />
```

Built-in IDs are `ge:headings`, `ge:emphasis`, `ge:code-inline`, `ge:code-fence`, `ge:blockquote`, `ge:links`, `ge:images`, `ge:lists`, `ge:checkboxes`, `ge:dividers`, and `ge:tables`.

## Styling The Editor

Import `@inky/galley-editor/style.css` for the default theme. The stylesheet is intentionally small and exposes a CSS variable contract. Scope overrides with `className`.

```tsx
<GalleyEditor className="notes-editor" value={value} onChange={setValue} />
```

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

Use `editorClassName` for rules that must target the CodeMirror `.cm-editor` root, and `classNames` when a design system needs to replace Galley's semantic `ge-*` classes.

```tsx
<GalleyEditor
  editorClassName="notes-cm"
  classNames={{
    h1: 'ds-heading-xl',
    link: 'ds-link',
    blockCode: 'ds-code-block',
  }}
/>
```

Key semantic classes include `ge-heading`, `ge-h1` through `ge-h6`, `ge-bold`, `ge-italic`, `ge-strikethrough`, `ge-code-inline`, `ge-code-fence`, `ge-code-block`, `ge-link`, `ge-blockquote`, `ge-table`, `ge-image-frame`, `ge-divider`, `ge-divider-widget`, `ge-checkbox`, `ge-completed-task`, and `ge-list-marker`.

## Write A Custom Theme

The `theme` prop controls `data-theme="light"` or `data-theme="dark"` on the wrapper. `theme="auto"` follows the system preference. A full custom theme is just a scoped variable set.

```tsx
<GalleyEditor className="journal-theme" theme="auto" value={value} onChange={setValue} />
```

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
  --ge-color-code-header-bg: rgba(39, 103, 73, 0.08);
  --ge-color-blockquote-border: rgba(39, 103, 73, 0.35);
  --ge-color-blockquote-fg: #4a5b53;
  --ge-color-selection: rgba(39, 103, 73, 0.2);
  --ge-color-focus-ring: #276749;
  --ge-shadow-editor: 0 14px 34px rgba(28, 36, 48, 0.08);
  --ge-radius-editor: 6px;
  --ge-radius-block: 5px;
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
  --ge-color-code-bg: rgba(139, 215, 167, 0.14);
  --ge-color-code-fence-bg: #142018;
  --ge-color-code-header-bg: rgba(139, 215, 167, 0.1);
  --ge-color-blockquote-fg: #b7c7ba;
  --ge-color-selection: rgba(139, 215, 167, 0.26);
  --ge-color-focus-ring: #8bd7a7;
}
```

For one-off shell tweaks, use `surface`:

```tsx
<GalleyEditor
  surface={{
    style: { borderColor: 'color-mix(in srgb, currentColor 18%, transparent)' },
    contentPadding: '48px 60px',
    toolbarPadding: '10px 12px',
    footerPadding: '6px 12px',
  }}
/>
```

When the host app uses its own `.dark` class, keep Galley's color decisions on the editor wrapper. `theme="auto"` resolves to `data-theme="light"` or `data-theme="dark"`, so CSS can target both systems without duplicating JS state:

```tsx
<section className="aurora-workspace dark">
  <GalleyEditor
    className="aurora-editor"
    theme="auto"
    ariaLabel="Knowledge base note"
    value={value}
    onChange={setValue}
  />
</section>
```

```css
.aurora-editor {
  --ge-color-bg: rgba(255, 255, 255, 0.78);
  --ge-color-surface: rgba(241, 245, 249, 0.72);
  --ge-color-surface-elevated: rgba(255, 255, 255, 0.88);
  --ge-color-border: rgba(148, 163, 184, 0.34);
  --ge-color-focus-ring: #2563eb;
}

.aurora-editor[data-theme='dark'] {
  --ge-color-bg: rgba(15, 23, 42, 0.74);
  --ge-color-surface: rgba(30, 41, 59, 0.58);
  --ge-color-surface-elevated: rgba(15, 23, 42, 0.86);
  --ge-color-border: rgba(148, 163, 184, 0.22);
  --ge-color-focus-ring: #38bdf8;
}
```

For dense product workspaces, reduce padding and typography through stable variables:

```tsx
<GalleyEditor
  className="compact-editor"
  ariaLabel="Note body"
  toolbar={{ icons }}
  footer={{ logo: false }}
  surface={{
    contentPadding: '18px 22px',
    toolbarPadding: '6px 8px',
    footerPadding: '4px 8px',
  }}
/>
```

```css
.compact-editor {
  --ge-font-size: 0.9375rem;
  --ge-line-height: 1.55;
  --ge-radius-editor: 6px;
  --ge-shadow-editor: none;
}
```

Stable styling hooks include `.ge-editor-shell`, `.cm-editor.cm-focused`, `.cm-content`, `.ge-toolbar`, `.ge-toolbar-button`, `.ge-toolbar-select`, `.ge-footer`, `.ge-table`, `.ge-code-fence`, `.ge-code-block`, `.ge-code-copy`, and `.ge-image-frame`.

## App-Owned Document Workflow

Galley is an editor component, not a full document manager. It owns Markdown editing, rendering, commands, toolbar/footer chrome, and editor-resident upload UI. The host app owns dirty state, explicit save/reset buttons, autosave, native `beforeunload` prompts, in-app discard dialogs, collaboration, permissions, and persistence.

Use `editable={false}` plus `toolbar={false}` or `footer={{ logo: false }}` when the same surface should render a read-only document:

```tsx
<GalleyEditor
  value={savedMarkdown}
  editable={canEdit}
  toolbar={canEdit}
  footer={{ logo: false }}
  ariaLabel={canEdit ? 'Editable note body' : 'Read-only note body'}
/>
```

## Register And Track File Uploads

Galley keeps storage and upload behavior app-owned. Provide `onFiles` to handle pasted or dropped files, return Markdown when uploads finish, and use `input.report()` plus `onFileStatus` to keep upload UI responsive while the editor waits for the result.

1. `onFiles(input)` receives the files, source (`paste` or `drop`), original event, editor view, selection snapshot, and `report()`.
2. Call `input.report({ phase: 'progress', progress, message })` during long uploads.
3. Galley forwards reports to `onFileStatus(status)`.
4. Return a Markdown string or array of strings. Galley inserts it at the original paste selection or drop position.
5. Return `false` or `null` when the app handled the files without inserting Markdown.

```tsx
import { useState } from 'react';
import type { GalleyFileInput, GalleyFileStatus } from '@inky/galley-editor';

type UploadRecord = {
  id: string;
  names: string;
  phase: GalleyFileStatus['phase'];
  progress?: number;
  message?: string;
};

const escapeMarkdownLabel = (value: string) =>
  value.replace(/[\n\r[\]\\]/g, ' ').trim();

async function uploadToStorage(file: File): Promise<void> {
  await new Promise((resolve) => window.setTimeout(resolve, 500));
}

async function uploadFile(file: File, input: GalleyFileInput, index: number): Promise<string> {
  input.report({
    phase: 'progress',
    progress: index / input.files.length,
    message: `Uploading ${file.name}`,
  });

  await uploadToStorage(file);

  const url = `/uploads/${encodeURIComponent(file.name)}`;
  return `[${escapeMarkdownLabel(file.name)}](${url})`;
}

export function EditorWithUploads() {
  const [value, setValue] = useState('');
  const [uploads, setUploads] = useState<UploadRecord[]>([]);

  async function handleFiles(input: GalleyFileInput) {
    const markdown = [];

    for (const [index, file] of input.files.entries()) {
      markdown.push(await uploadFile(file, input, index));
    }

    input.report({ phase: 'progress', progress: 1, message: 'Inserting links' });
    return markdown;
  }

  return (
    <GalleyEditor
      value={value}
      onChange={setValue}
      onFiles={handleFiles}
      onFileStatus={(status) => {
        setUploads((items) => {
          const next = {
            id: status.id,
            names: status.files.map((file) => file.name).join(', '),
            phase: status.phase,
            progress: status.progress,
            message: status.message,
          };
          const existing = items.findIndex((item) => item.id === status.id);
          if (existing === -1) return [next, ...items];
          return items.map((item, index) => (index === existing ? next : item));
        });
      }}
      onFileError={(error, input) => {
        console.error('Upload failed', input.files, error);
      }}
      footer={{
        after: () => (
          <span>
            {uploads.filter((upload) => upload.phase === 'progress' && upload.progress !== 1).length}
            {' '}uploads active
          </span>
        ),
      }}
    />
  );
}
```

`onFiles` handles both paste and drop. Galley prevents the browser's default file handling, preserves the original selection while the promise resolves, and inserts the returned Markdown when the handler completes. If your upload handler stores IDs or signed URLs outside Markdown, keep that registry in app state and use `imageRenderer` to resolve Markdown URLs into your asset records.

Use `uploadInteraction="inline"` and `uploadPlaceholderRenderer` when progress should live at the paste or drop location:

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
