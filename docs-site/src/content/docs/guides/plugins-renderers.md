---
title: Plugins and Renderers
description: Extend Galley rendering with plugins, code highlighters, image renderers, and markdown extensions.
---

Galley keeps Markdown as the source document and renders visual helpers through CodeMirror extensions. You can start with the built-ins and add deeper behavior only when your product needs it.

## Built-in Plugins

Built-ins cover common Markdown structures:

- Headings
- Emphasis and strikethrough
- Inline code
- Fenced code blocks
- Links and images
- Lists and checkboxes
- Blockquotes
- Dividers
- Tables
- Reference links

Disable a built-in plugin by ID:

```tsx
<GalleyEditor disabledPlugins={['tables']} />
```

## Code Highlighters

Galley does not bundle a syntax highlighter. That keeps the package lighter and lets each app choose the highlighter it already uses, such as Highlight.js, Shiki, Prism, or an internal service.

```tsx
<GalleyEditor
  codeHighlighter={({ code, language }) => {
    const html = highlightWithYourLibrary(code, language);

    return html;
  }}
/>
```

The inactive code-fence widget still provides the language hint and copy button. Clicking inside the code body returns to the editable Markdown fence, so editing stays direct.

## Images

Galley renders Markdown images with safe built-in `<img>` widgets by default:

```md
![Galley mark](/assets/galley.png)
```

Use `imageRenderer` when your app needs signed URLs, asset lookup, captions, resize handles, or upload metadata.

```tsx
<GalleyEditor
  imageRenderer={({ alt, url, title, width, height, from, to }) => {
    const figure = document.createElement('figure');
    figure.className = 'asset-preview';

    const image = document.createElement('img');
    image.src = url;
    image.alt = alt;
    if (title) image.title = title;
    if (width) image.width = width;
    if (height) image.height = height;

    figure.dataset.from = String(from);
    figure.dataset.to = String(to);
    figure.append(image);
    if (title) {
      const caption = document.createElement('figcaption');
      caption.textContent = title;
      figure.append(caption);
    }

    return figure;
  }}
/>
```

The renderer receives `GalleyImageInfo`:

```ts
type GalleyImageInfo = {
  alt: string;
  url: string;
  title?: string;
  width?: number;
  height?: number;
  attrs?: string[];
  raw: string;
  from: number;
  to: number;
};
```

Image metadata is encoded directly in Markdown:

```md
![Alt](image.png "Title"){width=640 height=360}
```

Use the `updateImageMetadata` and `clearImageDimensions` commands from a custom renderer or asset inspector to update the selected image.

SVG images are supported by the default renderer when the source URL is allowed by the browser and the consuming app's content security policy.

## Custom Plugins

Use `plugins` for additional Markdown rendering behavior:

```tsx
import { makeInlinePlugin } from '@inkyquill/galley-editor';

const mentionPlugin = makeInlinePlugin({
  id: 'mentions',
  // Plugin spec omitted for brevity.
});

<GalleyEditor plugins={[mentionPlugin]} />;
```

Use raw CodeMirror extensions for behavior that is not tied to Galley's Markdown rendering pipeline:

```tsx
<GalleyEditor extensions={[myCodeMirrorExtension]} />
```

## Uploads and Drops

Galley keeps uploads consumer-owned. When `onFiles` is provided, paste/drop operations that contain files call your handler with the files, source, original event, editor view, selection snapshot, and a `report()` function.

```tsx
const escapeMarkdownAlt = (value: string) =>
  value.replace(/[\n\r[\]\\]/g, ' ').trim();

const fakeUpload = async (file: File) =>
  `![${escapeMarkdownAlt(file.name)}](/uploads/${encodeURIComponent(file.name)})`;

<GalleyEditor
  onFiles={async (input) => {
    input.report({ phase: 'progress', progress: 0.25, message: 'Uploading...' });
    const markdown = await Promise.all(input.files.map(fakeUpload));
    input.report({ phase: 'progress', progress: 0.9, message: 'Inserting markdown...' });
    return markdown;
  }}
  onFileStatus={(status) => {
    renderUploadRow(status.id, status.phase, status.progress, status.message);
  }}
  onFileError={(error, input) => {
    showUploadError(input.files, error);
  }}
/>
```

Returned strings are inserted at the paste selection or drop position. Return `false` or `null` when your app handled the files without inserting markdown.

`input.report()` is the progress channel for long uploads. Galley forwards those updates to `onFileStatus` and also emits `start`, `complete`, and `error` phases around the handler call.

Use an inline placeholder renderer when the progress UI should stay inside the editor document:

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
