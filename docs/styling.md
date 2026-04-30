# Styling Guide

Neutrino Editor styles rendered markdown with semantic classes and a CSS custom property contract. Import the base stylesheet for defaults, then override `--ne-*` variables from your app.

```ts
import '@inky/neutrino-editor/style.css';
```

The `theme` prop resolves to `data-theme="light"` or `data-theme="dark"` on the editor wrapper, so the same variables drive rendered markdown and CodeMirror chrome.

## CSS Variables

The base stylesheet defines these defaults under `:root, [data-theme="light"]`:

```css
--ne-color-text: #1a1a1a;
--ne-color-text-muted: #6b7280;
--ne-color-bg: #ffffff;
--ne-color-surface: #f8fafc;
--ne-color-surface-elevated: #ffffff;
--ne-color-border: #dbe4ef;
--ne-color-link: #2563eb;
--ne-color-link-hover: #1d4ed8;
--ne-color-code-fg: #1a1a1a;
--ne-color-code-bg: rgba(127, 127, 127, 0.12);
--ne-color-code-fence-bg: rgba(127, 127, 127, 0.08);
--ne-color-blockquote-border: rgba(127, 127, 127, 0.4);
--ne-color-blockquote-fg: #4b5563;
--ne-color-divider: rgba(127, 127, 127, 0.3);
--ne-color-table-border: rgba(127, 127, 127, 0.3);
--ne-color-checkbox-accent: #2563eb;
--ne-color-selection: rgba(37, 99, 235, 0.2);
--ne-color-caret: currentColor;
--ne-color-focus-ring: #2563eb;
--ne-color-tooltip-bg: #0f172a;
--ne-color-tooltip-fg: #ffffff;
--ne-color-scrollbar-track: transparent;
--ne-color-scrollbar-thumb: rgba(100, 116, 139, 0.34);
--ne-color-scrollbar-thumb-hover: rgba(100, 116, 139, 0.54);

--ne-font-body: ui-sans-serif, system-ui, -apple-system, sans-serif;
--ne-font-mono: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace;
--ne-font-size: 1rem;
--ne-line-height: 1.6;
--ne-h1-size: 2em;
--ne-h1-weight: 700;
--ne-h1-leading: 1.2;
--ne-h2-size: 1.5em;
--ne-h2-weight: 700;
--ne-h2-leading: 1.3;
--ne-h3-size: 1.25em;
--ne-h3-weight: 700;
--ne-h3-leading: 1.4;
--ne-h4-size: 1.1em;
--ne-h4-weight: 700;
--ne-h4-leading: 1.4;
--ne-h5-size: 1em;
--ne-h5-weight: 700;
--ne-h5-leading: 1.4;
--ne-h6-size: 0.9em;
--ne-h6-weight: 700;
--ne-h6-leading: 1.4;

--ne-radius-code: 3px;
--ne-radius-editor: 8px;
--ne-radius-block: 6px;
--ne-spacing-block: 0.5em;
--ne-spacing-inline-padding: 0.125em 0.25em;
--ne-blockquote-indent: 1em;
--ne-content-padding: 42px 56px;
--ne-toolbar-padding: 10px 14px;
--ne-footer-padding: 4px 10px;
--ne-backdrop-filter: none;
--ne-scrollbar-size: 10px;
--ne-scrollbar-radius: 999px;
--ne-code-font-size: 0.9em;
--ne-shadow-editor: 0 12px 30px rgba(15, 23, 42, 0.06);
```

Dark mode overrides only the color variables that need different values:

```css
[data-theme="dark"] {
  --ne-color-text: #e5e7eb;
  --ne-color-text-muted: #9ca3af;
  --ne-color-code-fg: #e5e7eb;
  --ne-color-link: #60a5fa;
  --ne-color-link-hover: #93c5fd;
  --ne-color-blockquote-fg: #9ca3af;
  --ne-color-checkbox-accent: #60a5fa;
  --ne-color-selection: rgba(96, 165, 250, 0.3);
  --ne-color-focus-ring: #60a5fa;
}
```

## Plain CSS

Scope overrides with `className` on the editor wrapper:

```tsx
<NeutrinoEditor className="notes-editor" theme="auto" value={value} onChange={setValue} />
```

```css
.notes-editor {
  --ne-color-text: #172033;
  --ne-color-link: #0f766e;
  --ne-color-link-hover: #115e59;
  --ne-color-code-bg: color-mix(in srgb, currentColor 8%, transparent);
  --ne-color-focus-ring: #0f766e;
  --ne-font-body: Inter, ui-sans-serif, system-ui, sans-serif;
  --ne-font-size: 0.975rem;
}

.notes-editor[data-theme="dark"] {
  --ne-color-text: #e6edf7;
  --ne-color-link: #5eead4;
  --ne-color-link-hover: #99f6e4;
  --ne-color-focus-ring: #5eead4;
}
```

Use `editorClassName` when you need to style the CodeMirror `.cm-editor` element itself:

```tsx
<NeutrinoEditor className="notes-editor" editorClassName="notes-editor-frame" />
```

```css
.notes-editor-frame {
  border: 1px solid color-mix(in srgb, currentColor 16%, transparent);
  border-radius: 8px;
}
```

## Toolbar And Footer Slots

The built-in toolbar and footer expose stable slot containers for consumer UI:

- `.ne-toolbar-slot`, `.ne-toolbar-slot-before`, `.ne-toolbar-slot-after`
- `.ne-footer-slot`, `.ne-footer-slot-before`, `.ne-footer-slot-after`
- `.ne-footer-end`

Slot content inherits the editor variables, so custom controls can use the same classes as built-ins:

```tsx
<NeutrinoEditor
  toolbar={{
    after: ({ execCommand, canEdit }) => (
      <button
        className="ne-toolbar-button"
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

The CodeMirror scroller uses native scrollbars styled through the Neutrino CSS variable contract. The default track is transparent for an overlay-like feel, and the thumb is fully themeable:

```css
.my-editor-theme {
  --ne-scrollbar-size: 12px;
  --ne-scrollbar-radius: 999px;
  --ne-color-scrollbar-track: transparent;
  --ne-color-scrollbar-thumb: rgba(15, 23, 42, 0.24);
  --ne-color-scrollbar-thumb-hover: rgba(15, 23, 42, 0.44);
}
```

## Tailwind V4

Tailwind v4 theme variables are CSS variables, so map your app tokens into the Neutrino contract. Keep `@theme` top-level, then assign `--ne-*` variables in a normal selector.

```css
@import "tailwindcss";
@import "@inky/neutrino-editor/style.css";

@theme static {
  --color-editor-text: var(--color-slate-950);
  --color-editor-muted: var(--color-slate-500);
  --color-editor-link: var(--color-blue-600);
  --color-editor-link-hover: var(--color-blue-700);
  --color-editor-ring: var(--color-blue-600);
  --font-editor-body: var(--font-sans);
  --font-editor-mono: var(--font-mono);
}

.neutrino-tailwind {
  --ne-color-text: var(--color-editor-text);
  --ne-color-text-muted: var(--color-editor-muted);
  --ne-color-link: var(--color-editor-link);
  --ne-color-link-hover: var(--color-editor-link-hover);
  --ne-color-focus-ring: var(--color-editor-ring);
  --ne-color-checkbox-accent: var(--color-editor-link);
  --ne-font-body: var(--font-editor-body);
  --ne-font-mono: var(--font-editor-mono);
}

.neutrino-tailwind[data-theme="dark"] {
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
  <NeutrinoEditor className="neutrino-tailwind" value={value} onChange={setValue} />
</div>
```

## Class Names

The `classNames` prop is the escape hatch for design systems that do not want `ne-*` classes at all. Unspecified keys keep their defaults.

```tsx
<NeutrinoEditor
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

The wrapper structure is:

```html
<div class="{className}" data-theme="light">
  <div class="ne-editor-shell">
    <div class="ne-toolbar">...</div>
    <div class="cm-editor cm-light {editorClassName}">
      <div class="cm-scroller">
        <div class="cm-content">
          <!-- editor lines -->
        </div>
      </div>
    </div>
    <div class="ne-footer">...</div>
  </div>
</div>
```

## Class Reference

Inline classes: `ne-bold`, `ne-italic`, `ne-strikethrough`, `ne-code-inline`, `ne-link`.

Block line classes: `ne-heading`, `ne-h1` through `ne-h6`, `ne-code-fence`, `ne-blockquote`, `ne-table`, `ne-divider`, `ne-completed-task`.

Widget classes: `ne-checkbox`, `ne-list-marker`, `ne-list-marker-sizing`, `ne-list-marker-dot`, `ne-divider-widget`.

Chrome classes: `ne-editor-shell`, `ne-toolbar`, `ne-toolbar-button`, `ne-toolbar-select`, `ne-toolbar-separator`, `ne-toolbar-slot`, `ne-footer`, `ne-footer-stats`, `ne-footer-slot`, `ne-footer-end`, `ne-footer-logo-wrap`, `ne-footer-tooltip`.

Depth classes: `ne-depth-0`, `ne-depth-1`, `ne-depth-2`. Depth classes cycle every 3 nesting levels.

Lezer token classes: `tok-heading`, `tok-strong`, `tok-emphasis`, `tok-strikethrough`, `tok-link`, `tok-url`, `tok-meta`, `tok-comment`, `tok-monospace`.
