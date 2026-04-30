---
title: Installation
description: Install Galley Editor from the GitLab package registry.
---

Galley is currently published from the self-hosted GitLab package registry. The project is public, so consumers do not need a token to pull packages.

## Configure npm

Create or update `.npmrc` in your consuming project:

```ini
@inky:registry=https://git.inkyquill.net/api/v4/packages/npm/
```

Authenticated registry access is only needed for maintainers publishing new versions.

## Install

```bash
npm install @inky/galley-editor
```

## Import

```tsx
import { GalleyEditor } from '@inky/galley-editor';
import '@inky/galley-editor/style.css';
```

The stylesheet is optional but recommended. It provides the default Galley theme, CSS variables, toolbar/footer styling, image widgets, tables, code fences, and overlay-style scrollbars.

## Peer Dependencies

Galley expects React and CodeMirror to be available through peer dependencies:

```text
react >=18
react-dom >=18
@codemirror/state >=6.6.0
@codemirror/view >=6.41.0
@codemirror/commands >=6.10.0
@codemirror/lang-markdown >=6.5.0
@codemirror/language >=6.12.0
@lezer/markdown >=1.6.0
@lezer/highlight >=1.2.0
```
