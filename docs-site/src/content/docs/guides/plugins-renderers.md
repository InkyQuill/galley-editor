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

## Image Rendering

Use `imageRenderer` when images should render as product thumbnails, responsive figures, lazy-loaded media, or another DOM structure owned by your app.

```tsx
<GalleyEditor
  imageRenderer={({ alt, title, url, width, height }) => {
    const image = document.createElement('img');
    image.src = url;
    image.alt = alt;
    if (title) image.title = title;
    image.loading = 'lazy';
    image.style.display = 'block';
    image.style.maxWidth = '100%';
    if (width) image.style.width = `${width}px`;
    if (height) image.style.height = `${height}px`;
    return image;
  }}
/>
```

Use `missingImageRenderer` for broken or empty images and `imageControlsRenderer` for selected-image controls. This is the pattern to build an image metadata editor, resize buttons, or a "show Markdown source" action without replacing the whole editor.

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

The image metadata commands work well with those controls:

```tsx
<GalleyEditor
  imageControlsRenderer={({ image, update, clearDimensions, revealSource }) => {
    const node = document.createElement('div');

    const small = document.createElement('button');
    small.type = 'button';
    small.textContent = '320px';
    small.onclick = () => update({ width: 320, height: 180 });

    const clear = document.createElement('button');
    clear.type = 'button';
    clear.textContent = 'Clear size';
    clear.onclick = () => clearDimensions();

    const source = document.createElement('button');
    source.type = 'button';
    source.textContent = 'Source';
    source.onclick = () => revealSource();

    node.append(small, clear, source);
    return node;
  }}
/>
```

When controls run editor commands from inside a widget, prevent the button mouse-down from taking focus if the current selection matters.

## Table Editor Block Controls

Galley renders GitHub-flavored Markdown tables as an editable table block in live mode. Users can edit cells directly, use the block controls for rows, columns, and alignment, or Cmd/Ctrl-click the block to reveal the Markdown source. In read-only or preview-oriented screens, keep `editable={false}` so the table renders without editing affordances.

Use `tableControlIcons` to replace the visible labels or icons in the rendered table editor controls. The controls keep their built-in accessible `aria-label` values, so the custom icon only changes what is shown inside the button.

Each entry is keyed by a `GalleyTableControlIconName`:

| Key | Control |
| --- | --- |
| `insertRowBefore` | Add row before the selected row. |
| `insertRowAfter` | Add row after the selected row. |
| `insertColumnBefore` | Add column before the selected column. |
| `insertColumnAfter` | Add column after the selected column. |
| `deleteRow` | Delete the selected body row. |
| `deleteColumn` | Delete the selected column. |
| `alignLeft` | Align the selected column left. |
| `alignCenter` | Align the selected column center. |
| `alignRight` | Align the selected column right. |
| `clearAlignment` | Clear selected-column alignment. |
| `editSource` | Reveal the Markdown table source. |

Values can be strings, `HTMLElement`s, or renderer functions. Renderer functions receive `{ name, label, view }` and may return a string, an `HTMLElement`, or `null`. Returning `null`, omitting a key, or throwing from a renderer falls back to the built-in text for that control.

Use icon renderers for real products and short text only when it is clearer than an icon:

```tsx
import { renderToStaticMarkup } from 'react-dom/server';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Code2,
  Plus,
  Trash2,
} from 'lucide-react';

function icon(node: React.ReactElement, label: string) {
  const template = document.createElement('template');
  template.innerHTML = renderToStaticMarkup(node);
  const svg = template.content.firstElementChild as HTMLElement | null;
  if (!svg) return null;
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('title', label);
  return svg;
}

<GalleyEditor
  tableControlIcons={{
    insertRowAfter: ({ label }) => icon(<Plus size={14} />, label),
    deleteColumn: ({ label }) => icon(<Trash2 size={14} />, label),
    alignLeft: ({ label }) => icon(<AlignLeft size={14} />, label),
    alignCenter: ({ label }) => icon(<AlignCenter size={14} />, label),
    alignRight: ({ label }) => icon(<AlignRight size={14} />, label),
    editSource: ({ label }) => icon(<Code2 size={14} />, label),
    clearAlignment: 'clear',
  }}
/>
```

When you create icons in React, keep function renderers stable with `useMemo` or `useCallback` if they close over component state. Recreated but equivalent `HTMLElement` values are compared structurally, but function values are compared by reference so Galley can detect changed closures.

```tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { Code2, Plus } from 'lucide-react';

function icon(node: React.ReactElement, label: string) {
  const template = document.createElement('template');
  template.innerHTML = renderToStaticMarkup(node);
  const svg = template.content.firstElementChild as HTMLElement | null;
  if (!svg) return null;
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('title', label);
  return svg;
}

const tableControlIcons = useMemo(
  () => ({
    insertRowBefore: ({ label }) => icon(<Plus size={14} />, label),
    insertRowAfter: ({ label }) => icon(<Plus size={14} />, label),
    editSource: ({ label }) => icon(<Code2 size={14} />, label),
    clearAlignment: 'clear',
  }),
  [],
);

<GalleyEditor tableControlIcons={tableControlIcons} />;
```

Use top-level toolbar icons for the editor chrome and `tableControlIcons` for the table block controls. They are separate surfaces: a custom Bold icon belongs in `toolbar.icons`, while custom insert-row and alignment icons belong in `tableControlIcons`.

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
