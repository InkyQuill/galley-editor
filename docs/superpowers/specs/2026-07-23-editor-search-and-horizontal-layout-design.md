# Editor Search and Horizontal Layout Design

## Summary

Galley Editor will provide a built-in CodeMirror search panel and a single
editor-wide policy for horizontal layout.

By default, editor content and rendered blocks fit the editor viewport. Text,
including inactive fenced code, wraps instead of widening the editor. Consumers
may opt into an editor-wide horizontal scrolling mode with
`horizontalScroll={true}`. In that mode, the main CodeMirror scroller owns
horizontal navigation and line wrapping is disabled.

The built-in search panel opens from CodeMirror's platform-independent `Mod-f`
binding (`Ctrl+F` on Windows/Linux and `Cmd+F` on macOS) or through
`GalleyHandle.openSearch()`.

## Public API

### `GalleyEditorProps.horizontalScroll`

```ts
interface GalleyEditorProps {
  /**
   * Allow the main editor viewport to scroll horizontally and disable line
   * wrapping. Default: false.
   */
  horizontalScroll?: boolean;
}
```

The default remains a width-constrained editor:

```tsx
<GalleyEditor value={markdown} onChange={setMarkdown} />
```

Applications that intentionally display unwrapped source can opt in:

```tsx
<GalleyEditor
  value={markdown}
  onChange={setMarkdown}
  horizontalScroll
/>
```

The prop is dynamic. Changing it reconfigures the existing `EditorView`; it
does not recreate the editor or discard selection, history, or runtime
extensions.

The controller settings interface receives the corresponding required field:

```ts
interface ControllerSettings {
  horizontalScroll: boolean;
}
```

### `GalleyHandle.openSearch`

```ts
interface GalleyHandle {
  /** Open and focus the built-in search panel. */
  openSearch(): boolean;
}
```

External controls use the existing ref API:

```tsx
const editorRef = useRef<GalleyHandle>(null);

return (
  <>
    <button type="button" onClick={() => editorRef.current?.openSearch()}>
      Find
    </button>
    <GalleyEditor ref={editorRef} value={markdown} />
  </>
);
```

The React handle proxy returns `false` when invoked before the controller has
mounted. Once mounted, the return value is the result of CodeMirror's
`openSearchPanel` command.

## Architecture

### Search

Galley will add `@codemirror/search` with a `>=6.5.0` peer dependency and a
`^6.7.1` development dependency. `@codemirror/search` will also be added to
Vite's `codemirrorPackages` list so the library build externalizes and dedupes
it consistently with the other CodeMirror packages.

The controller's static extensions will include the CodeMirror search
extension. Its configured keymap will include `searchKeymap` after Galley's
controller and command bindings and before the standard/history bindings. This
order is intentional: CodeMirror's search keymap also binds `Mod-d`, while
Galley already uses `Mod-d` for duplicate line. Galley's existing binding must
continue to win.

Both the default `Mod-f` binding and `GalleyHandle.openSearch()` call the same
CodeMirror search-panel implementation. Galley will not introduce a parallel
React search state or a second search UI. The existing exported
`findInDocument()` helper remains available for programmatic result collection
and is not replaced by the panel.

Search stays available in live, Markdown, preview, editable, and read-only
modes because it does not mutate the document. In read-only and preview modes,
CodeMirror's built-in panel omits its replacement field and replace buttons;
Galley does not implement a second visibility rule.

### Horizontal layout

The controller will own a dedicated layout `Compartment`.
`EditorView.lineWrapping` will be removed from `buildStaticExtensions()` and
placed only in this compartment. The compartment selects between:

- constrained mode (`horizontalScroll === false`):
  `EditorView.lineWrapping`, an `EditorView.theme` rule setting the main
  scroller to `overflow-x: hidden`, and the `ge-width-constrained` class on the
  `.cm-editor` root;
- horizontal mode (`horizontalScroll === true`): no line-wrapping extension,
  an `EditorView.theme` rule setting the main scroller to `overflow-x: auto`,
  and the `ge-horizontal-scroll` class on the `.cm-editor` root.

The unconditional `overflowX: 'hidden'` declaration will be removed from
`buildCmTheme()` in `theme.ts`. Horizontal overflow will be owned exclusively
by the layout compartment. This keeps the core behavior active even when a
consumer does not import the optional `galley-base.css`, and avoids conflicting
theme and stylesheet declarations.

`updateSettings()` reconfigures this compartment only when
`horizontalScroll` changes. The existing editor-class compartment remains
consumer-owned and independent.

The layout extension and `galley-base.css` will enforce these invariants:

- The editor body, CodeMirror content, lines, and block-decoration containers
  can shrink within the host (`min-width: 0`).
- `.ge-width-constrained` hides horizontal overflow on the main scroller.
- `.ge-horizontal-scroll` enables `overflow-x: auto` on the main scroller.
- Rendered block widgets use `box-sizing: border-box` and do not exceed the
  available content width in constrained mode.
- `.ge-width-constrained .ge-code-body` uses `overflow-x: clip`; its code uses
  `white-space: pre-wrap` and `overflow-wrap: anywhere`.
- `.ge-horizontal-scroll .ge-code-body` uses `overflow-x: visible`; its code
  uses `white-space: pre` and may contribute to the width of the main
  CodeMirror scrolling surface. Code blocks never own a nested horizontal
  scrollbar.
- `.ge-width-constrained .ge-table-scroll` uses `overflow-x: clip`; its table
  keeps `table-layout: fixed`, `width: 100%`, and wrapping cells.
- `.ge-horizontal-scroll .ge-table-scroll` uses `overflow-x: visible`,
  `max-width: none`, and no nested horizontal scrollbar. Its table uses
  `table-layout: auto`, `width: max-content`, and `min-width: 100%`, allowing
  table content to contribute to the main CodeMirror scrolling surface.
- Images keep the current `max-width: 100%` rule in both modes. The percentage
  is relative to the content surface, which may itself be wider in horizontal
  mode. Images do not independently create another scrolling container.

Custom plugins remain responsible for their internal layout, but their
block-decoration host will receive the same shrink and maximum-width
constraints as built-in block widgets.

## Data Flow

1. `GalleyEditor` resolves `horizontalScroll` to `false` by default.
2. The prop is copied into `ControllerSettings`.
3. The initial controller state installs the matching layout-compartment
   extension.
4. A prop update reconfigures only that compartment.
5. The selected extension changes CodeMirror wrapping and the semantic layout
   class together, so JavaScript behavior and CSS policy cannot drift apart.

For search:

1. `Mod-f` is handled by CodeMirror's `searchKeymap`.
2. An external button calls the stable React handle proxy.
3. The proxy delegates to `EditorController.openSearch()`.
4. The controller calls `openSearchPanel(this.view)`.
5. CodeMirror opens and focuses its built-in panel.

## Failure and Edge-Case Behavior

- Calling `openSearch()` before mount returns `false` and does not throw.
- Repeated `openSearch()` calls reuse and focus the existing CodeMirror panel.
- Search remains functional when the document is read-only.
- Read-only and preview panels omit replacement controls using CodeMirror's
  built-in `EditorState.readOnly` behavior.
- A consumer-supplied array keymap continues to replace Galley's complete
  default keymap, including `Mod-f`, consistent with current keymap semantics.
  Function-form keymaps receive the search binding among the defaults and can
  remove or replace it.
- Galley's `Mod-d` duplicate-line binding takes precedence over CodeMirror's
  search-keymap `Mod-d` select-next-occurrence binding.
- Switching `horizontalScroll` preserves the current document, selection,
  history, focus state, plugin state, and runtime extensions.
- Long unbroken tokens in constrained fenced code wrap rather than overflow.
- Block controls and headers remain inside the editor width in constrained
  mode.

## Testing

Controller and React wrapper tests will verify:

- constrained layout is the default;
- the `EditorView` instance is retained when `horizontalScroll` changes;
- line wrapping and layout classes change through compartment
  reconfiguration;
- `Ctrl+F`/`Cmd+F` opens the built-in search panel;
- `GalleyHandle.openSearch()` opens the same panel;
- the pre-mount proxy returns `false`;
- search works in read-only/preview mode;
- function-form and array-form custom keymap behavior stays compatible.

String-level CSS contract tests in the existing `src/theme.test.ts` harness
will parse `galley-base.css` blocks and verify:

- CodeMirror content, lines, and block widgets can shrink;
- constrained fenced code uses `pre-wrap` plus `overflow-wrap: anywhere`;
- horizontal fenced code uses `pre`;
- rendered tables and other built-in block widgets do not exceed the editor
  viewport in constrained mode;
- horizontal mode delegates overflow to the main editor scroller.

Controller DOM tests will inspect `.cm-editor` layout classes,
`EditorView.lineWrapping`, the generated main-scroller overflow behavior, and
the CodeMirror panel DOM. A theme unit test will verify that `buildCmTheme()`
no longer owns `overflowX`. No browser computed-style test framework will be
added for this feature.

The full Vitest suite, ESLint, library build, demo build, documentation build,
and Storybook build will be run before completion.

## Documentation and Examples

The public API reference will document `horizontalScroll` and `openSearch()`.
A user-oriented guide will show:

- a toolbar or page-level button opening search through a ref;
- the built-in `Mod-f` shortcut, explained as `Ctrl+F`/`Cmd+F` for users;
- default wrapped code behavior;
- the explicit horizontal-scroll opt-in and its effect on the entire editor.

Storybook will include a constrained-width example with a long code line and
other rendered blocks, plus a horizontal-scroll variant. Storybook examples
will match the text documentation.

The changelog or release notes will describe both public additions and the
default block-width correction.

## Out of Scope

- A custom React search panel or controlled `searchOpen` prop.
- Search-and-replace API wrappers beyond CodeMirror's built-in panel.
- A `GalleyHandle.closeSearch()` method. The built-in close button and Escape
  key close the panel; a second imperative method is not part of the requested
  minimal API.
- Per-block horizontal scrolling options.
- Separate wrapping settings for code, tables, or custom plugins.
- Replacing the existing `findInDocument()` helper.
