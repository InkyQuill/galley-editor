---
title: Customization
description: Customize Galley themes, toolbar controls, footer widgets, and surface styling.
---

Galley is designed to fit your app, not the other way around. Import the base stylesheet for a polished default, then use CSS variables and semantic classes to tune the surface.

```tsx
<GalleyEditor
  className="workspace-editor"
  value={markdown}
  onChange={setMarkdown}
/>
```

```css
.workspace-editor {
  --ge-color-text: #172033;
  --ge-color-link: #0f766e;
  --ge-color-focus-ring: #0f766e;
  --ge-font-body: Inter, ui-sans-serif, system-ui, sans-serif;
  --ge-content-padding: 42px 56px;
}

.workspace-editor[data-theme='dark'] {
  --ge-color-text: #e6edf7;
  --ge-color-link: #5eead4;
  --ge-color-focus-ring: #5eead4;
}
```

## Surface Styling

Use `surface` for focused shell changes when you do not need a full theme class.

```tsx
<GalleyEditor
  value={markdown}
  onChange={setMarkdown}
  surface={{
    style: {
      background: 'linear-gradient(135deg, rgba(255,255,255,.76), rgba(232,241,255,.52))',
      backdropFilter: 'blur(22px) saturate(1.25)',
      borderColor: 'rgba(120, 140, 170, .35)',
    },
    contentPadding: '44px 58px',
    toolbarPadding: '10px 14px',
    footerPadding: '6px 12px',
  }}
/>
```

For dense application workspaces, reduce the editor chrome instead of overriding CodeMirror internals:

```tsx
<GalleyEditor
  className="workspace-note-editor"
  ariaLabel="Note body"
  value={markdown}
  onChange={setMarkdown}
  minRows={8}
  surface={{
    contentPadding: '18px 22px',
    toolbarPadding: '6px 8px',
    footerPadding: '4px 8px',
  }}
/>
```

```css
.workspace-note-editor {
  --ge-font-size: 0.9375rem;
  --ge-line-height: 1.55;
  --ge-radius-editor: 6px;
  --ge-radius-block: 4px;
  --ge-shadow-editor: none;
}
```

## Theme Auto In Host Apps

`theme="auto"` follows `prefers-color-scheme` and writes the resolved value to Galley's wrapper as `data-theme="light"` or `data-theme="dark"`. If your app also has a `.dark` class, scope app background styles with `.dark`, and scope Galley variables with the wrapper attribute:

```tsx
<div className="aurora-pane dark:bg-slate-950">
  <GalleyEditor
    className="aurora-editor"
    theme="auto"
    value={markdown}
    onChange={setMarkdown}
  />
</div>
```

```css
.aurora-editor {
  --ge-color-bg: rgba(255, 255, 255, 0.78);
  --ge-color-surface: rgba(241, 245, 249, 0.72);
  --ge-color-surface-elevated: rgba(255, 255, 255, 0.86);
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

## Toolbar

Disable the built-in toolbar:

```tsx
<GalleyEditor toolbar={false} />
```

Add custom controls before or after the built-in controls:

```tsx
<GalleyEditor
  toolbar={{
    after: ({ execCommand, canEdit }) => (
      <button
        className="ge-toolbar-button"
        disabled={!canEdit}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => execCommand('insertHr')}
      >
        Section
      </button>
    ),
  }}
/>
```

You can use inline SVGs, your own icon components, or an icon pack such as Lucide in these slots. Keep `onMouseDown={(event) => event.preventDefault()}` on toolbar buttons so the editor selection stays in place before the command runs.

Replace built-in icon content with the `toolbar.icons` map. Every key is optional, but the full contract is:

```ts
type ToolbarIconName =
  | 'bold'
  | 'italic'
  | 'strikethrough'
  | 'inlineCode'
  | 'bulletList'
  | 'orderedList'
  | 'taskList'
  | 'link'
  | 'image'
  | 'codeBlock'
  | 'table'
  | 'divider'
  | 'undo'
  | 'redo'
  | 'mode';
```

```tsx
import {
  RiBold,
  RiCodeLine,
  RiH1,
  RiImageLine,
  RiLink,
  RiListUnordered,
  RiTableLine,
} from '@remixicon/react';

<GalleyEditor
  toolbar={{
    icons: {
      bold: <RiBold size={16} aria-hidden="true" />,
      inlineCode: <RiCodeLine size={16} aria-hidden="true" />,
      bulletList: <RiListUnordered size={16} aria-hidden="true" />,
      link: <RiLink size={16} aria-hidden="true" />,
      image: <RiImageLine size={16} aria-hidden="true" />,
      table: <RiTableLine size={16} aria-hidden="true" />,
      mode: ({ mode }) => <RiH1 size={16} aria-hidden="true" data-mode={mode} />,
    },
  }}
/>
```

## Footer

Disable the footer:

```tsx
<GalleyEditor footer={false} />
```

Add footer widgets:

```tsx
<GalleyEditor
  footer={{
    after: ({ mode, wordCount, characterCount }) => (
      <span>
        {mode} / {wordCount} words / {characterCount} characters
      </span>
    ),
  }}
/>
```

The default footer includes word count, character count, and the Galley logo tooltip. Footer slots are useful for document status, sync state, current mode, or app-specific metadata.

## Stable Styling Hooks

The base stylesheet intentionally keeps stable classes on editor chrome and rendered Markdown:

| Hook | Use |
| --- | --- |
| `.ge-editor-shell` | Outer editor shell, border, shadow, glass, and radius. |
| `.ge-editor-shell .cm-editor.cm-focused` | CodeMirror focus ring. |
| `.ge-editor-shell .cm-content` | Editable content padding and document surface. |
| `.ge-toolbar`, `.ge-toolbar-button`, `.ge-toolbar-select`, `.ge-toolbar-separator` | Built-in toolbar layout and controls. |
| `.ge-footer`, `.ge-footer-stats`, `.ge-footer-end` | Built-in footer layout. |
| `.ge-table` | Rendered Markdown table block. |
| `.ge-code-fence`, `.ge-code-block`, `.ge-code-copy` | Rendered fenced code block, body, and copy control. |
| `.ge-image-frame` | Rendered image widget frame. |

Read-only editors use `editable={false}` and resolve to `data-mode="preview"` on the wrapper, so you can tune view-only surfaces without a separate preview component:

```css
.workspace-note-editor[data-mode='preview'] .ge-editor-shell {
  box-shadow: none;
}

.workspace-note-editor[data-mode='preview'] .ge-toolbar {
  display: none;
}
```
