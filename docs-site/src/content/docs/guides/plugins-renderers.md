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
  imageRenderer={({ alt, url, title }) => {
    const figure = document.createElement('figure');
    figure.className = 'asset-preview';

    const image = document.createElement('img');
    image.src = url;
    image.alt = alt;
    if (title) image.title = title;

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

SVG images are supported by the default renderer when the source URL is allowed by the browser and the consuming app's content security policy.

## Custom Plugins

Use `plugins` for additional Markdown rendering behavior:

```tsx
import { makeInlinePlugin } from '@inky/galley-editor';

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

Galley v0.7 exposes raw paste events and CodeMirror extension hooks. It does not yet ship a first-class `onFiles` prop, so upload behavior stays consumer-owned:

```tsx
<GalleyEditor
  onPaste={(event, view) => {
    const files = Array.from(event.clipboardData?.files ?? []);
    if (files.length === 0) return;

    event.preventDefault();
    void Promise.all(files.map(uploadFile)).then((markdownItems) => {
      view.dispatch(view.state.replaceSelection(markdownItems.join('\n')));
    });
  }}
/>
```

For drag-and-drop, register `EditorView.domEventHandlers()` through the `extensions` prop. See the [Complete Guide](../complete-guide/#register-and-track-file-uploads) for a full upload tracking example.
