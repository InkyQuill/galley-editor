---
title: Architecture
description: How Galley keeps CodeMirror stable while rendering Markdown live preview decorations.
sidebar:
  order: 20
---

Galley is built around one principle: the Markdown text document is the source of truth. Rendering is done with CodeMirror decorations over that source, not by producing a separate HTML document.

## Controller Lifetime

`EditorController` owns the CodeMirror `EditorView`, compartments, command registry, and imperative handle implementation.

The view is created once on mount and destroyed only on unmount. Prop changes are applied through CodeMirror `Compartment` reconfiguration:

- Dynamic editor settings, theme, and plugins.
- Horizontal wrapping, autosize, and editor classes.
- Keymap, history, and runtime extensions.

This avoids remounting CodeMirror when React props change.

## React Wrapper

`GalleyEditor` is a thin `forwardRef` wrapper. It creates the controller once, forwards props into `updateSettings()`, and exposes a stable `GalleyHandle` proxy through `useImperativeHandle`.

Callback props are kept in stable refs and updated with layout effects, so changing callbacks does not rebuild the editor. The formatting controls subscribe directly to the active syntax at the cursor. Moving the cursor keeps the shell and consumer slots out of the React render path.

## Rendering Plugins

Each live-preview feature is a `GalleyPlugin` with a stable id and an `extensions()` function.

Inline marks use `makeInlinePlugin()`, which builds viewport-scoped `ViewPlugin` decorations. This keeps bold, italic, links, and inline code cheap on large documents.

Block features use `makeBlockPlugin()` or custom state fields when they need full-document iteration. Code fences use a custom state field because they emit per-line decorations.

## Reveal Strategies

A renderer can hide Markdown syntax while inactive and reveal raw source when the user edits nearby text.

| Strategy | Used for |
| --- | --- |
| `active` | Marks where parent context matters, such as emphasis. |
| `line` | Blocks and line-oriented syntax, such as blockquotes. |
| `select` | Syntax that should reveal only when directly selected, such as link URLs. |
| `boolean` | Custom cases, such as checkboxes. |

## Styling Contract

Galley emits semantic CSS classes instead of hard-coded visual styles. The optional base CSS defines defaults for those classes and exposes variables for color, spacing, radius, typography, and editor chrome.

This lets apps keep the editor visually consistent with the surrounding product while reusing Galley's parser and command behavior.
