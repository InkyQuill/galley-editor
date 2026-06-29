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

## App-Owned Toolbar

For a fully custom toolbar, disable the built-in toolbar and call commands from your own controls:

```tsx
<GalleyEditor ref={editor} toolbar={false} />

<button type="button" onClick={() => editor.current?.execCommand('toggleBold')}>
  Bold
</button>
```

Use real buttons with visible focus states and accessible names. Do not make icon-only controls without `aria-label`.
