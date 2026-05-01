# Styling Guide

Galley Editor styles rendered markdown with semantic classes and a CSS custom property contract. Import the base stylesheet for defaults, then override `--ge-*` variables from your app.

```ts
import '@inky/galley-editor/style.css';
```

The `theme` prop resolves to `data-theme="light"` or `data-theme="dark"` on the editor wrapper, so the same variables drive rendered markdown and CodeMirror chrome.

## CSS Variables

The base stylesheet defines these defaults under `:root, [data-theme="light"]`:

```css
--ge-color-text: #1a1a1a;
--ge-color-text-muted: #6b7280;
--ge-color-bg: #ffffff;
--ge-color-surface: #f8fafc;
--ge-color-surface-elevated: #ffffff;
--ge-color-border: #dbe4ef;
--ge-color-link: #2563eb;
--ge-color-link-hover: #1d4ed8;
--ge-color-code-fg: #1a1a1a;
--ge-color-code-bg: rgba(127, 127, 127, 0.12);
--ge-color-code-fence-bg: rgba(127, 127, 127, 0.08);
--ge-color-blockquote-border: rgba(127, 127, 127, 0.4);
--ge-color-blockquote-fg: #4b5563;
--ge-color-divider: rgba(127, 127, 127, 0.3);
--ge-color-table-border: rgba(127, 127, 127, 0.3);
--ge-color-checkbox-accent: #2563eb;
--ge-color-selection: rgba(37, 99, 235, 0.2);
--ge-color-caret: currentColor;
--ge-color-focus-ring: #2563eb;
--ge-color-tooltip-bg: #0f172a;
--ge-color-tooltip-fg: #ffffff;
--ge-color-scrollbar-track: transparent;
--ge-color-scrollbar-thumb: rgba(100, 116, 139, 0.34);
--ge-color-scrollbar-thumb-hover: rgba(100, 116, 139, 0.54);

--ge-font-body: ui-sans-serif, system-ui, -apple-system, sans-serif;
--ge-font-mono: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace;
--ge-font-size: 1rem;
--ge-line-height: 1.6;
--ge-h1-size: 2em;
--ge-h1-weight: 700;
--ge-h1-leading: 1.2;
--ge-h2-size: 1.5em;
--ge-h2-weight: 700;
--ge-h2-leading: 1.3;
--ge-h3-size: 1.25em;
--ge-h3-weight: 700;
--ge-h3-leading: 1.4;
--ge-h4-size: 1.1em;
--ge-h4-weight: 700;
--ge-h4-leading: 1.4;
--ge-h5-size: 1em;
--ge-h5-weight: 700;
--ge-h5-leading: 1.4;
--ge-h6-size: 0.9em;
--ge-h6-weight: 700;
--ge-h6-leading: 1.4;

--ge-radius-code: 3px;
--ge-radius-editor: 8px;
--ge-radius-block: 6px;
--ge-spacing-block: 0.5em;
--ge-spacing-inline-padding: 0.125em 0.25em;
--ge-blockquote-indent: 1em;
--ge-content-padding: 42px 56px;
--ge-toolbar-padding: 10px 14px;
--ge-footer-padding: 4px 10px;
--ge-backdrop-filter: none;
--ge-scrollbar-size: 10px;
--ge-scrollbar-radius: 999px;
--ge-code-font-size: 0.9em;
--ge-shadow-editor: 0 12px 30px rgba(15, 23, 42, 0.06);
```

Dark mode overrides only the color variables that need different values:

```css
[data-theme="dark"] {
  --ge-color-text: #e5e7eb;
  --ge-color-text-muted: #9ca3af;
  --ge-color-code-fg: #e5e7eb;
  --ge-color-link: #60a5fa;
  --ge-color-link-hover: #93c5fd;
  --ge-color-blockquote-fg: #9ca3af;
  --ge-color-checkbox-accent: #60a5fa;
  --ge-color-selection: rgba(96, 165, 250, 0.3);
  --ge-color-focus-ring: #60a5fa;
}
```

## Plain CSS

Scope overrides with `className` on the editor wrapper:

```tsx
<GalleyEditor className="notes-editor" theme="auto" value={value} onChange={setValue} />
```

```css
.notes-editor {
  --ge-color-text: #172033;
  --ge-color-link: #0f766e;
  --ge-color-link-hover: #115e59;
  --ge-color-code-bg: color-mix(in srgb, currentColor 8%, transparent);
  --ge-color-focus-ring: #0f766e;
  --ge-font-body: Inter, ui-sans-serif, system-ui, sans-serif;
  --ge-font-size: 0.975rem;
}

.notes-editor[data-theme="dark"] {
  --ge-color-text: #e6edf7;
  --ge-color-link: #5eead4;
  --ge-color-link-hover: #99f6e4;
  --ge-color-focus-ring: #5eead4;
}
```

Use `editorClassName` when you need to style the CodeMirror `.cm-editor` element itself:

```tsx
<GalleyEditor className="notes-editor" editorClassName="notes-editor-frame" />
```

```css
.notes-editor-frame {
  border: 1px solid color-mix(in srgb, currentColor 16%, transparent);
  border-radius: 8px;
}
```

## Toolbar And Footer Slots

The built-in toolbar and footer expose stable slot containers for consumer UI:

- `.ge-toolbar-slot`, `.ge-toolbar-slot-before`, `.ge-toolbar-slot-after`
- `.ge-footer-slot`, `.ge-footer-slot-before`, `.ge-footer-slot-after`
- `.ge-footer-end`

Slot content inherits the editor variables, so custom controls can use the same classes as built-ins:

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
  footer={{
    after: ({ mode, wordCount }) => (
      <span>{mode} · {wordCount} words</span>
    ),
  }}
/>
```

Use `surface.contentPadding`, `surface.toolbarPadding`, and `surface.footerPadding` for one-off padding changes. For full themes, scope CSS variables with `className`.

## Scrollbars

The CodeMirror scroller uses native scrollbars styled through the Galley CSS variable contract. The default track is transparent for an overlay-like feel, and the thumb is fully themeable:

```css
.my-editor-theme {
  --ge-scrollbar-size: 12px;
  --ge-scrollbar-radius: 999px;
  --ge-color-scrollbar-track: transparent;
  --ge-color-scrollbar-thumb: rgba(15, 23, 42, 0.24);
  --ge-color-scrollbar-thumb-hover: rgba(15, 23, 42, 0.44);
}
```

## Tailwind V4

Tailwind v4 theme variables are CSS variables, so map your app tokens into the Galley contract. Keep `@theme` top-level, then assign `--ge-*` variables in a normal selector.

```css
@import "tailwindcss";
@import "@inky/galley-editor/style.css";

@theme static {
  --color-editor-text: var(--color-slate-950);
  --color-editor-muted: var(--color-slate-500);
  --color-editor-link: var(--color-blue-600);
  --color-editor-link-hover: var(--color-blue-700);
  --color-editor-ring: var(--color-blue-600);
  --font-editor-body: var(--font-sans);
  --font-editor-mono: var(--font-mono);
}

.galley-tailwind {
  --ge-color-text: var(--color-editor-text);
  --ge-color-text-muted: var(--color-editor-muted);
  --ge-color-link: var(--color-editor-link);
  --ge-color-link-hover: var(--color-editor-link-hover);
  --ge-color-focus-ring: var(--color-editor-ring);
  --ge-color-checkbox-accent: var(--color-editor-link);
  --ge-font-body: var(--font-editor-body);
  --ge-font-mono: var(--font-editor-mono);
}

.galley-tailwind[data-theme="dark"] {
  --color-editor-text: var(--color-slate-100);
  --color-editor-muted: var(--color-slate-400);
  --color-editor-link: var(--color-sky-400);
  --color-editor-link-hover: var(--color-sky-300);
  --color-editor-ring: var(--color-sky-400);
}
```

You can still wrap the editor with typography utilities when they fit your app:

```tsx
<div className="prose max-w-none dark:prose-invert">
  <GalleyEditor className="galley-tailwind" value={value} onChange={setValue} />
</div>
```

## Class Names

The `classNames` prop is the escape hatch for design systems that do not want `ge-*` classes at all. Unspecified keys keep their defaults.

```tsx
<GalleyEditor
  value={value}
  onChange={setValue}
  classNames={{
    bold: 'ds-text-strong',
    italic: 'ds-text-emphasis',
    h1: 'ds-heading-xl',
    link: 'ds-link',
    blockCode: 'ds-code-block',
    completedTask: 'ds-task-complete',
  }}
/>
```

You then own those class rules:

```css
.ds-text-strong { font-weight: 800; }
.ds-text-emphasis { font-style: italic; }
.ds-heading-xl { font-size: clamp(1.75rem, 4vw, 2.5rem); font-weight: 800; }
.ds-link { color: var(--color-brand-link); text-decoration: underline; }
.ds-code-block { background: var(--color-code-surface); font-family: var(--font-mono); }
.ds-task-complete { opacity: 0.55; text-decoration: line-through; }
```

## Theme Prop

| Value | Wrapper attribute | Behavior |
|---|---|---|
| `theme="light"` | `data-theme="light"` | Forces light variables and CodeMirror light mode. |
| `theme="dark"` | `data-theme="dark"` | Forces dark overrides and CodeMirror dark mode. |
| `theme="auto"` | `data-theme="light"` or `data-theme="dark"` | Resolves from `prefers-color-scheme` and updates when the OS preference changes. |

If your host app also uses a `.dark` class, keep app layout rules on `.dark` and keep Galley variables on the editor wrapper:

```css
.workspace-editor {
  --ge-color-bg: rgba(255, 255, 255, 0.78);
  --ge-color-surface: rgba(241, 245, 249, 0.72);
  --ge-color-surface-elevated: rgba(255, 255, 255, 0.88);
  --ge-color-border: rgba(148, 163, 184, 0.34);
}

.workspace-editor[data-theme="dark"] {
  --ge-color-bg: rgba(15, 23, 42, 0.74);
  --ge-color-surface: rgba(30, 41, 59, 0.58);
  --ge-color-surface-elevated: rgba(15, 23, 42, 0.86);
  --ge-color-border: rgba(148, 163, 184, 0.22);
}
```

The wrapper structure is:

```html
<div class="{className}" data-theme="light">
  <div class="ge-editor-shell">
    <div class="ge-toolbar">...</div>
    <div class="cm-editor cm-light {editorClassName}">
      <div class="cm-scroller">
        <div class="cm-content">
          <!-- editor lines -->
        </div>
      </div>
    </div>
    <div class="ge-footer">...</div>
  </div>
</div>
```

## Class Reference

Inline classes: `ge-bold`, `ge-italic`, `ge-strikethrough`, `ge-code-inline`, `ge-link`.

Block line classes: `ge-heading`, `ge-h1` through `ge-h6`, `ge-code-fence`, `ge-blockquote`, `ge-table`, `ge-divider`, `ge-completed-task`.

Widget classes: `ge-checkbox`, `ge-list-marker`, `ge-list-marker-sizing`, `ge-list-marker-dot`, `ge-divider-widget`.

Chrome classes: `ge-editor-shell`, `ge-toolbar`, `ge-toolbar-button`, `ge-toolbar-select`, `ge-toolbar-separator`, `ge-toolbar-slot`, `ge-footer`, `ge-footer-stats`, `ge-footer-slot`, `ge-footer-end`, `ge-footer-logo-wrap`, `ge-footer-tooltip`.

Rendered block hooks: `ge-table`, `ge-code-fence`, `ge-code-block`, `ge-code-block-header`, `ge-code-copy`, `ge-code-body`, `ge-image-frame`.

Read-only surfaces use `editable={false}` and resolve to `data-mode="preview"` on the wrapper, so selectors such as `.workspace-editor[data-mode="preview"] .ge-editor-shell` are stable for view-only tuning.

Depth classes: `ge-depth-0`, `ge-depth-1`, `ge-depth-2`. Depth classes cycle every 3 nesting levels.

Lezer token classes: `tok-heading`, `tok-strong`, `tok-emphasis`, `tok-strikethrough`, `tok-link`, `tok-url`, `tok-meta`, `tok-comment`, `tok-monospace`.
