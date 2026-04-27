# Styling Guide

Neutrino Editor is **style-agnostic**. It applies semantic CSS classes to rendered elements but ships no colors, fonts, or typography rules. You control the visual appearance entirely through CSS.

## CSS Class Reference

### Inline Elements

| Class | Applied To | Description |
|---|---|---|
| `ne-bold` | `<span>` wrapping bold text | Text wrapped in `**` or `__` |
| `ne-italic` | `<span>` wrapping italic text | Text wrapped in `*` or `_` |
| `ne-strikethrough` | `<span>` wrapping strikethrough | Text wrapped in `~~` |
| `ne-code-inline` | `<span>` wrapping inline code | Text wrapped in `` ` `` |
| `ne-link` | `<span>` wrapping link text | `[text](url)` links |

### Block Elements (Line Decorations)

| Class | Applied To | Description |
|---|---|---|
| `ne-heading` | Line containing any heading | All heading lines (H1-H6) |
| `ne-h1` through `ne-h6` | Line containing specific heading level | Applied alongside `ne-heading` |
| `ne-code-fence` | Each line inside a fenced code block | Lines between `` ``` `` markers |
| `ne-blockquote` | Lines inside a blockquote | Lines starting with `>` |
| `ne-table` | Lines inside a table | Table rows and dividers |
| `ne-divider` | Line containing `---` | Horizontal rule line |
| `ne-completed-task` | Line with checked task | Lines with `[x]` |

### Widget Elements

| Class | Applied To | Description |
|---|---|---|
| `ne-checkbox` | `<span>` containing checkbox `<input>` | Task list checkbox container |
| `ne-list-marker` | `<span>` replacing bullet marker | Custom bullet point widget |
| `ne-list-marker-sizing` | Inner `<span>` | Preserves original marker width |
| `ne-list-marker-dot` | Inner `<span>` | Visual bullet dot |
| `ne-divider-widget` | `<hr>` element | Rendered horizontal rule |

### Depth Classes

| Class | Applied To | Description |
|---|---|---|
| `ne-depth-0` | List markers, checkboxes | Top-level list items |
| `ne-depth-1` | List markers, checkboxes | First nesting level |
| `ne-depth-2` | List markers, checkboxes | Second nesting level |

Depth classes cycle every 3 levels (e.g., depth 3 gets `ne-depth-0` again).

### Lezer Token Classes

Applied by CodeMirror's `classHighlighter` to the raw text in the editor:

| Class | Applied To |
|---|---|
| `tok-heading` | Heading text including marks |
| `tok-strong` | Bold text including `**` marks |
| `tok-emphasis` | Italic text including `*` marks |
| `tok-strikethrough` | Strikethrough text including `~~` marks |
| `tok-link` | Link text and URL |
| `tok-monospace` | Inline code and code fence content |
| `tok-url` | URL portion of links |
| `tok-meta` | Markdown syntax characters |
| `tok-comment` | HTML comments |

## Styling Approaches

### 1. Import Base Styles

The quickest way to get started. `neutrino-base.css` provides sensible defaults:

```css
import '@inkyquill/neutrino-editor/dist/neutrino-base.css';
```

This sets:
- Heading sizes and weights (H1 = 2em down to H6 = 0.85em)
- Bold, italic, strikethrough formatting
- Inline code with light gray background and monospace font
- Link styling (blue, underlined, dark mode aware)
- Code fence with monospace font and background
- Blockquote with left border and muted color
- Table with monospace font
- Checkbox styling with completed task opacity
- List marker depth-based visual styles (disc, circle, square)
- Divider as a centered horizontal line

### 2. Tailwind CSS Typography

Compatible with `@tailwindcss/typography` prose classes. Wrap the editor in a `prose` container:

```tsx
<div className="prose dark:prose-invert max-w-none">
  <NeutrinoEditor value={value} onChange={setValue} />
</div>
```

Since Neutrino applies semantic classes rather than inline styles, Tailwind's typography plugin can target the rendered output naturally. You may want to add additional styles for Neutrino-specific classes:

```css
.prose .ne-code-fence {
  @apply bg-gray-100 dark:bg-gray-800 font-mono;
}
.prose .ne-blockquote {
  @apply border-l-4 border-gray-300 pl-4 text-gray-600;
}
```

### 3. Custom CSS

Target `ne-*` classes directly in your stylesheet:

```css
/* Headings */
.ne-h1 { font-size: 2em; font-weight: 700; }
.ne-h2 { font-size: 1.5em; font-weight: 600; }

/* Inline formatting */
.ne-bold { font-weight: 700; }
.ne-italic { font-style: italic; }
.ne-strikethrough { text-decoration: line-through; }
.ne-code-inline {
  background: #f1f5f9;
  padding: 2px 4px;
  border-radius: 3px;
  font-family: monospace;
}

/* Links */
.ne-link { color: #2563eb; text-decoration: underline; }

/* Code blocks */
.ne-code-fence {
  background: #f8fafc;
  font-family: monospace;
  font-size: 0.9em;
}

/* Blockquotes */
.ne-blockquote {
  border-left: 3px solid #d1d5db;
  padding-left: 1em;
  color: #6b7280;
}
```

### 4. Override Class Names

Replace `ne-*` classes entirely with your own:

```tsx
<NeutrinoEditor
  value={value}
  onChange={setValue}
  classNames={{
    bold: 'my-bold',
    italic: 'my-italic',
    h1: 'my-heading-xl',
    h2: 'my-heading-lg',
    link: 'my-link',
    blockCode: 'my-code-block',
  }}
/>
```

Unspecified keys keep their defaults. This is useful when integrating into a design system with its own class naming convention.

## Theme Integration

### Color Scheme

The `theme` prop controls the CodeMirror dark mode flag:

| Value | Behavior |
|---|---|
| `'auto'` | Detects from `prefers-color-scheme` media query |
| `'light'` | Forces light mode |
| `'dark'` | Forces dark mode |

The editor itself only applies structural styles (padding, line-height, etc.). The dark mode flag enables dark-scoped CM6 selectors. You must provide dark-mode CSS:

```css
/* Dark mode styles */
@media (prefers-color-scheme: dark) {
  .ne-code-inline { background: #1e293b; }
  .ne-code-fence { background: #0f172a; }
  .ne-link { color: #60a5fa; }
  .ne-blockquote { border-color: #4b5563; color: #9ca3af; }
}
```

Or with a dark class:

```css
.dark .ne-code-inline { background: #1e293b; }
```

### Editor Container Styling

```tsx
{/* Outer wrapper div */}
<NeutrinoEditor className="border rounded-lg shadow-sm" />

{/* CodeMirror .cm-editor element */}
<NeutrinoEditor editorClassName="custom-editor" />
```

The DOM structure is:
```html
<div class="{className}">
  <div>
    <div class="cm-editor {editorClassName}">
      <div class="cm-scroller">
        <div class="cm-content">
          <!-- editor lines -->
        </div>
      </div>
    </div>
  </div>
</div>
```

### CodeMirror Structural Classes

These are set by the built-in theme and can be overridden with CSS:

| Selector | Default |
|---|---|
| `.cm-editor` | `width: 100%; height: auto; box-sizing: border-box` |
| `.cm-content` | `padding: 12px; line-height: 1.6` |
| `.cm-focused` | `outline: none` |
| `.cm-scroller` | `overflow-y: auto; overflow-x: hidden` |
| `.cm-line` | `padding: 0 4px` |
| `.cm-cursor` | `z-index: 10` |

## Complete Example

```css
/* Custom theme for Neutrino Editor */

/* Headings */
.ne-heading { margin: 0.5em 0; }
.ne-h1 { font-size: 2em; font-weight: 800; letter-spacing: -0.02em; }
.ne-h2 { font-size: 1.5em; font-weight: 700; }
.ne-h3 { font-size: 1.25em; font-weight: 600; }
.ne-h4 { font-size: 1.1em; font-weight: 600; }
.ne-h5 { font-size: 1em; font-weight: 600; }
.ne-h6 { font-size: 0.9em; font-weight: 600; color: #6b7280; }

/* Inline */
.ne-bold { font-weight: 700; }
.ne-italic { font-style: italic; }
.ne-strikethrough { text-decoration: line-through; opacity: 0.7; }
.ne-code-inline {
  background: #f1f5f9;
  padding: 1px 5px;
  border-radius: 4px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.88em;
}
.ne-link {
  color: #2563eb;
  text-decoration: underline;
  text-underline-offset: 2px;
}

/* Blocks */
.ne-code-fence {
  background: #f8fafc;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.88em;
}
.ne-blockquote {
  border-left: 3px solid #3b82f6;
  padding-left: 1em;
  color: #64748b;
  font-style: italic;
}
.ne-table {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.9em;
}

/* Dividers */
.ne-divider { display: flex; align-items: center; }
.ne-divider-widget {
  width: 100%;
  border: none;
  border-top: 1px solid #e2e8f0;
  margin: 0.5em 0;
}

/* Checkboxes */
.ne-checkbox input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: #3b82f6;
}
.ne-completed-task { opacity: 0.5; text-decoration: line-through; }

/* List markers */
.ne-list-marker { display: inline-flex; align-items: center; }
.ne-list-marker-sizing { visibility: hidden; width: 0; }
.ne-list-marker-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}
.ne-depth-1 .ne-list-marker-dot { border-radius: 50%; background: none; border: 1px solid currentColor; }
.ne-depth-2 .ne-list-marker-dot { border-radius: 1px; }

/* Dark mode */
@media (prefers-color-scheme: dark) {
  .ne-code-inline { background: #1e293b; }
  .ne-code-fence { background: #0f172a; }
  .ne-link { color: #60a5fa; }
  .ne-blockquote { border-color: #3b82f6; color: #94a3b8; }
  .ne-divider-widget { border-color: #334155; }
  .ne-h6 { color: #9ca3af; }
}
```
