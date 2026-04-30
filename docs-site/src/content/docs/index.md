---
title: Galley Editor
description: Galley Editor is a live-preview Markdown editor for React, built on CodeMirror 6.
template: splash
hero:
  title: Galley Editor
  tagline: A calm, customizable Markdown editor for React apps.
  image:
    file: ../../assets/galley-color.png
  actions:
    - text: Quick Start
      link: guides/quick-start/
      icon: right-arrow
      variant: primary
    - text: API Reference
      link: reference/api/
      icon: document
    - text: Storybook
      link: guides/storybook/
      icon: puzzle
---

## Why Galley?

Galley is for apps that need a pleasant Markdown writing surface without asking people to bounce between an editor and a separate preview pane.

Markdown stays the source of truth. Galley adds live visual helpers for headings, links, images, code fences, tables, lists, checkboxes, and other common structures. When the cursor returns to a block, the Markdown is right there, ready to edit.

## What You Can Build Today

- React component API with TypeScript types.
- CodeMirror 6 editing core.
- Live, Markdown-only, and preview modes.
- Optional toolbar and footer UI.
- Custom toolbar buttons and footer widgets.
- CSS variables, custom class names, and surface styling.
- Custom code highlighters, image renderers, and markdown rendering extensions.
- Safe default image rendering for local and remote image links.

## Docs And Examples

The documentation site is built with Astro Starlight. Storybook is published next to it in the same GitLab Pages instance, so examples and reference material stay together.

Default Pages URL:

```text
https://pages.inkyquill.net/inky/galley-editor
```

Storybook lives at:

```text
https://pages.inkyquill.net/inky/galley-editor/storybook/
```

For a custom domain such as `https://galley.inkyquill.net`, set these CI variables:

```text
GALLEY_DOCS_SITE=https://galley.inkyquill.net
GALLEY_DOCS_BASE=
```
