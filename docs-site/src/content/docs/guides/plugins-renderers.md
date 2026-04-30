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

    return {
      html,
      className: `language-${language ?? 'text'}`,
    };
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
  imageRenderer={({ alt, src, title }) => (
    <figure className="asset-preview">
      <img src={src} alt={alt} title={title} />
      {title ? <figcaption>{title}</figcaption> : null}
    </figure>
  )}
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

File-drop upload hooks are planned for the next editing UX pass. The intended shape is consumer-owned: Galley will notify your app about dropped files, wait for the app to return a Markdown link or image, then insert that Markdown into the document.
