# Editor Search and Horizontal Layout Design

## Summary

Galley Editor will provide a built-in CodeMirror search panel and a single
editor-wide policy for horizontal layout.

By default, editor content and rendered blocks fit the editor viewport. Text,
including inactive fenced code, wraps instead of widening the editor. Consumers
may opt into an editor-wide horizontal scrolling mode with
`horizontalScroll={true}`. In that mode, the main CodeMirror scroller owns
horizontal navigation and line wrapping is disabled.

The built-in search panel opens from `Ctrl+F`/`Cmd+F` or through
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

Galley will add `@codemirror/search` as both a peer dependency and a development
dependency. The controller's static extensions will include the CodeMirror
search extension. Its configured keymap will include `searchKeymap` after
Galley's controller and command bindings and before the standard/history
bindings.

Both the default `Mod-f` binding and `GalleyHandle.openSearch()` call the same
CodeMirror search-panel implementation. Galley will not introduce a parallel
React search state or a second search UI. The existing exported
`findInDocument()` helper remains available for programmatic result collection
and is not replaced by the panel.

Search stays available in live, Markdown, preview, editable, and read-only
modes because it does not mutate the document.

### Horizontal layout

The controller will own a dedicated layout `Compartment`. It selects between:

- constrained mode (`horizontalScroll === false`): `EditorView.lineWrapping`
  and a root class identifying the constrained layout;
- horizontal mode (`horizontalScroll === true`): no line-wrapping extension
  and a root class identifying the horizontally scrollable layout.

`updateSettings()` reconfigures this compartment only when
`horizontalScroll` changes. The existing editor-class compartment remains
consumer-owned and independent.

The base theme and `galley-base.css` will enforce these invariants:

- The editor body, CodeMirror content, lines, and block-decoration containers
  can shrink within the host (`min-width: 0`).
- Constrained mode hides horizontal overflow on the main scroller.
- Horizontal mode enables `overflow-x: auto` on the main scroller.
- Rendered block widgets use `box-sizing: border-box` and do not exceed the
  available content width in constrained mode.
- Inactive fenced code uses `white-space: pre-wrap` and
  `overflow-wrap: anywhere` in constrained mode.
- In horizontal mode, fenced code uses `white-space: pre` and may contribute
  to the width of the main CodeMirror scrolling surface.
- Tables remain fixed and wrapping in constrained mode. Horizontal-mode
  overrides may let them size to their content, but the main editor scroller,
  rather than a nested block scroller, owns horizontal navigation.
- Images preserve their existing responsive maximum width behavior.

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
- A consumer-supplied array keymap continues to replace Galley's complete
  default keymap, including `Mod-f`, consistent with current keymap semantics.
  Function-form keymaps receive the search binding among the defaults and can
  remove or replace it.
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

CSS contract tests will verify:

- the main scroller has distinct constrained and horizontal overflow rules;
- CodeMirror content, lines, and block widgets can shrink;
- constrained fenced code uses `pre-wrap` plus `overflow-wrap: anywhere`;
- horizontal fenced code uses `pre`;
- rendered tables and other built-in block widgets do not exceed the editor
  viewport in constrained mode;
- horizontal mode delegates overflow to the main editor scroller.

The full Vitest suite, ESLint, library build, demo build, documentation build,
and Storybook build will be run before completion.

## Documentation and Examples

The public API reference will document `horizontalScroll` and `openSearch()`.
A user-oriented guide will show:

- a toolbar or page-level button opening search through a ref;
- the built-in `Ctrl+F`/`Cmd+F` shortcut;
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
- Per-block horizontal scrolling options.
- Separate wrapping settings for code, tables, or custom plugins.
- Replacing the existing `findInDocument()` helper.
