# Plugin System

Galley Editor uses a plugin system to implement all markdown rendering features. Every visual transformation -- from hiding `**` delimiters to rendering interactive checkboxes -- is a plugin.

## Plugin Interface

A plugin implements the `GalleyPlugin` interface:

```typescript
interface GalleyPlugin {
  /** Stable identifier. Built-ins use 'ge:headings', 'ge:emphasis', etc. */
  id: string;
  /** Return CM6 extensions that implement this plugin's behavior. */
  extensions(classNames: GalleyClassNames, context?: GalleyRenderContext): Extension[];
}
```

The `extensions()` method receives resolved CSS class names and returns one or more CodeMirror 6 extensions. These extensions are registered in the editor's dynamic compartment and reconfigured whenever settings change.

## Plugin Spec (Low-Level)

The rendering factories (`makeInlinePlugin` and `makeBlockPlugin`) accept a `GalleyPluginSpec`:

```typescript
interface GalleyPluginSpec {
  /** Return a Decoration or WidgetType to apply at this node, or null to skip. */
  createDecoration(
    node: SyntaxNodeRef,
    state: EditorState,
    parentDepths: ReadonlyMap<string, number>,
  ): WidgetType | Decoration | null;

  /** Range for line decorations. Every touched line receives the decoration. */
  getLineRange?(node: SyntaxNodeRef, state: EditorState):
    | { from: number; to: number }
    | null;

  /** Range for mark and replace decorations. Null uses the full node span. */
  getMarkRange?(node: SyntaxNodeRef, state: EditorState):
    | { from: number; to: number }
    | null;

  /** Position for point widgets. */
  getPointPosition?(node: SyntaxNodeRef, state: EditorState): number | null;

  /** When to show raw markdown instead of the decoration. Defaults to 'line'. */
  getRevealStrategy?(node: SyntaxNodeRef, state: EditorState): RevealStrategy;

  /** Whether cursor proximity hides the decoration. Defaults to true. */
  hideWhenNearCursor?: boolean;

  /** Skip selection-only rebuilds when the move cannot affect decorations. */
  selectionAffectsDecorations?(prev: EditorSelection, next: EditorSelection): boolean;

  /** Force full re-render on specific transactions. */
  shouldForceRerender?(transaction: Transaction): boolean;
}
```

Only one of `getLineRange`, `getMarkRange`, and `getPointPosition` may be defined. The factories throw immediately when a spec defines more than one selector.

### `parentDepths`

During tree iteration, the factory tracks how many times each node name has been entered but not yet left. This gives plugins awareness of **nesting depth**. For example, `parentDepths.get('BulletList')` tells the lists plugin the current nesting level so it can cycle visual bullet styles.

### Range Selectors

By default, mark and replacement decorations cover the full node span. Override the selector that matches the decoration intent:

- `getLineRange`: applies a `Decoration.line` to every line touched by `{ from, to }`.
- `getMarkRange`: applies mark and replace decorations to a continuous text range.
- `getPointPosition`: places a point widget at a single position.
- Returning `null` uses the default node range for line/mark selectors, or skips point widgets.

### Reveal Strategies

| Strategy | Behavior | Typical Use |
|---|---|---|
| `'active'` | Reveal when cursor is inside the node or its parent | Inline marks (bold, italic, headings) |
| `'line'` | Reveal when cursor is on the same line | Line-oriented marks (blockquote `>`) |
| `'select'` | Reveal only when cursor directly overlaps the node | Hidden parts (link URLs) |
| `true` | Always revealed (raw markdown shown) | Custom conditional logic |
| `false` | Never revealed (decoration always shown) | Semantic classes, always-visible decorations |

## Factory Functions

### `makeInlinePlugin(spec): Extension`

Creates a `ViewPlugin` that iterates **visible ranges only** (viewport optimization). Ideal for inline marks that appear frequently.

- Rebuilds decorations on `docChanged`, `viewportChanged`, `selectionSet`
- Can skip selection-only rebuilds with `selectionAffectsDecorations`
- Only produces single-line decorations (cross-line ranges are dropped)
- Returns a single `Extension`

### `makeBlockPlugin(spec): Extension[]`

Creates a `StateField` that iterates the **entire document**. Needed for multi-line blocks.

- Uses proximity check: hides decorations when cursor is within 1 line (`BLOCK_CURSOR_LINE_PROXIMITY`)
- Rebuilds on doc change, selection change, syntax tree change, or forced rerender
- Can skip selection-only rebuilds with `selectionAffectsDecorations`
- Returns an array of extensions

### When to Use Which

| Scenario | Factory | Why |
|---|---|---|
| Hide inline delimiters (`**`, `` ` ``, `~~`) | `makeInlinePlugin` | Single-line, viewport-only is cheaper |
| Add CSS class to formatted text | `makeInlinePlugin` | Range decoration on inline span |
| Replace list marker with widget | `makeInlinePlugin` | Point decoration on inline node |
| Add line class to blockquote | `makeBlockPlugin` | Block-level, needs full-doc awareness |
| Add line class to table | `makeBlockPlugin` | Block-level |
| Per-line decorations in code fences | Custom `StateField` | Need multiple decorations per node |

## Built-in Plugins

### Headings (`ge:headings`)

**File:** `src/plugins/headings.ts`

Two extensions:
1. **Mark hiding**: Hides `HeaderMark` nodes (`#`, `##`, etc.) including the trailing space. Uses `'active'` reveal so marks appear when the cursor enters the heading.
2. **Line classes**: Adds `ge-heading ge-h1` through `ge-heading ge-h6` line decorations. Always visible (`hideWhenNearCursor: false`).

### Emphasis (`ge:emphasis`)

**File:** `src/plugins/emphasis.ts`

Two extensions:
1. **Mark hiding**: Hides `EmphasisMark` (`*`, `_`) and `StrikethroughMark` (`~~`). Uses `'active'` reveal.
2. **Semantic classes**: Adds `ge-bold` to `StrongEmphasis`, `ge-italic` to `Emphasis`, `ge-strikethrough` to `Strikethrough`. Always visible.

### Inline Code (`ge:code-inline`)

**File:** `src/plugins/code-inline.ts`

Two extensions:
1. **Mark hiding**: Hides `CodeMark` backticks (only for `InlineCode`, not `FencedCode`). Uses `'active'` reveal.
2. **Semantic class**: Adds `ge-code-inline` to `InlineCode` nodes. Always visible.

### Code Fences (`ge:code-fence`)

**File:** `src/plugins/code-fence.ts`

Custom `StateField` (not `makeBlockPlugin`). Iterates `FencedCode` nodes and applies `ge-code-fence` line decoration to **every line** in the block. Hides when cursor is within 1 line or inside the block.

`makeBlockPlugin` also expands line decorations across every line in a block in v0.3. This plugin remains a custom StateField to keep the code-fence-specific cursor proximity and inside-block hiding behavior localized.

### Blockquotes (`ge:blockquote`)

**File:** `src/plugins/blockquote.ts`

Two extensions:
1. **Block line class**: Uses `makeBlockPlugin` to add `ge-blockquote` line decoration. Always visible.
2. **Mark hiding**: Uses `makeInlinePlugin` to hide `QuoteMark` (`>`). Uses `'line'` reveal.

### Links (`ge:links`)

**File:** `src/plugins/links.ts`

Two extensions:
1. **Reference registry**: Tracks `[ref]: url "title"` definitions in a state field.
2. **Mark/URL hiding**: Hides `LinkMark`, inline `URL`, and reference `LinkLabel` nodes. Uses `'select'` reveal -- only revealed when cursor directly overlaps.
3. **Definition hiding**: Hides reference definition lines when inactive.
4. **Semantic class**: Adds `ge-link` and `data-ge-url` to resolved `Link` nodes. Always visible.
5. **Click handler**: Cmd/Ctrl-click activates the resolved URL. `onLinkClick` runs first and can suppress default `window.open` by returning `true`.

Inline links, full reference links (`[label][ref]`), and shorthand reference links (`[ref]`) are supported.

### Lists (`ge:lists`)

**File:** `src/plugins/lists.ts`

One extension using `makeInlinePlugin`:
- Replaces `ListMark` nodes (`-`, `*`) in `BulletList > ListItem` with a `BulletMarkerWidget`
- Widget cycles through 3 visual depth styles (`ge-depth-0`, `ge-depth-1`, `ge-depth-2`) based on nesting
- Widget structure: outer `span.ge-list-marker` > sizing `span` (preserves width) + visual dot `span`
- Uses `'active'` reveal

Does not affect ordered lists or task list markers (those are handled by checkboxes plugin).

### Checkboxes (`ge:checkboxes`)

**File:** `src/plugins/checkboxes.ts`

The most complex built-in plugin. Uses `makeInlinePlugin` plus a DOM event handler:

1. **Event handler**: Captures `mousedown` on checkbox inputs inside `.ge-checkbox` containers to allow click-through
2. **Checkbox widget**: Replaces `TaskMarker` (`[ ]` / `[x]`) plus the preceding `ListMark` with an interactive `CheckboxWidget`
   - Renders an `<input type="checkbox">` inside a styled container
   - On toggle: updates the line text, changing `[ ]` to `[x]` or vice versa
   - Tracks nesting depth via `parentDepths.get('ListItem')`
3. **Completed task line class**: Adds `ge-completed-task` line decoration to `Task` nodes where the marker contains `x`
4. **Custom reveal strategy**: Uses boolean reveal based on whether the cursor overlaps the combined range from list mark to task marker

### Dividers (`ge:dividers`)

**File:** `src/plugins/dividers.ts`

Two `makeInlinePlugin` extensions:
1. **Widget replacement**: Replaces `HorizontalRule` nodes with a `DividerWidget` that renders `<hr class="ge-divider-widget">`. Default `'line'` reveal.
2. **Line decoration**: Adds `ge-divider` line class to `HorizontalRule` lines.

### Tables (`ge:tables`)

**File:** `src/plugins/tables.ts`

The simplest built-in plugin. Uses `makeBlockPlugin` to add `ge-table` line decoration to `Table` nodes. Always visible (`hideWhenNearCursor: false`).

### Images (`ge:images`)

**File:** `src/plugins/images.ts`

By default, markdown images render as built-in image widgets. The plugin replaces inactive image syntax with an `<img>` wrapped in `.ge-image-widget`.

With `imageRenderer`, consumers can replace the built-in image element with a custom widget. Returning `null` falls back to rendered alt text without an image element.

```tsx
<GalleyEditor
  imageRenderer={({ alt, url, title, width, height, raw, from, to }) => {
    const figure = document.createElement('figure');
    const img = document.createElement('img');
    img.src = url;
    img.alt = alt;
    if (title) img.title = title;
    if (width) img.width = width;
    if (height) img.height = height;
    figure.dataset.source = raw;
    figure.dataset.from = String(from);
    figure.dataset.to = String(to);
    figure.append(img);
    return figure;
  }}
/>
```

`imageRenderer` receives `GalleyImageInfo`:

```typescript
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
```

Galley parses and preserves image metadata using this syntax:

```md
![Alt](image.png "Title"){width=640 height=360}
```

Consumers can pair custom renderers with the `updateImageMetadata` and `clearImageDimensions` commands to build captions, asset inspectors, or resize controls.

An ordinary click on a rendered image selects it visually and shows Galley's built-in resize handles. Ctrl/Cmd-click, or moving the caret into the image source, reveals the raw markdown. Resize handles update `{width height}` metadata in the image's trailing attribute block.

If an image has an empty source or fails to load, Galley shows a missing-image placeholder. Override it with `missingImageRenderer`:

```tsx
<GalleyEditor
  missingImageRenderer={(image) => {
    const element = document.createElement('span');
    element.textContent = `${image.reason}: ${image.alt || image.url}`;
    return element;
  }}
/>
```

### Upload Renderers

Upload behavior stays owned by `onFiles`. Galley owns the default editor UI state for active uploads, including inline placeholders, drag/drop indicators, and optional overlays. `input.report()` updates both `onFileStatus` and the active placeholder renderer.

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

Set `uploadInteraction="overlay"` to add an editor overlay while uploads are active. Set `uploadInteraction="locked"` to show the overlay and block user document edits until the upload finishes. Use `dropIndicatorRenderer` to replace the drag/drop insertion marker and `uploadOverlayRenderer` to replace the overlay.

## Building Custom Plugins

### Basic Example: Highlight `TODO` Comments

```typescript
import { Decoration } from '@codemirror/view';
import { makeInlinePlugin } from '@inky/galley-editor';
import type { GalleyPlugin, GalleyClassNames } from '@inky/galley-editor';

const todoHighlightPlugin: GalleyPlugin = {
  id: 'custom:todo-highlight',
  extensions(classNames: GalleyClassNames) {
    return [
      makeInlinePlugin({
        createDecoration(node, state) {
          // Look for text content containing TODO
          if (node.name !== 'Paragraph') return null;
          const text = state.doc.sliceString(node.from, node.to);
          if (!text.includes('TODO')) return null;
          return Decoration.mark({ class: 'todo-highlight' });
        },
        hideWhenNearCursor: false, // Always show the highlight
        getRevealStrategy: () => false,
      }),
    ];
  },
};
```

### Widget Example: Custom Emoji Replacement

```typescript
import { WidgetType } from '@codemirror/view';
import { makeInlinePlugin } from '@inky/galley-editor';
import type { GalleyPlugin } from '@inky/galley-editor';

class EmojiWidget extends WidgetType {
  constructor(private emoji: string) { super(); }
  eq(other: EmojiWidget) { return other.emoji === this.emoji; }
  toDOM() {
    const span = document.createElement('span');
    span.textContent = this.emoji;
    span.className = 'emoji-widget';
    return span;
  }
}

const emojiPlugin: GalleyPlugin = {
  id: 'custom:emoji',
  extensions() {
    return [
      makeInlinePlugin({
        createDecoration(node, state) {
          if (node.name !== 'Emoji') return null;
          const text = state.doc.sliceString(node.from, node.to);
          const emojiMap: Record<string, string> = { ':smile:': '\u{1F604}', ':heart:': '\u{2764}\u{FE0F}' };
          const emoji = emojiMap[text];
          return emoji ? new EmojiWidget(emoji) : null;
        },
        getRevealStrategy: () => 'active',
      }),
    ];
  },
};
```

### Registering Custom Plugins

```tsx
<GalleyEditor
  value={value}
  onChange={setValue}
  plugins={[todoHighlightPlugin, emojiPlugin]}
/>
```

### Disabling Built-in Plugins

```tsx
<GalleyEditor
  value={value}
  onChange={setValue}
  disabledPlugins={['ge:emphasis', 'ge:links']}
/>
```

Built-in plugin IDs:
- `ge:headings`
- `ge:emphasis`
- `ge:code-inline`
- `ge:code-fence`
- `ge:blockquote`
- `ge:links`
- `ge:lists`
- `ge:checkboxes`
- `ge:dividers`
- `ge:tables`

## Plugin Execution Order

Plugins are registered in the order: built-ins first (in `BUILT_IN_PLUGINS` array order), then custom plugins. Since decorations are sorted by position, the visual result is deterministic regardless of plugin order. However, if two plugins produce overlapping decorations, the one registered first takes precedence in CM6's decoration resolution.

## Exported Utilities

For custom plugin development, the library exports:

| Export | Description |
|---|---|
| `makeInlinePlugin(spec)` | ViewPlugin factory for inline decorations |
| `makeBlockPlugin(spec)` | StateField factory for block decorations |
| `HIDE_DECORATION` | Shared `Decoration.replace({})` for hiding nodes |
| `nodeIntersectsSelection(selection, node)` | Helper to check if selection overlaps a node |
| `BLOCK_CURSOR_LINE_PROXIMITY` | Constant (1) for block plugin proximity threshold |
| `BUILT_IN_PLUGINS` | Array of all 10 built-in plugins |
