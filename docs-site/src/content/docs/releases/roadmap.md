---
title: Roadmap
description: Current roadmap toward Galley Editor v1.0.
---

Galley is in active development. v0.7.0 is the current public cleanup baseline.

## Done

- Full Galley rebrand and `ge-*` class prefix transition.
- Live Markdown rendering for core Markdown blocks.
- Links, images, code fences, dividers, blockquotes, lists, checkboxes, tables, and reference links.
- Toolbar, footer, mode switching, and consumer slots.
- Theme variables, frosted surfaces, scrollbar variables, and surface padding overrides.
- Custom code highlighter and image renderer hooks.
- Clean-room public repository cleanup.

## Next

- File drop and paste upload hooks controlled by the consumer app.
- Markdown extension registration examples for KaTeX and Mermaid.
- Better table editing helpers.
- Image resize and asset metadata UX.
- More Storybook examples for app integration patterns.
- Stabilized v1.0 API review.

## Publishing

The docs are designed for two publishing paths:

| Path | Use |
| --- | --- |
| GitLab Pages namespace-in-path | Default public docs deployment. |
| Custom domain | Preferred polished public URL when DNS and nginx/GitLab Pages routing are ready. |

Default:

```text
GALLEY_DOCS_SITE=https://pages.inkyquill.net
GALLEY_DOCS_BASE=/inky/galley-editor
```

Custom root domain:

```text
GALLEY_DOCS_SITE=https://galley.inkyquill.net
GALLEY_DOCS_BASE=
```
