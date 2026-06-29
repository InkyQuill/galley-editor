---
title: Roadmap
description: Current roadmap toward Galley Editor v1.0.
---

Galley is in active development. v0.10.0 is the current public build.

## Done

- Full Galley rebrand and `ge-*` class prefix transition.
- Live Markdown rendering for core Markdown blocks.
- Links, images, code fences, dividers, blockquotes, lists, checkboxes, tables, and reference links.
- Toolbar, footer, mode switching, and consumer slots.
- Theme variables, frosted surfaces, scrollbar variables, and surface padding overrides.
- Custom code highlighter and image renderer hooks.
- Clean-room public repository cleanup.
- Consumer-owned paste/drop upload hooks with progress reporting.
- Image metadata parsing, rendering metadata, and command-backed resize helpers.
- Hybrid visual editing for simple GFM pipe tables, including cell navigation and row, column, alignment, delete, and Source controls.
- Consumer integration polish for accessible editor naming, public LLM-readable docs, dense workspace styling, custom icon contracts, and app-owned document workflow guidance.
- Public GitHub and npmjs publishing, with GitHub Pages hosting docs and Storybook.

## Next Milestones

| Version | Focus | Scope |
| --- | --- | --- |
| 1.0.0 | API Stabilization | More Storybook integration examples; final public API review and release hardening. |

## Publishing

The docs are designed for two publishing paths:

| Path | Use |
| --- | --- |
| GitHub Pages namespace-in-path | Default public docs deployment. |
| Custom domain | Preferred polished public URL when DNS and nginx/GitHub Pages routing are ready. |

Default:

```text
GALLEY_DOCS_SITE=https://inkyquill.github.io
GALLEY_DOCS_BASE=/galley-editor
```

Custom root domain:

```text
GALLEY_DOCS_SITE=https://galley.inkyquill.net
GALLEY_DOCS_BASE=
```
