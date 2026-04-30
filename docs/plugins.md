# Plugin System

Neutrino Editor uses a plugin system to implement all markdown rendering features. Every visual transformation -- from hiding `**` delimiters to rendering interactive checkboxes -- is a plugin.

## Plugin Interface

A plugin implements the `NeutrinoPlugin` interface:

```typescript
interface NeutrinoPlugin {
  /** Stable identifier. Built-ins use 'ne:headings', 'ne:emphasis', etc. */
  id: string;
  /** Return CM6 extensions that implement this plugin's behavior. */
  extensions(classNames: NeutrinoClassNames, context?: NeutrinoRenderContext): Extension[];
}
```

The `extensions()` method receives resolved CSS class names and returns one or more CodeMirror 6 extensions. These extensions are registered in the editor's dynamic compartment and reconfigured whenever settings change.

## Plugin Spec (Low-Level)

The rendering factories (`makeInlinePlugin` and `makeBlockPlugin`) accept a `NeutrinoPluginSpec`:

```typescript
interface NeutrinoPluginSpec {
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

### Headings (`ne:headings`)

**File:** `src/plugins/headings.ts`

Two extensions:
1. **Mark hiding**: Hides `HeaderMark` nodes (`#`, `##`, etc.) including the trailing space. Uses `'active'` reveal so marks appear when the cursor enters the heading.
2. **Line classes**: Adds `ne-heading ne-h1` through `ne-heading ne-h6` line decorations. Always visible (`hideWhenNearCursor: false`).

### Emphasis (`ne:emphasis`)

**File:** `src/plugins/emphasis.ts`

Two extensions:
1. **Mark hiding**: Hides `EmphasisMark` (`*`, `_`) and `StrikethroughMark` (`~~`). Uses `'active'` reveal.
2. **Semantic classes**: Adds `ne-bold` to `StrongEmphasis`, `ne-italic` to `Emphasis`, `ne-strikethrough` to `Strikethrough`. Always visible.

### Inline Code (`ne:code-inline`)

**File:** `src/plugins/code-inline.ts`

Two extensions:
1. **Mark hiding**: Hides `CodeMark` backticks (only for `InlineCode`, not `FencedCode`). Uses `'active'` reveal.
2. **Semantic class**: Adds `ne-code-inline` to `InlineCode` nodes. Always visible.

### Code Fences (`ne:code-fence`)

**File:** `src/plugins/code-fence.ts`

Custom `StateField` (not `makeBlockPlugin`). Iterates `FencedCode` nodes and applies `ne-code-fence` line decoration to **every line** in the block. Hides when cursor is within 1 line or inside the block.

`makeBlockPlugin` also expands line decorations across every line in a block in v0.3. This plugin remains a custom StateField to keep the code-fence-specific cursor proximity and inside-block hiding behavior localized.

### Blockquotes (`ne:blockquote`)

**File:** `src/plugins/blockquote.ts`

Two extensions:
1. **Block line class**: Uses `makeBlockPlugin` to add `ne-blockquote` line decoration. Always visible.
2. **Mark hiding**: Uses `makeInlinePlugin` to hide `QuoteMark` (`>`). Uses `'line'` reveal.

### Links (`ne:links`)

**File:** `src/plugins/links.ts`

Two extensions:
1. **Reference registry**: Tracks `[ref]: url "title"` definitions in a state field.
2. **Mark/URL hiding**: Hides `LinkMark`, inline `URL`, and reference `LinkLabel` nodes. Uses `'select'` reveal -- only revealed when cursor directly overlaps.
3. **Definition hiding**: Hides reference definition lines when inactive.
4. **Semantic class**: Adds `ne-link` and `data-ne-url` to resolved `Link` nodes. Always visible.
5. **Click handler**: Cmd/Ctrl-click activates the resolved URL. `onLinkClick` runs first and can suppress default `window.open` by returning `true`.

Inline links, full reference links (`[label][ref]`), and shorthand reference links (`[ref]`) are supported.

### Lists (`ne:lists`)

**File:** `src/plugins/lists.ts`

One extension using `makeInlinePlugin`:
- Replaces `ListMark` nodes (`-`, `*`) in `BulletList > ListItem` with a `BulletMarkerWidget`
- Widget cycles through 3 visual depth styles (`ne-depth-0`, `ne-depth-1`, `ne-depth-2`) based on nesting
- Widget structure: outer `span.ne-list-marker` > sizing `span` (preserves width) + visual dot `span`
- Uses `'active'` reveal

Does not affect ordered lists or task list markers (those are handled by checkboxes plugin).

### Checkboxes (`ne:checkboxes`)

**File:** `src/plugins/checkboxes.ts`

The most complex built-in plugin. Uses `makeInlinePlugin` plus a DOM event handler:

1. **Event handler**: Captures `mousedown` on checkbox inputs inside `.ne-checkbox` containers to allow click-through
2. **Checkbox widget**: Replaces `TaskMarker` (`[ ]` / `[x]`) plus the preceding `ListMark` with an interactive `CheckboxWidget`
   - Renders an `<input type="checkbox">` inside a styled container
   - On toggle: updates the line text, changing `[ ]` to `[x]` or vice versa
   - Tracks nesting depth via `parentDepths.get('ListItem')`
3. **Completed task line class**: Adds `ne-completed-task` line decoration to `Task` nodes where the marker contains `x`
4. **Custom reveal strategy**: Uses boolean reveal based on whether the cursor overlaps the combined range from list mark to task marker

### Dividers (`ne:dividers`)

**File:** `src/plugins/dividers.ts`

Two `makeInlinePlugin` extensions:
1. **Widget replacement**: Replaces `HorizontalRule` nodes with a `DividerWidget` that renders `<hr class="ne-divider-widget">`. Default `'line'` reveal.
2. **Line decoration**: Adds `ne-divider` line class to `HorizontalRule` lines.

### Tables (`ne:tables`)

**File:** `src/plugins/tables.ts`

The simplest built-in plugin. Uses `makeBlockPlugin` to add `ne-table` line decoration to `Table` nodes. Always visible (`hideWhenNearCursor: false`).

### Images (`ne:images`)

**File:** `src/plugins/images.ts`

By default, markdown images render as safe alt text. The plugin hides `![`, `](`, URL/title syntax, and `)` when inactive; it does not create an `<img>` or fetch remote URLs unless the consumer provides `imageRenderer`.

With `imageRenderer`, the plugin replaces the image syntax with a custom widget. Returning `null` falls back to the safe alt-text rendering.

## Building Custom Plugins

### Basic Example: Highlight `TODO` Comments

```typescript
import { Decoration } from '@codemirror/view';
import { makeInlinePlugin } from '@inky/neutrino-editor';
import type { NeutrinoPlugin, NeutrinoClassNames } from '@inky/neutrino-editor';

const todoHighlightPlugin: NeutrinoPlugin = {
  id: 'custom:todo-highlight',
  extensions(classNames: NeutrinoClassNames) {
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
import { makeInlinePlugin } from '@inky/neutrino-editor';
import type { NeutrinoPlugin } from '@inky/neutrino-editor';

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

const emojiPlugin: NeutrinoPlugin = {
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
<NeutrinoEditor
  value={value}
  onChange={setValue}
  plugins={[todoHighlightPlugin, emojiPlugin]}
/>
```

### Disabling Built-in Plugins

```tsx
<NeutrinoEditor
  value={value}
  onChange={setValue}
  disabledPlugins={['ne:emphasis', 'ne:links']}
/>
```

Built-in plugin IDs:
- `ne:headings`
- `ne:emphasis`
- `ne:code-inline`
- `ne:code-fence`
- `ne:blockquote`
- `ne:links`
- `ne:lists`
- `ne:checkboxes`
- `ne:dividers`
- `ne:tables`

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
