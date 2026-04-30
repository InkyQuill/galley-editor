# Rendering Polish Design

## Goal

Fix the v0.4 rendering gaps that are visible in Storybook and normal editor use: active links should reveal the whole markdown link, code fences and tables should render as real visual blocks when inactive, Storybook should include image examples, the editor should have an optional status footer, and the base theme should style the whole editor surface in light and dark modes.

## Scope

### Link Reveal

When the cursor or selection is inside a markdown link, the whole link becomes editable source text: `[Label](https://example.com)`. When the cursor is outside the link, the existing rendered link styling remains.

This is a bug fix in `src/plugins/links.ts`. The link-hiding decorations should use an active reveal strategy based on the parent `Link` node instead of revealing only the exact hidden URL or mark segment.

### Code Fence Rendering

Inactive fenced code blocks render as a block widget:

- Header row with a small language badge.
- Copy button that copies the raw code text.
- Code body with dependency-free default highlighting.
- Raw fenced markdown returns when the cursor is inside or near the block so editing stays plain and predictable.

Consumers can provide their own highlighter without Galley depending on `highlight.js`, Shiki, Prism, or any other library:

```ts
codeHighlighter?: (input: {
  code: string;
  language: string;
  theme: 'light' | 'dark';
}) => string | HTMLElement;
```

If the highlighter returns a string, Galley treats it as highlighted HTML and inserts it with `innerHTML`. Consumers are responsible for sanitizing third-party output. If it returns an `HTMLElement`, Galley appends that element.

### Table Rendering

Inactive GFM pipe tables render as a real table widget:

- Header row from the first table line.
- Alignment from separator cells (`:---`, `:---:`, `---:`).
- Body rows from remaining table lines.
- Raw markdown returns when the cursor is inside or near the table.

This is intentionally a small GFM pipe-table renderer, not a full markdown table engine.

### Image Rendering

Inactive markdown images render as image widgets for normal URL targets, including SVG and PNG files:

```md
![Galley mark](assets/galley.png)
![Galley color logo](assets/galley-color.png)
```

When the cursor is inside the image syntax, the raw markdown is shown for editing. The image widget uses `alt`, lazy loading, and the default theme's bordered media frame.

### Footer

`GalleyEditor` gets an optional footer enabled by default:

```ts
footer?: boolean | {
  wordCount?: boolean;
  characterCount?: boolean;
  logo?: boolean;
}
```

The footer shows the current word count, current character count, and the root `galley.svg` logo with the tooltip text `Galley Editor v.{version}`. `footer={false}` disables the footer entirely.

### Toolbar

`GalleyEditor` gets a compact default toolbar inspired by the provided reference image: a top row inside the editor shell, separated from the writing surface by a subtle border. It includes heading selection, inline formatting, list actions, insert actions, code/table/hr insertion, and undo/redo. It is enabled by default and can be disabled:

```ts
toolbar?: boolean;
```

The toolbar calls the existing command registry through the controller ref. It does not introduce unsupported commands such as text alignment or underline.

### Default Theme

`galley-base.css` becomes a complete default skin for the editor, not just semantic text styling. It styles:

- wrapper surface
- toolbar
- CodeMirror editor background
- focus ring
- selection
- footer
- code block widgets
- table widgets
- light and dark themes

The palette stays restrained and editor-like. Consumers can still override all colors through `--ge-*` variables.

### Storybook Images

Storybook gains image examples using the Galley brand assets at the repository root. These are sample markdown image targets for demos and keep the public repository free of throwaway generated image fixtures.

## Architecture

Add a lightweight rendering context object passed to plugin `extensions`:

```ts
interface GalleyRenderContext {
  theme: 'light' | 'dark';
  codeHighlighter?: CodeHighlighter;
}
```

Existing third-party plugins remain source-compatible because JavaScript allows functions declared with one parameter to be called with two. Built-in plugins that do not need context ignore it.

For block widgets, prefer focused parsers in plugin files over expanding the generic rendering factory. Code fences and tables have enough special behavior that explicit state fields remain easier to test and maintain.

## Testing

- Link plugin tests assert hidden link syntax reveals when cursor is inside any part of the link.
- Code fence tests assert inactive blocks render a widget with language, copy button, and highlighted token classes, and active blocks show raw lines.
- Code highlighter tests assert custom highlighter output is used.
- Table tests assert a GFM table becomes a table widget when inactive and raw lines when active.
- Footer tests assert counts/logo render and `footer={false}` disables it.
- Theme changes are verified by class/CSS variable presence and Storybook smoke coverage through build.

## Out of Scope

- Full syntax highlighting dependency.
- Async highlighters.
- Rich table editing controls.
- Clipboard permission fallback UI beyond changing the copy button label when the copy promise resolves or rejects.
