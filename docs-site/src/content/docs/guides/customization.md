---
title: Customization
description: Theme Galley with CSS variables, semantic classes, toolbar slots, and renderer hooks.
sidebar:
  order: 10
---

Galley is intentionally style-agnostic. The package ships a base stylesheet, but the editor surface is controlled through CSS variables and semantic classes so it can sit inside your product design system.

## Base Stylesheet

```tsx
import '@inkyquill/galley-editor/style.css';
```

The stylesheet covers:

- CodeMirror layout inside the Galley shell.
- Toolbar and footer structure.
- Light and dark CSS variables.
- Markdown semantic classes such as `ge-h1`, `ge-bold`, `ge-code-fence`, and `ge-table`.
- Lezer token classes such as `tok-keyword`, `tok-string`, and `tok-comment`.

You can omit the stylesheet, but then your app must provide the CodeMirror and `ge-*` styles itself.

## Theme Prop

```tsx
<GalleyEditor theme="auto" />
<GalleyEditor theme="light" />
<GalleyEditor theme="dark" />
```

`auto` follows the user's color scheme. Override variables on the editor wrapper or a parent container:

```css
.article-editor {
  --ge-color-bg: #ffffff;
  --ge-color-text: #111827;
  --ge-color-border: #d8dee8;
  --ge-color-link: #2454d6;
  --ge-radius-editor: 8px;
  --ge-content-padding: 32px 40px;
}
```

## Semantic Markdown Classes

Galley applies semantic classes to rendered Markdown decorations:

| Class | Element |
| --- | --- |
| `ge-heading`, `ge-h1` through `ge-h6` | Headings |
| `ge-bold`, `ge-italic`, `ge-strikethrough` | Inline emphasis |
| `ge-code-inline`, `ge-code-fence` | Inline and fenced code |
| `ge-link` | Links |
| `ge-blockquote` | Blockquotes |
| `ge-table` | Tables |
| `ge-image-frame` | Image widgets |
| `ge-divider`, `ge-divider-widget` | Horizontal rules |
| `ge-checkbox`, `ge-completed-task` | Task lists |
| `ge-list-marker` | List markers |

Rename classes when your system has established class names:

```tsx
<GalleyEditor
  classNames={{
    h1: 'docs-heading-xl',
    bold: 'docs-strong',
    blockCode: 'docs-code-block',
  }}
/>
```

## Surface Hooks

Use `className`, `editorClassName`, and `surface` for layout-level styling:

```tsx
<GalleyEditor
  className="article-editor"
  editorClassName="article-editor-cm"
  surface={{
    className: 'article-editor-shell',
    contentPadding: '28px 36px',
    toolbarPadding: '8px 12px',
  }}
/>
```

Keep toolbar buttons at least 44 by 44 CSS pixels when replacing chrome in touch-heavy interfaces.

## Replace Built-In Toolbar Icons

Use `toolbar.icons` when you want Galley's built-in toolbar behavior but your product's icon set. The built-in buttons keep their command behavior, disabled states, accessible labels, and effective shortcut titles; the icon value only replaces the visible button contents.

```tsx
import { Bold, Code2, Eye, Italic, Link } from 'lucide-react';
import { GalleyEditor } from '@inkyquill/galley-editor';

<GalleyEditor
  toolbar={{
    icons: {
      bold: <Bold size={16} aria-hidden="true" />,
      italic: <Italic size={16} aria-hidden="true" />,
      link: <Link size={16} aria-hidden="true" />,
      mode: ({ mode }) =>
        mode === 'preview'
          ? <Eye size={16} aria-hidden="true" />
          : <Code2 size={16} aria-hidden="true" />,
    },
  }}
/>;
```

Icon values can be React nodes or render functions. Use a render function when the icon depends on toolbar state, such as the current editor mode:

```tsx
<GalleyEditor
  toolbar={{
    icons: {
      mode: ({ mode }) => <span>{mode === 'markdown' ? 'MD' : mode}</span>,
    },
  }}
/>;
```

Use `aria-hidden="true"` on decorative icon components because Galley already supplies the button labels.

## Add Controls to Built-In Chrome

Use toolbar and footer slots when you want to keep Galley's built-in controls and add app-owned actions, status pills, save buttons, or workflow state.

```tsx
<GalleyEditor
  toolbar={{
    before: <span className="ge-status-pill">Draft</span>,
    after: ({ execCommand, canEdit }) => (
      <>
        <button
          type="button"
          className="ge-toolbar-button"
          disabled={!canEdit}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => execCommand('insertHr')}
        >
          Section
        </button>
        <button
          type="button"
          className="ge-toolbar-button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={saveDraft}
        >
          Save
        </button>
      </>
    ),
  }}
  footer={{
    before: <span className="ge-status-pill">Local draft</span>,
    after: ({ mode, wordCount }) => (
      <span>
        {mode} - {wordCount} words
      </span>
    ),
  }}
/>;
```

Call `event.preventDefault()` from mouse-down handlers on toolbar buttons so clicking a control does not steal the editor selection before the command runs.

## App-Owned Toolbar

For a fully custom toolbar, disable the built-in toolbar and call commands from your own controls:

```tsx
const editor = useRef<GalleyHandle>(null);

<div className="app-toolbar">
  <button
    type="button"
    aria-label="Bold"
    onMouseDown={(event) => event.preventDefault()}
    onClick={() => editor.current?.execCommand('toggleBold')}
  >
    <Bold size={16} aria-hidden="true" />
  </button>
  <button
    type="button"
    onMouseDown={(event) => event.preventDefault()}
    onClick={() => editor.current?.execCommand('insertTable')}
  >
    Insert table
  </button>
</div>

<GalleyEditor ref={editor} toolbar={false} />;
```

Use real buttons with visible focus states and accessible names. Do not make icon-only controls without `aria-label`.

## Related Use Cases

| Use case | Guide |
| --- | --- |
| Replace rendered table block controls | [Plugins and Renderers](/galley-editor/guides/plugins-renderers/#table-editor-block-controls) |
| Build a full command toolbar | [Commands](/galley-editor/guides/commands/) |
| Track selection for contextual controls | [API Reference](/galley-editor/reference/api/#callbacks) |
| Theme the shell and toolbar | [Surface Hooks](#surface-hooks) |
