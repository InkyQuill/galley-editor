# Hybrid Upload And Image UX Design

## Status

Draft design for the next asset-editing UX pass after v0.8.0.

## Goal

Make file uploads and image editing feel native inside Galley Editor:

- Show where dropped files will land before the drop happens.
- Show upload progress inside the editor by default.
- Keep the editor responsive by default, while allowing consumers to lock editing with an overlay.
- Render broken images with a useful default placeholder.
- Treat images as visual editable objects on click, not as plain Markdown text unless the user explicitly asks for source editing.

## Non-Goals

- Galley still does not upload files itself.
- Galley still does not own storage, signed URLs, asset lookup, or retry policy.
- Galley does not become a full media library.
- This pass does not implement crop, rotate, captions, or responsive `srcset`.

## Chosen Direction

Use a hybrid model:

1. Inline upload placeholders are the default.
2. Consumers may opt into an overlay or lock mode when their product needs to prevent edits during upload.
3. Consumers may override every visual renderer involved: upload placeholder, drop indicator, missing image placeholder, and selected image controls.

This preserves Galley's Markdown-first model while giving users visible feedback where their asset will appear.

## Upload UX

### Drop Indicator

When files are dragged over the editor and `onFiles` is configured, Galley shows an insertion indicator at the computed drop position:

- Inline drops show a caret-height vertical indicator.
- Block/line drops show a horizontal line between block lines.
- If CodeMirror cannot compute coordinates, Galley falls back to the current selection and shows the indicator there.
- The indicator disappears on drop, drag leave, Escape, or when the drag data no longer contains files.

The indicator must be rendered from editor state, not transient DOM mutation, so it follows scroll and reconfiguration correctly.

### Upload Placeholder

On paste/drop, before calling the async consumer upload handler, Galley inserts a temporary placeholder widget at the target range. The placeholder:

- Is anchored to the original paste/drop range and maps through document edits.
- Shows a default image/file tile with radial progress.
- Shows file name(s), upload phase, and optional status message.
- Is replaced with returned Markdown when `onFiles` resolves.
- Is removed without document insertion when `onFiles` returns `false` or `null`.
- Switches to an error state when `onFiles` rejects.

The current v0.8 `input.report()` API remains the progress channel. Galley will mirror each status update into the placeholder state in addition to calling `onFileStatus`.

### Editing During Upload

Default behavior is non-blocking:

- Users may keep typing while upload is in progress.
- The upload placeholder range maps through document changes.
- Returned Markdown replaces the placeholder at its current mapped position.

Optional behavior:

```ts
uploadInteraction?: 'inline' | 'overlay' | 'locked';
```

- `inline`: default, non-blocking placeholder only.
- `overlay`: show a visual overlay while uploads are active, but do not block selection or typing unless the consumer overlay chooses to intercept events.
- `locked`: prevent editor document edits while one or more uploads are active. Navigation and copy should still work.

## Public API Additions

### Upload Rendering

```ts
export interface GalleyUploadInfo {
  id: string;
  files: File[];
  source: GalleyFileSource;
  selection: GalleySelectionInfo;
  phase: GalleyFileStatusPhase;
  progress?: number;
  message?: string;
  error?: unknown;
}

export type UploadPlaceholderRenderer =
  (upload: GalleyUploadInfo) => HTMLElement | null;

export type DropIndicatorRenderer =
  (input: {
    source: 'drag';
    pos: number;
    lineFrom: number;
    lineTo: number;
  }) => HTMLElement | null;

export type UploadOverlayRenderer =
  (uploads: GalleyUploadInfo[]) => HTMLElement | null;
```

New props:

```ts
uploadPlaceholderRenderer?: UploadPlaceholderRenderer;
dropIndicatorRenderer?: DropIndicatorRenderer;
uploadOverlayRenderer?: UploadOverlayRenderer;
uploadInteraction?: 'inline' | 'overlay' | 'locked';
```

Returning `null` from a renderer falls back to the built-in default for that renderer. Consumers that want no visual output should return an empty element with `display: none` or use CSS to hide the relevant class.

### Missing Image Rendering

```ts
export interface GalleyMissingImageInfo extends GalleyImageInfo {
  reason: 'error' | 'empty-url';
}

export type MissingImageRenderer =
  (image: GalleyMissingImageInfo) => HTMLElement | null;
```

New prop:

```ts
missingImageRenderer?: MissingImageRenderer;
```

The default missing image placeholder should show a neutral image tile, alt text when available, and a short "Image unavailable" label. It must not throw if the URL is invalid.

## Image Editing UX

### Click Behavior

Normal pointer interaction should keep images visual:

- Click selects the image widget.
- Selected image shows resize handles and a selection outline.
- Click does not reveal raw Markdown.
- Dragging resize handles updates image metadata (`{width height}`) through the existing `updateImageMetadata` command path.

Raw Markdown is revealed only when:

- User Ctrl-clicks or Cmd-clicks the image widget.
- Keyboard navigation moves the caret into the image Markdown source range.
- User selects across the image source range as text.
- Editor is in `markdown` mode.

Preview mode never reveals raw Markdown.

### Resize Handles

Default selected-image handles:

- Four corner handles are enough for the default.
- Preserve aspect ratio by default when both dimensions are known.
- Shift-drag toggles free resize.
- Minimum size defaults to `32px`.
- Resize writes metadata using Galley's existing syntax:

```md
![Alt](image.png "Title"){width=640 height=360}
```

Consumers may override the selected-image controls with a renderer:

```ts
export type ImageControlsRenderer =
  (input: {
    image: GalleyImageInfo;
    selected: boolean;
    resizing: boolean;
    update(metadata: GalleyImageMetadataInput): void;
    clearDimensions(): void;
    revealSource(): void;
  }) => HTMLElement | null;
```

New prop:

```ts
imageControlsRenderer?: ImageControlsRenderer;
```

Returning `null` uses the default selection outline and handles.

## Architecture

### Upload State

Add a small upload-state module that owns:

- `StateField` of active uploads.
- Effects for start, progress, complete, error, remove.
- Decoration builder for inline placeholders.
- Optional overlay ViewPlugin for overlay mode.
- Drop indicator StateField or ViewPlugin state.

`EditorController.handleFiles()` should dispatch upload start/progress effects in sync with `onFileStatus`, rather than storing upload UI state in React.

### Image State

Extend `src/plugins/images.ts` so image widgets can distinguish:

- inactive rendered image,
- selected visual image,
- broken/missing image,
- source-reveal image.

Image source reveal should no longer be a simple "selection intersects image range" rule for pointer clicks. Pointer selection on the widget should select a visual image state; keyboard selection entering the source range should still reveal raw Markdown.

### CSS

Add semantic classes to `galley-base.css`:

- `ge-drop-indicator`
- `ge-upload-placeholder`
- `ge-upload-progress`
- `ge-upload-error`
- `ge-upload-overlay`
- `ge-image-missing`
- `ge-image-selected`
- `ge-image-resize-handle`

The defaults must be usable without app CSS, but all visual values should use `--ge-*` variables where possible.

## Accessibility

- Upload placeholders use `role="status"` and `aria-live="polite"` for progress messages.
- Progress ring exposes `aria-valuenow`, `aria-valuemin`, and `aria-valuemax` when progress is known.
- Missing image placeholder exposes useful text derived from alt/title/url.
- Resize handles are keyboard reachable only when the image is selected.
- Keyboard resizing should be supported with arrow keys on focused handles.

## Tests

Add coverage for:

- Dragover shows and clears a drop indicator.
- Drop inserts an upload placeholder before async handler resolution.
- `input.report()` updates the placeholder and still calls `onFileStatus`.
- Returned Markdown replaces the placeholder at the mapped position after document edits.
- `uploadInteraction="locked"` prevents document edits while upload is active.
- Rejected uploads show error placeholder and call `onFileError`.
- Broken image load swaps to default missing placeholder.
- Custom missing image renderer is called.
- Normal image click selects visual image and does not reveal Markdown.
- Ctrl/Cmd-click reveals Markdown.
- Keyboard navigation into image source reveals Markdown.
- Resize handle updates width/height metadata.

## Documentation And Stories

Storybook should include:

- Slow drop upload with inline radial progress.
- Locked overlay upload mode.
- Custom upload placeholder renderer.
- Broken image placeholder default and custom renderer.
- Click-to-select image with resize handles.
- Ctrl/Cmd-click image source reveal.

Docs should update:

- API reference with new renderers and `uploadInteraction`.
- Complete Guide upload section.
- Plugins/renderers guide image section.
- Changelog entry for the UX pass.

## Decisions For This Spec

1. `uploadInteraction="locked"` blocks user-originated document changes while uploads are active. Selection, scrolling, copying, and internal upload progress/completion effects remain allowed.
2. Upload placeholders are visual editor state, not Markdown document text and not undoable history entries. The final Markdown insertion is a normal undoable document change.
3. Default resize preserves aspect ratio from explicit Markdown dimensions when both are present. If only one dimension is present, Galley uses the image's intrinsic dimensions after load; before load, it falls back to free resize.
