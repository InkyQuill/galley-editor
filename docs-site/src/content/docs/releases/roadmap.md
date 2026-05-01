---
title: Roadmap
description: Current roadmap toward Galley Editor v1.0.
---

Galley is in active development. v0.9.0 is the current table-editing baseline, and the remaining work is split into v0.10 renderer examples and v1.0 API stabilization.

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

## Next Milestones

| Version | Focus | Scope |
| --- | --- | --- |
| 0.10.0 | KaTeX/Mermaid Examples | Markdown extension registration examples for KaTeX and Mermaid. |
| 1.0.0 | API Stabilization | More Storybook integration examples; final public API review and release hardening. |

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
