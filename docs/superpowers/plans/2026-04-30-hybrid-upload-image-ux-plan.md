# Hybrid Upload And Image UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add first-class hybrid upload progress, drop-position feedback, missing-image placeholders, and visual image resize selection to Galley Editor.

**Architecture:** Upload UI state lives in CodeMirror state fields/effects so placeholders, drop indicators, overlays, and locked mode map through document edits without React state. Image widgets keep rendering Markdown images as widgets, but gain separate selected/missing/source-reveal states and default resize controls that call existing image metadata commands. Consumer override points are exposed through typed renderer props and routed through the existing `ControllerSettings`/`GalleyRenderContext` path.

**Tech Stack:** React 19, TypeScript, CodeMirror 6 `StateField`, `StateEffect`, `ViewPlugin`, `WidgetType`, Lezer Markdown, Vitest/jsdom, Storybook 10.

---

## File Structure

- Create `src/upload-ui.ts`: upload state effects, upload placeholder widgets, drop indicator decorations, optional overlay plugin, and locked-edit transaction filter.
- Create `src/upload-ui.test.ts`: direct CodeMirror tests for placeholder, drop indicator, progress update, mapped replacement, and locked mode.
- Modify `src/types.ts`: public renderer/input types and props for upload UI, missing image renderer, and image controls renderer.
- Modify `src/controller.ts`: dispatch upload/drop effects from file intake, replace placeholder ranges on completion, and wire upload UI extension into dynamic settings.
- Modify `src/components/GalleyEditor.tsx`: accept new props and pass them through stable settings.
- Modify `src/plugins/images.ts`: missing image fallback, visual image selection, Ctrl/Cmd-click source reveal, and default selected-image wrapper.
- Create `src/plugins/image-resize.ts`: resize handle widget helpers and pointer math for metadata updates.
- Create `src/plugins/image-resize.test.ts`: metadata update behavior from handle interaction.
- Modify `src/plugins/images.test.ts`: missing image, click selection, Ctrl/Cmd-click reveal, and custom renderer coverage.
- Modify `src/galley-base.css`: default styling for upload placeholders, drop indicator, upload overlay, missing image, selected image, and resize handles.
- Modify `src/components/GalleyEditor.stories.tsx`: slow drop upload, locked overlay upload, custom placeholder renderer, missing image renderers, visual resize handles.
- Modify `docs/api-reference.md`, `docs/plugins.md`, `docs-site/src/content/docs/reference/api.md`, `docs-site/src/content/docs/guides/complete-guide.md`, `docs-site/src/content/docs/guides/plugins-renderers.md`, `docs-site/public/llms/complete-guide.md`, and `CHANGELOG.md`.

## Task 1: Public Types And Prop Plumbing

**Files:**
- Modify: `src/types.ts`
- Modify: `src/components/GalleyEditor.tsx`
- Modify: `src/controller.ts`
- Test: `src/controller.test.ts`

- [ ] **Step 1: Add failing construction test for new props**

Add this test near the existing controller file workflow callback construction test in `src/controller.test.ts`:

```ts
it('accepts upload and image UX renderer settings', () => {
  const controller = createController('', {}, {
    uploadInteraction: 'overlay',
    uploadPlaceholderRenderer: () => document.createElement('div'),
    dropIndicatorRenderer: () => document.createElement('div'),
    uploadOverlayRenderer: () => document.createElement('div'),
    missingImageRenderer: () => document.createElement('div'),
    imageControlsRenderer: () => document.createElement('div'),
  });

  expect(controller.view).toBeDefined();
});
```

- [ ] **Step 2: Run the failing test**

Run:

```bash
npm test -- src/controller.test.ts -t "accepts upload and image UX renderer settings"
```

Expected: TypeScript compile failure because the new properties do not exist on `ControllerSettings`.

- [ ] **Step 3: Add public renderer types**

In `src/types.ts`, after `GalleyFileStatus`, add:

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

export type GalleyUploadInteraction = 'inline' | 'overlay' | 'locked';

export type UploadPlaceholderRenderer = (upload: GalleyUploadInfo) => HTMLElement | null;

export type DropIndicatorRenderer = (input: {
  source: 'drag';
  pos: number;
  lineFrom: number;
  lineTo: number;
}) => HTMLElement | null;

export type UploadOverlayRenderer = (uploads: GalleyUploadInfo[]) => HTMLElement | null;
```

After `GalleyImageInfo`, add:

```ts
export interface GalleyMissingImageInfo extends GalleyImageInfo {
  reason: 'error' | 'empty-url';
}

export type MissingImageRenderer = (image: GalleyMissingImageInfo) => HTMLElement | null;

export type ImageControlsRenderer = (input: {
  image: GalleyImageInfo;
  selected: boolean;
  resizing: boolean;
  update(metadata: GalleyImageMetadataInput): void;
  clearDimensions(): void;
  revealSource(): void;
}) => HTMLElement | null;
```

- [ ] **Step 4: Add renderer fields to render context and props**

In `src/types.ts`, extend `GalleyRenderContext`:

```ts
  missingImageRenderer?: MissingImageRenderer;
  imageControlsRenderer?: ImageControlsRenderer;
```

In `GalleyEditorProps`, add the upload props near `onFiles`:

```ts
  uploadInteraction?: GalleyUploadInteraction;
  uploadPlaceholderRenderer?: UploadPlaceholderRenderer;
  dropIndicatorRenderer?: DropIndicatorRenderer;
  uploadOverlayRenderer?: UploadOverlayRenderer;
```

Add the image props near `imageRenderer`:

```ts
  missingImageRenderer?: MissingImageRenderer;
  imageControlsRenderer?: ImageControlsRenderer;
```

- [ ] **Step 5: Thread props through React wrapper**

In `src/components/GalleyEditor.tsx`, add the new types to the existing import list from `../types` only if TypeScript needs explicit names. Destructure the new props:

```ts
      uploadInteraction = 'inline',
      uploadPlaceholderRenderer,
      dropIndicatorRenderer,
      uploadOverlayRenderer,
      missingImageRenderer,
      imageControlsRenderer,
```

Add these to `buildSettings()`:

```ts
      uploadInteraction,
      uploadPlaceholderRenderer,
      dropIndicatorRenderer,
      uploadOverlayRenderer,
      missingImageRenderer,
      imageControlsRenderer,
```

Add them to the settings update dependency array.

- [ ] **Step 6: Extend controller settings**

In `src/controller.ts`, import the new type names from `./types`. Extend `ControllerSettings`:

```ts
  uploadInteraction: GalleyUploadInteraction;
  uploadPlaceholderRenderer?: UploadPlaceholderRenderer;
  dropIndicatorRenderer?: DropIndicatorRenderer;
  uploadOverlayRenderer?: UploadOverlayRenderer;
  missingImageRenderer?: MissingImageRenderer;
  imageControlsRenderer?: ImageControlsRenderer;
```

In `buildDynamicExtensions()`, add the image renderer fields to `renderContext`:

```ts
      missingImageRenderer: settings.missingImageRenderer,
      imageControlsRenderer: settings.imageControlsRenderer,
```

- [ ] **Step 7: Run focused type test**

Run:

```bash
npm test -- src/controller.test.ts -t "accepts upload and image UX renderer settings"
```

Expected: test passes.

- [ ] **Step 8: Commit**

```bash
git add src/types.ts src/components/GalleyEditor.tsx src/controller.ts src/controller.test.ts
git commit -m "feat: add hybrid asset ux public props"
```

## Task 2: Upload UI State Field

**Files:**
- Create: `src/upload-ui.ts`
- Create: `src/upload-ui.test.ts`
- Modify: `src/controller.ts`

- [ ] **Step 1: Write failing upload UI tests**

Create `src/upload-ui.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { createEditorView, destroyViews } from './test-utils/editor';
import {
  addUpload,
  clearDropIndicator,
  removeUpload,
  setDropIndicator,
  updateUpload,
  uploadUiExtension,
} from './upload-ui';
import type { GalleyUploadInfo } from './types';

const views: EditorView[] = [];

afterEach(() => {
  destroyViews(views);
});

function upload(overrides: Partial<GalleyUploadInfo> = {}): GalleyUploadInfo {
  return {
    id: 'galley-file-1',
    files: [new File(['x'], 'diagram.png', { type: 'image/png' })],
    source: 'drop',
    selection: { from: 6, to: 6, anchor: 6, head: 6 },
    phase: 'start',
    progress: 0,
    ...overrides,
  };
}

describe('upload UI extension', () => {
  it('renders an inline upload placeholder with progress', () => {
    const view = createEditorView({
      doc: 'hello world',
      extensions: [uploadUiExtension({ interaction: 'inline' })],
    });
    views.push(view);

    view.dispatch({ effects: addUpload.of({ upload: upload(), from: 6, to: 6 }) });
    view.dispatch({ effects: updateUpload.of(upload({ phase: 'progress', progress: 0.5, message: 'Uploading diagram.png' })) });

    const placeholder = view.dom.querySelector('.ge-upload-placeholder');
    expect(placeholder?.textContent).toContain('diagram.png');
    expect(placeholder?.textContent).toContain('Uploading diagram.png');
    expect(view.dom.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('50');
  });

  it('maps upload placeholder through document edits', () => {
    const view = createEditorView({
      doc: 'hello world',
      extensions: [uploadUiExtension({ interaction: 'inline' })],
    });
    views.push(view);

    view.dispatch({ effects: addUpload.of({ upload: upload(), from: 6, to: 6 }) });
    view.dispatch({ changes: { from: 0, insert: 'prefix ' } });
    view.dispatch({ effects: removeUpload.of('galley-file-1') });

    expect(view.state.doc.toString()).toBe('prefix hello world');
  });

  it('renders and clears a drop indicator', () => {
    const view = createEditorView({
      doc: 'hello\nworld',
      extensions: [uploadUiExtension({ interaction: 'inline' })],
    });
    views.push(view);

    view.dispatch({ effects: setDropIndicator.of({ pos: 6, lineFrom: 6, lineTo: 11 }) });
    expect(view.dom.querySelector('.ge-drop-indicator')).not.toBeNull();

    view.dispatch({ effects: clearDropIndicator.of(null) });
    expect(view.dom.querySelector('.ge-drop-indicator')).toBeNull();
  });
});
```

- [ ] **Step 2: Run failing tests**

Run:

```bash
npm test -- src/upload-ui.test.ts
```

Expected: FAIL because `src/upload-ui.ts` does not exist.

- [ ] **Step 3: Implement upload state and effects**

Create `src/upload-ui.ts` with these exports:

```ts
import {
  EditorState,
  StateEffect,
  StateField,
  Transaction,
  type Extension,
} from '@codemirror/state';
import {
  Decoration,
  EditorView,
  ViewPlugin,
  WidgetType,
  type DecorationSet,
  type ViewUpdate,
} from '@codemirror/view';
import type {
  DropIndicatorRenderer,
  GalleyUploadInfo,
  GalleyUploadInteraction,
  UploadOverlayRenderer,
  UploadPlaceholderRenderer,
} from './types';

interface UploadRange {
  upload: GalleyUploadInfo;
  from: number;
  to: number;
}

interface DropIndicatorState {
  pos: number;
  lineFrom: number;
  lineTo: number;
}

export const addUpload = StateEffect.define<UploadRange>();
export const updateUpload = StateEffect.define<GalleyUploadInfo>();
export const removeUpload = StateEffect.define<string>();
export const setDropIndicator = StateEffect.define<DropIndicatorState>();
export const clearDropIndicator = StateEffect.define<null>();

export function activeUploads(state: EditorState): GalleyUploadInfo[] {
  return state.field(uploadStateField, false)?.uploads.map((entry) => entry.upload) ?? [];
}
```

Add `UploadPlaceholderWidget`, `DropIndicatorWidget`, `UploadOverlayView`, and an internal state field. Use `Decoration.widget({ widget, side: 1 })` for zero-length placeholders and `Decoration.replace({ widget })` for non-empty ranges.

The default placeholder DOM must include:

```ts
wrapper.className = `ge-upload-placeholder ${upload.phase === 'error' ? 'ge-upload-error' : ''}`;
wrapper.setAttribute('role', 'status');
wrapper.setAttribute('aria-live', 'polite');
progress.setAttribute('role', 'progressbar');
progress.setAttribute('aria-valuemin', '0');
progress.setAttribute('aria-valuemax', '100');
progress.setAttribute('aria-valuenow', String(Math.round((upload.progress ?? 0) * 100)));
```

- [ ] **Step 4: Add locked transaction filter**

In `src/upload-ui.ts`, export:

```ts
export function uploadUiExtension(options: {
  interaction: GalleyUploadInteraction;
  placeholderRenderer?: UploadPlaceholderRenderer;
  dropIndicatorRenderer?: DropIndicatorRenderer;
  overlayRenderer?: UploadOverlayRenderer;
}): Extension[] {
  return [
    uploadStateField,
    uploadDecorations,
    options.interaction === 'locked'
      ? EditorState.transactionFilter.of((transaction) => {
        const hasUpload = activeUploads(transaction.startState).length > 0;
        if (!hasUpload || !transaction.docChanged) return transaction;
        if (transaction.effects.some((effect) =>
          effect.is(addUpload) || effect.is(updateUpload) || effect.is(removeUpload)
        )) return transaction;
        return [];
      })
      : [],
    options.interaction === 'overlay' || options.interaction === 'locked'
      ? uploadOverlayPlugin(options.overlayRenderer)
      : [],
  ];
}
```

Locked mode must render the same overlay as overlay mode, and additionally block user document edits while uploads are active.

- [ ] **Step 5: Run upload UI tests**

Run:

```bash
npm test -- src/upload-ui.test.ts
```

Expected: upload UI tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/upload-ui.ts src/upload-ui.test.ts
git commit -m "feat: add upload ui state"
```

## Task 3: Controller Upload UI Integration

**Files:**
- Modify: `src/controller.ts`
- Modify: `src/controller.test.ts`
- Test: `src/upload-ui.test.ts`

- [ ] **Step 1: Add failing controller tests**

In `src/controller.test.ts`, add:

```ts
it('shows upload placeholder during async file handling and replaces it with returned markdown', async () => {
  vi.useFakeTimers();
  let resolveUpload!: (value: string) => void;
  const uploadPromise = new Promise<string>((resolve) => {
    resolveUpload = resolve;
  });
  const file = new File(['image'], 'image.png', { type: 'image/png' });
  const controller = createController('hello\n', {
    onFiles: (input) => {
      input.report({ phase: 'progress', progress: 0.4, message: 'Uploading image.png' });
      return uploadPromise;
    },
  });

  controller.view.contentDOM.dispatchEvent(dropEvent(fileDataTransfer(file)));
  await nextMicrotask();

  expect(controller.view.dom.querySelector('.ge-upload-placeholder')?.textContent).toContain('Uploading image.png');

  resolveUpload('![image](image.png)');
  await nextMicrotask();
  await nextMicrotask();

  expect(controller.getContent()).toContain('![image](image.png)');
  expect(controller.view.dom.querySelector('.ge-upload-placeholder')).toBeNull();
});

it('prevents typing while uploadInteraction is locked', async () => {
  let resolveUpload!: (value: string) => void;
  const uploadPromise = new Promise<string>((resolve) => {
    resolveUpload = resolve;
  });
  const file = new File(['image'], 'image.png', { type: 'image/png' });
  const controller = createController('hello', {
    onFiles: () => uploadPromise,
  }, {
    uploadInteraction: 'locked',
  });

  controller.view.contentDOM.dispatchEvent(dropEvent(fileDataTransfer(file)));
  await nextMicrotask();
  controller.insertText(' blocked');
  expect(controller.getContent()).toBe('hello');

  resolveUpload('![image](image.png)');
  await nextMicrotask();
  await nextMicrotask();
  controller.insertText(' allowed');
  expect(controller.getContent()).toContain('allowed');
});
```

- [ ] **Step 2: Run failing controller tests**

Run:

```bash
npm test -- src/controller.test.ts -t "upload placeholder|uploadInteraction"
```

Expected: FAIL because controller does not dispatch upload UI effects.

- [ ] **Step 3: Wire upload UI extension into controller settings**

In `src/controller.ts`, import:

```ts
import {
  addUpload,
  clearDropIndicator,
  removeUpload,
  setDropIndicator,
  updateUpload,
  uploadUiExtension,
} from './upload-ui';
```

In `buildDynamicExtensions()`, add before plugin extensions:

```ts
      ...uploadUiExtension({
        interaction: settings.uploadInteraction,
        placeholderRenderer: settings.uploadPlaceholderRenderer,
        dropIndicatorRenderer: settings.dropIndicatorRenderer,
        overlayRenderer: settings.uploadOverlayRenderer,
      }),
```

- [ ] **Step 4: Dispatch drop indicator effects**

Update the `dragover`, `drop`, and add `dragleave` handlers in `buildStaticExtensions()`:

```ts
        dragover: (e) => {
          if (this.canEditDocument() && this.callbacks.onFiles && this.hasFileData(e.dataTransfer)) {
            e.preventDefault();
            const pos = this.view.posAtCoords({ x: e.clientX, y: e.clientY }) ?? this.view.state.selection.main.from;
            const line = this.view.state.doc.lineAt(pos);
            this.view.dispatch({ effects: setDropIndicator.of({ pos, lineFrom: line.from, lineTo: line.to }) });
          }
        },
        dragleave: () => {
          this.view.dispatch({ effects: clearDropIndicator.of(null) });
        },
        drop: (e) => {
          const files = this.filesFromDataTransfer(e.dataTransfer);
          if (!this.canEditDocument() || !this.callbacks.onFiles || files.length === 0) return;
          e.preventDefault();
          this.view.dispatch({ effects: clearDropIndicator.of(null) });
          const pos = this.view.posAtCoords({ x: e.clientX, y: e.clientY });
          const insertAt = pos ?? this.view.state.selection.main.from;
          void this.handleFiles(files, 'drop', e, insertAt, insertAt);
        },
```

- [ ] **Step 5: Dispatch upload lifecycle effects from `handleFiles()`**

In `handleFiles()`, after `input` is created:

```ts
const uploadInfo = (update: GalleyFileStatusUpdate): GalleyUploadInfo => ({
  id,
  files,
  source,
  selection,
  ...update,
});
```

Import `GalleyFileStatusUpdate` and `GalleyUploadInfo`.

Change `report` to dispatch update effects as well as callback:

```ts
const report: GalleyFileReporter = (update) => {
  const nextUpload = uploadInfo(update);
  this.view.dispatch({ effects: updateUpload.of(nextUpload) });
  try {
    this.callbacks.onFileStatus?.({ id, files, source, selection, ...update });
  } catch (error) {
    console.error('Galley file status handler failed', error);
  }
};
```

Before calling `report({ phase: 'start' ... })`, dispatch:

```ts
this.view.dispatch({
  effects: addUpload.of({
    upload: uploadInfo({ phase: 'start', progress: 0 }),
    from: pendingRange.from,
    to: pendingRange.to,
  }),
});
```

In the `finally` block:

```ts
this.view.dispatch({ effects: removeUpload.of(id) });
```

- [ ] **Step 6: Replace mapped placeholder range**

Stop using `pendingFileRanges` as a separate Set after Task 2 state can own mapping. Export `uploadRangeById(state, id)` from `src/upload-ui.ts`:

```ts
export function uploadRangeById(state: EditorState, id: string): { from: number; to: number } | null {
  const entry = state.field(uploadStateField, false)?.uploads.find((item) => item.upload.id === id);
  return entry ? { from: entry.from, to: entry.to } : null;
}
```

In `handleFiles()`, before insertion:

```ts
const mappedRange = uploadRangeById(this.view.state, id) ?? pendingRange;
this.insertFileHandlerMarkdown(result, mappedRange.from, mappedRange.to);
```

- [ ] **Step 7: Run focused tests**

Run:

```bash
npm test -- src/upload-ui.test.ts src/controller.test.ts
```

Expected: all tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/controller.ts src/controller.test.ts src/upload-ui.ts src/upload-ui.test.ts
git commit -m "feat: render upload progress in editor"
```

## Task 4: Default Upload CSS

**Files:**
- Modify: `src/galley-base.css`
- Test: `src/upload-ui.test.ts`

- [ ] **Step 1: Add CSS class assertion test**

In `src/upload-ui.test.ts`, extend the first test:

```ts
expect(placeholder?.classList.contains('ge-upload-placeholder')).toBe(true);
expect(view.dom.querySelector('.ge-upload-progress')).not.toBeNull();
```

- [ ] **Step 2: Add default CSS**

In `src/galley-base.css`, add:

```css
.ge-drop-indicator {
  background: var(--ge-color-focus-ring);
  border-radius: 999px;
  height: 2px;
  margin: 0.25rem 0;
  pointer-events: none;
}

.ge-upload-placeholder {
  align-items: center;
  background: var(--ge-color-surface-elevated);
  border: 1px dashed var(--ge-color-border);
  border-radius: var(--ge-radius-block);
  color: var(--ge-color-text-muted);
  display: inline-grid;
  gap: 0.5rem;
  grid-template-columns: auto minmax(0, 1fr);
  margin: 0.25rem 0;
  max-width: min(100%, 26rem);
  padding: 0.75rem;
  vertical-align: middle;
}

.ge-upload-progress {
  align-items: center;
  aspect-ratio: 1;
  border: 4px solid var(--ge-color-border);
  border-radius: 999px;
  display: inline-flex;
  font-size: 0.72rem;
  font-weight: 700;
  justify-content: center;
  min-width: 3rem;
}

.ge-upload-error {
  border-style: solid;
  border-color: var(--ge-color-danger, #dc2626);
}

.ge-upload-overlay {
  align-items: center;
  background: color-mix(in srgb, var(--ge-color-bg) 72%, transparent);
  display: flex;
  inset: 0;
  justify-content: center;
  pointer-events: none;
  position: absolute;
  z-index: 4;
}
```

- [ ] **Step 3: Run CSS-adjacent tests**

Run:

```bash
npm test -- src/upload-ui.test.ts
```

Expected: upload UI tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/galley-base.css src/upload-ui.test.ts
git commit -m "style: add upload progress defaults"
```

## Task 5: Missing Image Placeholder

**Files:**
- Modify: `src/types.ts`
- Modify: `src/plugins/images.ts`
- Modify: `src/plugins/images.test.ts`
- Modify: `src/galley-base.css`

- [ ] **Step 1: Add failing image tests**

In `src/plugins/images.test.ts`, add:

```ts
it('shows a missing image placeholder when the image fails to load', () => {
  const doc = '![Missing](missing.png)\n\nplain';
  const view = createEditorView({
    doc,
    selection: EditorSelection.cursor(doc.indexOf('plain')),
    extensions: imagesPlugin.extensions(resolveClassNames()),
  });
  views.push(view);

  const image = view.dom.querySelector('.ge-image-widget img') as HTMLImageElement;
  image.dispatchEvent(new Event('error'));

  const missing = view.dom.querySelector('.ge-image-missing');
  expect(missing?.textContent).toContain('Image unavailable');
  expect(missing?.textContent).toContain('Missing');
});

it('uses custom missingImageRenderer when default image fails', () => {
  const missingRenderer = vi.fn((image) => {
    const div = document.createElement('div');
    div.className = 'custom-missing';
    div.textContent = `${image.reason}:${image.alt}`;
    return div;
  });
  const doc = '![Missing](missing.png)\n\nplain';
  const view = createEditorView({
    doc,
    selection: EditorSelection.cursor(doc.indexOf('plain')),
    extensions: imagesPlugin.extensions(resolveClassNames(), {
      theme: 'light',
      missingImageRenderer: missingRenderer,
    }),
  });
  views.push(view);

  const image = view.dom.querySelector('.ge-image-widget img') as HTMLImageElement;
  image.dispatchEvent(new Event('error'));

  expect(view.dom.querySelector('.custom-missing')?.textContent).toBe('error:Missing');
  expect(missingRenderer).toHaveBeenCalledWith(expect.objectContaining({ reason: 'error' }));
});
```

- [ ] **Step 2: Run failing image tests**

Run:

```bash
npm test -- src/plugins/images.test.ts -t "missing image"
```

Expected: FAIL because images do not swap to missing placeholders.

- [ ] **Step 3: Extend image widget for missing fallback**

In `src/plugins/images.ts`, update imports to include `MissingImageRenderer`.

Change `ImageWidget` constructor to accept `missingRenderer?: MissingImageRenderer`.

In `toDOM()`, wrap default rendered image and attach an error listener:

```ts
const showMissing = (container: HTMLElement) => {
  container.replaceChildren(defaultMissingImageRenderer({ ...this.image, reason: this.image.url ? 'error' : 'empty-url' }));
};

const rendered = this.renderer(this.image);
const wrapper = document.createElement('span');
wrapper.className = `${this.imageClass} ge-image-widget`;
if (!rendered) {
  wrapper.textContent = this.image.alt;
  return wrapper;
}
rendered.addEventListener('error', () => {
  const missing = this.missingRenderer?.({ ...this.image, reason: 'error' })
    ?? defaultMissingImageRenderer({ ...this.image, reason: 'error' });
  wrapper.replaceChildren(missing);
}, { once: true });
wrapper.append(rendered);
return wrapper;
```

Use `rendered.querySelectorAll('img')` as well as `rendered instanceof HTMLImageElement` so custom figure renderers can trigger fallback.

- [ ] **Step 4: Add missing image CSS**

In `src/galley-base.css`, add:

```css
.ge-image-missing {
  align-items: center;
  background: var(--ge-color-surface);
  border: 1px solid var(--ge-color-border);
  border-radius: var(--ge-radius-block);
  color: var(--ge-color-text-muted);
  display: inline-grid;
  gap: 0.25rem;
  min-height: 5rem;
  min-width: 8rem;
  padding: 0.75rem;
  text-align: center;
}

.ge-image-missing-label {
  color: var(--ge-color-text);
  font-weight: 700;
}
```

- [ ] **Step 5: Run image tests**

Run:

```bash
npm test -- src/plugins/images.test.ts
```

Expected: all image tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/plugins/images.ts src/plugins/images.test.ts src/galley-base.css
git commit -m "feat: show missing image placeholders"
```

## Task 6: Visual Image Selection And Source Reveal

**Files:**
- Modify: `src/plugins/images.ts`
- Modify: `src/plugins/images.test.ts`
- Modify: `src/galley-base.css`

- [ ] **Step 1: Add failing click behavior tests**

Add to `src/plugins/images.test.ts`:

```ts
it('selects image visually on click without revealing markdown', () => {
  const doc = '![Galley mark](assets/galley.png)\n\nplain';
  const view = createEditorView({
    doc,
    selection: EditorSelection.cursor(doc.indexOf('plain')),
    extensions: imagesPlugin.extensions(resolveClassNames()),
  });
  views.push(view);

  const widget = view.dom.querySelector('.ge-image-widget') as HTMLElement;
  widget.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
  widget.dispatchEvent(new MouseEvent('click', { bubbles: true }));

  expect(view.dom.querySelector('.ge-image-selected')).not.toBeNull();
  expect(lineElement(view, 1).textContent).not.toBe('![Galley mark](assets/galley.png)');
});

it('reveals raw image markdown on ctrl click', () => {
  const doc = '![Galley mark](assets/galley.png)\n\nplain';
  const view = createEditorView({
    doc,
    selection: EditorSelection.cursor(doc.indexOf('plain')),
    extensions: imagesPlugin.extensions(resolveClassNames()),
  });
  views.push(view);

  const widget = view.dom.querySelector('.ge-image-widget') as HTMLElement;
  widget.dispatchEvent(new MouseEvent('click', { bubbles: true, ctrlKey: true }));

  expect(lineElement(view, 1).textContent).toBe('![Galley mark](assets/galley.png)');
});
```

- [ ] **Step 2: Run failing tests**

Run:

```bash
npm test -- src/plugins/images.test.ts -t "selects image visually|ctrl click"
```

Expected: FAIL because click still reveals through selection intersection behavior.

- [ ] **Step 3: Add image selection state**

In `src/plugins/images.ts`, add:

```ts
import { StateEffect, StateField } from '@codemirror/state';

const selectImage = StateEffect.define<{ from: number; to: number } | null>();

const selectedImageField = StateField.define<{ from: number; to: number } | null>({
  create: () => null,
  update(value, transaction) {
    for (const effect of transaction.effects) {
      if (effect.is(selectImage)) return effect.value;
    }
    if (transaction.docChanged && value) {
      return {
        from: transaction.changes.mapPos(value.from, 1),
        to: transaction.changes.mapPos(value.to, -1),
      };
    }
    return value;
  },
});
```

Have `imagesPlugin.extensions()` return `[selectedImageField, widgetExt]`.

- [ ] **Step 4: Change reveal strategy**

Replace the current image reveal strategy with:

```ts
getRevealStrategy: (node, state) => {
  if (preview) return false;
  if (state.field(selectedImageField, false)) return false;
  return imageRangeIntersectsSelection(state, node.from, imageRangeTo(state, node.to));
},
```

This keeps selected visual images decorated. Ctrl/Cmd-click will reveal source by clearing the selected image and setting the text selection inside the source range.

- [ ] **Step 5: Add click handlers in `ImageWidget`**

In `ImageWidget.toDOM()`, add:

```ts
wrapper.addEventListener('mousedown', (event) => {
  event.preventDefault();
});
wrapper.addEventListener('click', (event) => {
  if (event.metaKey || event.ctrlKey) {
    this.view.dispatch({
      selection: { anchor: this.image.from + 2 },
      effects: selectImage.of(null),
      scrollIntoView: true,
    });
    return;
  }
  this.view.dispatch({
    effects: selectImage.of({ from: this.image.from, to: this.image.to }),
  });
});
```

Replace the images plugin internals with a local `ViewPlugin` that builds decorations from `view.visibleRanges`, because `ImageWidget` now needs the live `EditorView` for click dispatch and metadata updates. Keep `imagesPlugin.extensions(resolveClassNames(), renderContext)` as the external plugin API.

- [ ] **Step 6: Add selected image CSS**

```css
.ge-image-selected {
  outline: 2px solid var(--ge-color-focus-ring);
  outline-offset: 3px;
}
```

- [ ] **Step 7: Run image tests**

Run:

```bash
npm test -- src/plugins/images.test.ts
```

Expected: all image tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/plugins/images.ts src/plugins/images.test.ts src/galley-base.css
git commit -m "feat: select images visually"
```

## Task 7: Default Resize Handles

**Files:**
- Create: `src/plugins/image-resize.ts`
- Create: `src/plugins/image-resize.test.ts`
- Modify: `src/plugins/images.ts`
- Modify: `src/galley-base.css`

- [ ] **Step 1: Add image resize helper tests**

Create `src/plugins/image-resize.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { resizeImageMetadata } from './image-resize';
import type { GalleyImageInfo } from '../types';

const image: GalleyImageInfo = {
  alt: 'Diagram',
  url: 'diagram.png',
  width: 640,
  height: 360,
  raw: '![Diagram](diagram.png){width=640 height=360}',
  from: 0,
  to: 43,
};

describe('resizeImageMetadata', () => {
  it('preserves aspect ratio by default', () => {
    expect(resizeImageMetadata(image, { corner: 'se', deltaX: 160, deltaY: 0, free: false })).toEqual({
      width: 800,
      height: 450,
    });
  });

  it('allows free resize with shift', () => {
    expect(resizeImageMetadata(image, { corner: 'se', deltaX: 160, deltaY: 40, free: true })).toEqual({
      width: 800,
      height: 400,
    });
  });

  it('inverts deltas for north-west handles', () => {
    expect(resizeImageMetadata(image, { corner: 'nw', deltaX: -160, deltaY: -90, free: true })).toEqual({
      width: 800,
      height: 450,
    });
  });

  it('clamps to minimum size', () => {
    expect(resizeImageMetadata(image, { corner: 'se', deltaX: -1000, deltaY: -1000, free: true })).toEqual({
      width: 32,
      height: 32,
    });
  });
});
```

- [ ] **Step 2: Run failing tests**

Run:

```bash
npm test -- src/plugins/image-resize.test.ts
```

Expected: FAIL because `image-resize.ts` does not exist.

- [ ] **Step 3: Implement resize helper**

Create `src/plugins/image-resize.ts`:

```ts
import type { GalleyImageInfo, GalleyImageMetadataInput } from '../types';

export type ResizeCorner = 'nw' | 'ne' | 'sw' | 'se';

export interface ResizeInput {
  corner: ResizeCorner;
  deltaX: number;
  deltaY: number;
  free: boolean;
  minSize?: number;
}

export function resizeImageMetadata(
  image: GalleyImageInfo,
  input: ResizeInput,
): GalleyImageMetadataInput {
  const min = input.minSize ?? 32;
  const currentWidth = image.width ?? 320;
  const currentHeight = image.height ?? 180;
  const widthDelta = input.corner === 'nw' || input.corner === 'sw' ? -input.deltaX : input.deltaX;
  const heightDelta = input.corner === 'nw' || input.corner === 'ne' ? -input.deltaY : input.deltaY;
  const width = Math.max(min, Math.round(currentWidth + widthDelta));
  if (input.free) {
    return {
      width,
      height: Math.max(min, Math.round(currentHeight + heightDelta)),
    };
  }

  const ratio = currentHeight / currentWidth;
  return {
    width,
    height: Math.max(min, Math.round(width * ratio)),
  };
}
```

- [ ] **Step 4: Add default resize handles to selected image DOM**

In `src/plugins/images.ts`, when an image is selected, append four handles:

```ts
for (const corner of ['nw', 'ne', 'sw', 'se'] as const) {
  const handle = document.createElement('button');
  handle.type = 'button';
  handle.className = `ge-image-resize-handle ge-image-resize-${corner}`;
  handle.setAttribute('aria-label', `Resize image ${corner}`);
  wrapper.append(handle);
}
```

Handle pointer drag for all four handles. Track `pointerdown` client coordinates and the handle corner; on `pointerup`, call:

```ts
updateImageMetadata(this.view, resizeImageMetadata(this.image, {
  corner,
  deltaX,
  deltaY,
  free: event.shiftKey,
}));
```

- [ ] **Step 5: Add CSS for handles**

```css
.ge-image-resize-handle {
  background: var(--ge-color-bg);
  border: 1px solid var(--ge-color-focus-ring);
  border-radius: 999px;
  height: 0.75rem;
  position: absolute;
  width: 0.75rem;
}

.ge-image-resize-se {
  bottom: -0.4rem;
  cursor: nwse-resize;
  right: -0.4rem;
}
```

Add corresponding corner placement classes for `nw`, `ne`, and `sw`.

- [ ] **Step 6: Run resize and image tests**

Run:

```bash
npm test -- src/plugins/image-resize.test.ts src/plugins/images.test.ts
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/plugins/image-resize.ts src/plugins/image-resize.test.ts src/plugins/images.ts src/galley-base.css
git commit -m "feat: add image resize handles"
```

## Task 8: Storybook And Docs

**Files:**
- Modify: `src/components/GalleyEditor.stories.tsx`
- Modify: `docs/api-reference.md`
- Modify: `docs/plugins.md`
- Modify: `docs-site/src/content/docs/reference/api.md`
- Modify: `docs-site/src/content/docs/guides/complete-guide.md`
- Modify: `docs-site/src/content/docs/guides/plugins-renderers.md`
- Modify: `docs-site/public/llms/complete-guide.md`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Update Storybook stories**

Add stories:

```ts
export const InlineUploadPlaceholder: Story = { render: InlineUploadPlaceholderStory };
export const LockedUploadOverlay: Story = { render: LockedUploadOverlayStory };
export const CustomUploadPlaceholder: Story = { render: CustomUploadPlaceholderStory };
export const MissingImagePlaceholder: Story = { render: MissingImagePlaceholderStory };
export const ImageResizeHandles: Story = { render: ImageResizeHandlesStory };
export const ImageSourceReveal: Story = { render: ImageSourceRevealStory };
```

Reuse the existing `SlowDropUploadProgressStory` upload handler and set:

```tsx
<GalleyEditor uploadInteraction="locked" uploadOverlayRenderer={customOverlay} />
```

for the locked overlay story.

- [ ] **Step 2: Update API docs**

In `docs/api-reference.md` and `docs-site/src/content/docs/reference/api.md`, document:

```ts
uploadInteraction?: 'inline' | 'overlay' | 'locked';
uploadPlaceholderRenderer?: UploadPlaceholderRenderer;
dropIndicatorRenderer?: DropIndicatorRenderer;
uploadOverlayRenderer?: UploadOverlayRenderer;
missingImageRenderer?: MissingImageRenderer;
imageControlsRenderer?: ImageControlsRenderer;
```

Include the exact statement:

> `onFiles` owns upload behavior; Galley owns default upload UI state and calls `input.report()` updates into both `onFileStatus` and the active placeholder renderer.

- [ ] **Step 3: Update guide docs**

In the complete guide and plugin/renderer guide, add a short example:

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

- [ ] **Step 4: Update changelog**

Under `[Unreleased]`, add:

```md
### Added
- Hybrid upload UX with inline progress placeholders, drop indicators, optional overlay/locked mode, missing-image placeholders, and visual image resize handles.
```

- [ ] **Step 5: Run docs and Storybook builds**

Run:

```bash
npm run docs:build
npm run build-storybook
```

Expected: both commands exit 0. Storybook may print existing chunk-size warnings.

- [ ] **Step 6: Commit**

```bash
git add src/components/GalleyEditor.stories.tsx docs docs-site CHANGELOG.md
git commit -m "docs: document hybrid asset ux"
```

## Task 9: Final Verification

**Files:**
- No planned source edits unless verification fails.

- [ ] **Step 1: Run full verification**

Run:

```bash
npm test
npm run lint
npm run build
npm run build:lib
npm run build-storybook
npm run docs:build
git diff --check
```

Expected:

- `npm test`: all test files pass.
- `npm run lint`: exit 0.
- `npm run build`: exit 0, existing Vite chunk-size warning is acceptable.
- `npm run build:lib`: exit 0, existing API Extractor TypeScript-version warning is acceptable.
- `npm run build-storybook`: exit 0, existing Vite chunk-size warning is acceptable.
- `npm run docs:build`: exit 0.
- `git diff --check`: no output, exit 0.

- [ ] **Step 2: Review public export surface**

Run:

```bash
rg -n "UploadPlaceholderRenderer|DropIndicatorRenderer|UploadOverlayRenderer|MissingImageRenderer|ImageControlsRenderer|GalleyUploadInfo|GalleyUploadInteraction" src/components/index.ts src/types.ts
```

Expected: types are exported through `src/components/index.ts` because it re-exports from `src/types.ts`.

- [ ] **Step 3: Commit any verification-only fixes**

If Step 1 or Step 2 required fixes:

```bash
git add src docs docs-site CHANGELOG.md
git commit -m "fix: stabilize hybrid asset ux"
```

If no fixes were required, do not create an empty commit.
