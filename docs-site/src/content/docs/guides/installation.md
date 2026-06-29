---
title: Installation
description: Install Galley Editor and choose how the editor styles enter your app.
sidebar:
  order: 10
---

Install the package:

```bash
npm install @inkyquill/galley-editor
```

Galley is published as an ES module package:

```tsx
import { GalleyEditor } from '@inkyquill/galley-editor';
import '@inkyquill/galley-editor/style.css';
```

The CSS import is recommended for your first integration. It provides the base editor shell, CodeMirror layout, toolbar, footer, semantic Markdown classes, and theme variables. You can replace it later with your own stylesheet if your product design system owns those styles.

## Peer Dependencies

Galley expects React, React DOM, CodeMirror 6, and Lezer packages to be installed by the host app. The current package declares these peer ranges:

| Package | Range |
| --- | --- |
| `react` | `>=18` |
| `react-dom` | `>=18` |
| `@codemirror/state` | `>=6.6.0` |
| `@codemirror/view` | `>=6.41.0` |
| `@codemirror/commands` | `>=6.10.0` |
| `@codemirror/lang-markdown` | `>=6.5.0` |
| `@codemirror/language` | `>=6.12.0` |
| `@lezer/markdown` | `>=1.6.0` |
| `@lezer/highlight` | `>=1.2.0` |

Most app toolchains install these automatically. If your package manager uses strict peer resolution, install the missing peer packages explicitly.

## Framework Notes

Galley is a client-side React component. In server-rendered frameworks, render it from a client component or disable server rendering for the editor island.

```tsx
'use client';

import { GalleyEditor } from '@inkyquill/galley-editor';
import '@inkyquill/galley-editor/style.css';
```

The editor does not require a Markdown-to-HTML pipeline. It works directly against the Markdown text document through CodeMirror extensions.

## Development Commands

Inside this repository:

```bash
npm install --legacy-peer-deps
npm run dev
npm run storybook
npm run docs:dev
```

Use `npm run build:lib` to build the publishable library and `npm run docs:build` to verify the documentation site.
