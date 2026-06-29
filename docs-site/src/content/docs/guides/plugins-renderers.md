---
title: Plugins and Renderers
description: Extend Galley's Markdown rendering with renderer hooks, built-in plugins, and custom CodeMirror extensions.
sidebar:
  order: 35
---

Most integrations should start with renderer hooks. Reach for custom plugins when you need to decorate Markdown syntax nodes directly.

## Built-In Plugins

Galley includes plugins for headings, emphasis, inline code, fenced code, blockquotes, links, images, lists, checkboxes, dividers, and tables.

```tsx
import { BUILT_IN_PLUGINS } from '@inkyquill/galley-editor';
```

Disable a built-in by id:

```tsx
<GalleyEditor disabledPlugins={['ge:tables']} />
```

Add plugins alongside the built-ins:

```tsx
<GalleyEditor plugins={[myPlugin]} />
```

## Renderer Hooks

Use renderer props for common customization points:

```tsx
<GalleyEditor
  codeHighlighter={({ code, language, theme }) => {
    return highlight(code, language, theme);
  }}
  imageRenderer={(image) => {
    const node = document.createElement('img');
    node.src = image.url;
    node.alt = image.alt;
    return node;
  }}
  onLinkClick={(url, event) => {
    event.preventDefault();
    openInApp(url);
    return true;
  }}
/>
```

`onLinkClick` runs for Cmd/Ctrl-click link activation. Return `true` to suppress Galley's default `window.open` behavior.

## Image Controls

Use `missingImageRenderer` for broken or empty images and `imageControlsRenderer` for selected-image controls:

```tsx
<GalleyEditor
  missingImageRenderer={(image) => {
    const node = document.createElement('span');
    node.textContent = image.reason === 'empty-url' ? 'Missing URL' : 'Image failed';
    return node;
  }}
  imageControlsRenderer={({ image, update, clearDimensions, revealSource }) => {
    const node = document.createElement('button');
    node.type = 'button';
    node.textContent = `${image.width ?? 'auto'} x ${image.height ?? 'auto'}`;
    node.onclick = () => update({ width: 640, height: 360 });
    node.oncontextmenu = (event) => {
      event.preventDefault();
      clearDimensions();
      revealSource();
    };
    return node;
  }}
/>
```

## Custom Plugins

A `GalleyPlugin` is a stable id plus a function that returns CodeMirror extensions:

```ts
import type { GalleyPlugin } from '@inkyquill/galley-editor';

export const myPlugin: GalleyPlugin = {
  id: 'app:mentions',
  extensions(classNames, context) {
    return [myCodeMirrorExtension(classNames, context)];
  },
};
```

For syntax-driven decorations, use the exported factories:

| Factory | Use for |
| --- | --- |
| `makeInlinePlugin(spec)` | Viewport-only inline marks and widgets. |
| `makeBlockPlugin(spec)` | Multi-line or block decorations that need full-document iteration. |

The plugin spec receives Lezer syntax nodes and the current editor state. Return a CodeMirror `Decoration`, `WidgetType`, or `null`.

## Reveal Strategy

Plugins control when rendered decorations hide and raw Markdown reappears:

| Strategy | Behavior |
| --- | --- |
| `line` | Reveal when the cursor is on the same line. |
| `active` | Reveal when the selection intersects the node or its parent. |
| `select` | Reveal only when selection overlaps the node. |
| `boolean` | Provide your own decision. |

Use the narrowest strategy that keeps editing predictable.
