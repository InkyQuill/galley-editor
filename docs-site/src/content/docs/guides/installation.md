---
title: Installation
description: Install Galley Editor from npm.
---

Galley is published on npm as `@inkyquill/galley-editor`.

## Install

```bash
npm install @inkyquill/galley-editor
```

## Import

```tsx
import { GalleyEditor } from '@inkyquill/galley-editor';
import '@inkyquill/galley-editor/style.css';
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
