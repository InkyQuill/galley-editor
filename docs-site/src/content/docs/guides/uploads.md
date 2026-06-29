---
title: File Uploads
description: Handle pasted and dropped files with app-owned upload logic and Galley's editor UI.
sidebar:
  order: 40
---

Galley does not upload files itself. It detects paste and drop operations, gives your app the files and editor selection, and inserts the Markdown returned by your handler.

## Handle Files

```tsx
<GalleyEditor
  onFiles={async (input) => {
    input.report({ phase: 'progress', progress: 0.2, message: 'Uploading' });

    const markdown = await Promise.all(
      input.files.map(async (file) => {
        const url = await uploadFile(file);
        return `![${file.name}](${url})`;
      }),
    );

    input.report({ phase: 'progress', progress: 0.9, message: 'Finishing' });
    return markdown;
  }}
/>
```

Return values:

| Return | Behavior |
| --- | --- |
| `string` | Insert the string at the original paste/drop selection. |
| `string[]` | Join with newlines and insert. |
| `null` or `false` | Do not insert anything. Use this when your app handled the files separately. |

## Input Shape

```ts
interface GalleyFileInput {
  id: string;
  files: File[];
  source: 'paste' | 'drop';
  event: ClipboardEvent | DragEvent;
  view: EditorView;
  selection: { from: number; to: number; anchor: number; head: number };
  report(update: GalleyFileStatusUpdate): void;
}
```

`selection` is captured when the paste or drop happens, so async uploads can finish after the user moves the cursor.

## Progress and Errors

Galley emits `start` before calling `onFiles`, `complete` after successful insertion, and `error` when the handler rejects.

```tsx
<GalleyEditor
  onFileStatus={(status) => {
    console.log(status.id, status.phase, status.progress, status.message);
  }}
  onFileError={(error, input) => {
    reportUploadError(error, input.files);
  }}
/>
```

Use `input.report()` inside your handler for progress updates. Galley forwards those updates to `onFileStatus` and active upload renderers.

## Upload UI Modes

```tsx
<GalleyEditor uploadInteraction="inline" />
<GalleyEditor uploadInteraction="overlay" />
<GalleyEditor uploadInteraction="locked" />
```

| Mode | Behavior |
| --- | --- |
| `inline` | Shows editor-resident placeholders and drop indicators. |
| `overlay` | Adds an aggregate overlay while uploads are active. |
| `locked` | Shows the overlay and blocks document edits until uploads finish. |

## Custom Upload Renderers

Renderers return an `HTMLElement` or `null`.

```tsx
<GalleyEditor
  uploadPlaceholderRenderer={(upload) => {
    const node = document.createElement('span');
    node.textContent = upload.message ?? 'Uploading...';
    return node;
  }}
  uploadOverlayRenderer={(uploads) => {
    const node = document.createElement('div');
    node.textContent = `${uploads.length} upload in progress`;
    return node;
  }}
/>
```

Keep custom upload UI concise and non-blocking. If uploads can fail, show a recovery path in your surrounding application UI.
