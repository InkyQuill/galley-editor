# Architecture

This document describes the internal architecture of Galley Editor, a half-WYSIWYG markdown editor built on CodeMirror 6.

## Overview

Galley Editor renders markdown with **live preview**: when the cursor is away from a markdown node, its formatting marks (e.g. `**`, `#`, `` ` ``) are hidden and semantic CSS classes are applied. When the cursor enters the node, raw markdown is revealed for editing. This is similar to Obsidian's "live preview" mode.

The editor uses Lezer's markdown parser directly via CodeMirror's language support -- there is no separate markdown-to-HTML conversion step. All rendering is done through CodeMirror decorations.

```
                     ┌─────────────────────────────────┐
                     │        GalleyEditor.tsx        │
                     │     (React forwardRef wrapper)   │
                     └──────────────┬──────────────────┘
                                    │ creates once on mount
                                    ▼
                     ┌─────────────────────────────────┐
                     │        EditorController          │
                     │    (owns EditorView + state)     │
                     │                                  │
                     │  ┌───────────┐ ┌──────────────┐ │
                     │  │ Dynamic   │ │  Autosize     │ │
                     │  │Compartment│ │ Compartment   │ │
                     │  └───────────┘ └──────────────┘ │
                     │  ┌───────────┐                   │
                     │  │ History   │                   │
                     │  │Compartment│                   │
                     │  └───────────┘                   │
                     └──────────────┬──────────────────┘
                                    │ extensions
                   ┌────────────────┼────────────────┐
                   ▼                ▼                 ▼
            ┌────────────┐  ┌────────────┐   ┌────────────┐
            │  Plugins   │  │   Theme    │   │  Commands  │
            │ (rendering)│  │  (struct)  │   │ (editing)  │
            └────────────┘  └────────────┘   └────────────┘
```

## Core Lifecycle

### EditorView: Create Once, Never Recreate

The CodeMirror `EditorView` is created **once** when the React component mounts and destroyed only on unmount. All prop changes are applied through **Compartment reconfiguration** -- not by tearing down and rebuilding the editor. This preserves undo history, cursor position, and scroll state across re-renders.

### Three Compartments

The controller manages three `Compartment` instances:

| Compartment | Contents | Reconfigured When |
|---|---|---|
| `dynamicCompartment` | Theme, editability, placeholder, plugin extensions, extra extensions | Any settings prop changes |
| `autosizeCompartment` | Min/max rows height extension | `minRows` or `maxRows` changes |
| `historyCompartment` | Undo/redo history | Only if history needs clearing |

### Callback Proxy Pattern

Event callbacks (`onChange`, `onFocus`, etc.) are stored in a `useRef` and updated every render via `useLayoutEffect`. The controller receives a **proxy object** whose getters read from the ref, ensuring callbacks are always fresh without causing Compartment reconfiguration:

```typescript
const callbackProxy: EditorCallbacks = {
  get onChange() { return callbacksRef.current.onChange; },
  get onFocus() { return callbacksRef.current.onFocus; },
  // ... etc
};
```

This means adding or changing event handlers never triggers a re-initialization of the editor.

## Module Map

```
src/
├── components/
│   ├── GalleyEditor.tsx   # React wrapper (forwardRef)
│   ├── ErrorBoundary.tsx    # Error boundary component
│   └── index.ts             # Public API barrel export
├── plugins/
│   ├── headings.ts          # H1-H6 mark hiding + line classes
│   ├── emphasis.ts          # Bold/italic/strikethrough
│   ├── code-inline.ts       # Backtick hiding + inline code class
│   ├── code-fence.ts        # Fenced code block line decorations
│   ├── blockquote.ts        # Quote mark hiding + block line class
│   ├── links.ts             # Link mark/URL hiding + link class
│   ├── lists.ts             # Bullet marker widget replacement
│   ├── checkboxes.ts        # Interactive checkbox widgets
│   ├── dividers.ts          # Horizontal rule widget + line class
│   ├── tables.ts            # Table line decorations
│   └── index.ts             # BUILT_IN_PLUGINS array
├── controller.ts            # EditorController class
├── rendering.ts             # makeInlinePlugin / makeBlockPlugin factories
├── commands.ts              # BUILTIN_COMMANDS registry
├── types.ts                 # All TypeScript interfaces and types
├── theme.ts                 # Color scheme resolution + CM6 theme
├── autosize.ts              # Dynamic height extension
└── galley-base.css        # Optional base styles
```

## Rendering Pipeline

All markdown rendering is achieved through CodeMirror **decorations**. The Lezer markdown parser produces a syntax tree, and plugin specs iterate that tree to produce decorations that hide, replace, or annotate nodes.

### Two Plugin Factories

#### `makeInlinePlugin(spec)` -- ViewPlugin (viewport-only)

- Iterates only **visible ranges** for performance
- Rebuilds on `docChanged`, `viewportChanged`, or `selectionSet`
- Single-line decorations only (cross-line ranges are dropped)
- Tracks `parentDepths` map during tree iteration for nesting awareness

Best for: inline marks (bold delimiters, backticks, link brackets, list markers).

#### `makeBlockPlugin(spec)` -- StateField (full-doc)

- Iterates the **entire document** on changes
- Uses proximity check: hides decorations when cursor is within `BLOCK_CURSOR_LINE_PROXIMITY` (1) lines
- Supports multi-line block decorations
- Rebuilds on doc change, selection change, tree change, or forced rerender

Best for: multi-line blocks (blockquotes, tables).

#### Exception: Code Fences

The `code-fence.ts` plugin uses a custom `StateField` directly instead of `makeBlockPlugin`. `makeBlockPlugin` expands line decorations across every line in a block; code fences stay custom so their code-fence-specific cursor proximity and inside-block hiding behavior remains localized.

### Reveal Strategies

The `RevealStrategy` type controls when raw markdown is shown instead of the decoration:

| Strategy | Behavior | Used By |
|---|---|---|
| `'active'` | Reveal when cursor is inside the node **or its parent** | Bold/italic marks, header marks, list markers |
| `'line'` | Reveal when cursor is on the **same line** | Blockquote marks, dividers |
| `'select'` | Reveal only when cursor **directly overlaps** the node | Link URLs and brackets |
| `boolean` | Custom logic (true = revealed, false = always decorated) | Checkboxes, semantic class decorations |

The `hideWhenNearCursor` option (default `true`) controls whether cursor proximity hides the decoration. Set to `false` for decorations that should always be visible (e.g. semantic CSS classes on formatted spans).

### Decoration Types

Plugins produce three types of decorations:

1. **Replace decorations** (`Decoration.replace({})`) -- hide formatting marks entirely
2. **Mark decorations** (`Decoration.mark({ class })`) -- add CSS classes to text ranges
3. **Widget decorations** (`Decoration.replace({ widget })`) -- replace nodes with custom DOM (checkboxes, bullets, dividers)
4. **Line decorations** (`Decoration.line({ class })`) -- add CSS classes to entire lines

## Command System

### Built-in Commands

Commands are pure functions `(view: EditorView, ...args) => unknown` registered in `BUILTIN_COMMANDS`. They fall into categories:

- **Inline formatting**: `toggleBold`, `toggleItalic`, `toggleCode`, `toggleStrikethrough` -- wrap/unwrap selection with delimiters
- **Headings**: `toggleHeading(level)` -- add/remove line prefixes, auto-clear other heading levels
- **Lists**: `toggleBulletList`, `toggleOrderedList`, `toggleCheckList` -- add/remove line prefixes
- **Insert**: `insertLink`, `insertImage`, `insertCodeBlock`, `insertTable`, `insertHr` -- insert markdown at cursor
- **Editing**: `indent`, `outdent`, `undo`, `redo`, `selectAll`

### Command Patterns

Inline formatting uses `RegionSpec` + `toggleInlineFormatGlobally`:

1. `RegionSpec` describes the delimiter pattern (e.g. `**` for bold)
2. `findInlineMatch` checks if delimiters already surround the selection
3. `toggleInlineRegionSurrounded` wraps or unwraps accordingly
4. `growSelectionToNode` expands empty cursors to the enclosing syntax node

Line-prefix commands use `toggleSelectedLinesStartWith`:

1. `collectLines` gathers all lines in the selection range
2. Checks if **any** line already matches the prefix regex
3. If matching: removes the prefix from all matching lines
4. If not matching: adds the prefix template to all lines

### Custom Commands

Consumers register custom commands via `handle.registerCommand(name, fn)` and invoke them with `handle.execCommand(name, ...args)`. Custom commands take precedence over built-ins with the same name.

## React Integration

### GalleyEditor Component

The component is a thin `forwardRef` wrapper around `EditorController`:

1. **Mount effect** (empty deps): Creates the controller once, sets up the callback proxy
2. **Settings effect**: Calls `controller.updateSettings()` when any settings prop changes
3. **Value sync effect**: Syncs the controlled `value` prop to the editor content
4. **Imperative handle**: Exposes all `GalleyHandle` methods via `useImperativeHandle`

The DOM structure is:
```html
<div class={className}>        <!-- outer wrapper -->
  <div ref={containerRef}>     <!-- CM6 mounts here -->
    <div class="cm-editor">    <!-- created by CodeMirror -->
      ...
    </div>
  </div>
</div>
```

### ErrorBoundary

A standard React error boundary that catches render errors from children. Shows a red error panel with collapsible details and a "Try Again" button. Accepts an optional `fallback` prop for custom error UI.

## Theme System

The theme system is **style-agnostic**:

- `buildCmTheme(scheme)` produces structural-only CSS (box-sizing, padding, line-height) -- no colors or fonts
- `syntaxHighlighting(classHighlighter)` applies Lezer token classes (`tok-strong`, `tok-emphasis`, `tok-link`, etc.)
- `resolveColorScheme('auto')` checks `prefers-color-scheme` media query
- The `dark` flag is passed to `EditorView.theme()` so CM6 can scope dark-mode selectors

All visual styling is done externally via CSS targeting `ge-*` and `tok-*` classes.

## Autosize

The `autosizeExtension(minRows, maxRows)` is an `EditorView.updateListener` that adjusts the scroller element's height:

```
target = clamp(contentHeight, minRows * lineHeight, maxRows * lineHeight)
scroller.style.height = target
scroller.style.overflowY = contentHeight > maxHeight ? 'auto' : 'hidden'
```

It recalculates on `docChanged`, `geometryChanged`, or `viewportChanged`. Falls back to 24px line height if the view hasn't rendered yet.

## Build System

### Two Build Modes

Both configured in `vite.config.ts`:

| Mode | Entry | Output | Use |
|---|---|---|---|
| Default | `index.html` | `dist/` (bundled app) | Demo / development |
| Library (`--mode lib`) | `src/components/index.ts` | `dist/index.js` + `dist/index.d.ts` | npm publish |

In library mode, React, CodeMirror, and Lezer packages are externalized -- they are not bundled into the output.

### TypeScript

`tsconfig.app.json` enables `erasableSyntaxOnly: true`, which prohibits TypeScript-only syntax that requires runtime emit:
- No `enum` declarations (use `as const` objects instead)
- No `private` constructor parameters (use explicit field declarations)

### Path Alias

`@` is aliased to `src/` in both Vite and TypeScript configs for clean imports.
