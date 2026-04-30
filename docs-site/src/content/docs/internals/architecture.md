---
title: Architecture
description: How Galley uses React, CodeMirror, Lezer, decorations, and compartments.
---

Galley is a React wrapper around a single CodeMirror 6 `EditorView`.

## Lifecycle

The `EditorView` is created once when `GalleyEditor` mounts and is destroyed only on unmount. Prop changes are applied through CodeMirror `Compartment` reconfiguration, which preserves cursor position, undo history, scroll state, and extension identity.

The controller owns three main compartments:

| Compartment | Responsibility |
| --- | --- |
| Dynamic settings | Theme, editability, placeholder, plugins, extra extensions. |
| Autosize | Minimum and maximum row sizing. |
| History | Undo/redo history configuration. |

## Rendering Pipeline

Galley uses Lezer's Markdown parser directly. There is no separate Markdown-to-HTML conversion step for live editing.

Plugins inspect the syntax tree and emit CodeMirror decorations:

- Mark decorations add semantic classes.
- Replace decorations hide Markdown syntax tokens.
- Widget decorations render controls such as checkboxes, image previews, dividers, and inactive code fences.
- Line decorations style full Markdown lines and blocks.

## Reveal Strategies

Live preview depends on reveal rules:

| Strategy | Behavior |
| --- | --- |
| `active` | Reveal when the cursor is inside the node or parent node. |
| `line` | Reveal when the cursor is on the same line. |
| `select` | Reveal only when the selection overlaps the hidden token. |
| custom boolean | Plugin-specific behavior. |

Preview mode disables click-to-Markdown reversion. Markdown mode keeps source tokens visible.

## Extension Points

Consumers can extend Galley at several levels:

- Toolbar and footer slots for React UI.
- CSS variables and semantic classes for styling.
- `codeHighlighter` for code fence rendering.
- `imageRenderer` for app-specific asset behavior.
- `plugins` for Galley rendering features.
- `extensions` for raw CodeMirror features.
- `registerCommand()` for app commands.
