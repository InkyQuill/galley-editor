---
title: Storybook
description: Explore interactive examples for Galley Editor.
sidebar:
  order: 50
---

Run Storybook locally from the repository root:

```bash
npm run storybook
```

The published Storybook lives beside the docs site:

<https://inkyquill.github.io/galley-editor/storybook/>

Use it to inspect editor modes, toolbar slots, command behavior, upload flows, image controls, and styling variants. The docs explain the API; Storybook is the fastest way to check how a behavior feels in the browser.

## Docs Coverage

Storybook stories should mirror documented use cases. When adding a story that demonstrates a public integration pattern, update the matching guide first or in the same change.

| Storybook use case | Text docs |
| --- | --- |
| Default editor, controlled value, read-only, placeholder, autosize, fill container | [Quick Start](/galley-editor/guides/quick-start/) and [API Reference](/galley-editor/reference/api/) |
| Built-in toolbar, custom toolbar icons, toolbar/footer slots, custom app toolbar | [Customization](/galley-editor/guides/customization/) and [Commands](/galley-editor/guides/commands/) |
| Visual table editing and rendered table block icons | [Plugins and Renderers](/galley-editor/guides/plugins-renderers/#table-editor-block-controls) |
| Image rendering, missing images, image controls, metadata, resize actions, source reveal | [Plugins and Renderers](/galley-editor/guides/plugins-renderers/#image-rendering) |
| Paste/drop uploads, inline placeholders, locked overlays, slow upload progress | [File Uploads](/galley-editor/guides/uploads/) |
| Dark mode, CSS variables, Tailwind token mapping, theme selector, frosted surfaces | [Customization](/galley-editor/guides/customization/) |
| Event handlers, selection tracking, paste handling, runtime extensions, error boundaries | [API Reference](/galley-editor/reference/api/) |
| Disabled plugins, custom class names, custom plugins, custom extensions | [Plugins and Renderers](/galley-editor/guides/plugins-renderers/) |
