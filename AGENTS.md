# AGENTS.md

This file provides guidance to coding agents when working with code in this repository.

## Project Overview

Galley Editor (`@inkyquill/galley-editor`) — a React component library providing a half-WYSIWYG markdown editor built on CodeMirror 6. When the cursor is not on a node, its formatting marks are hidden and semantic CSS classes are applied; when the cursor enters the node, raw markdown is revealed. Similar to Obsidian's live preview mode. Uses Lezer's markdown parser (no separate markdown-to-HTML step).

## Commands

- `npm run dev` — Start Vite dev server (demo app in `src/App.tsx`)
- `npm run build` — TypeScript check + Vite build (demo app)
- `npm run build:lib` — Build the library for publishing (entry: `src/components/index.ts`, ES module output to `dist/`)
- `npm run lint` — ESLint (flat config, TS + React hooks + React Refresh)
- `npm run test` — Run the Vitest suite
- `npm run test:commit-msg` — Validate commit-message hook behavior
- `npm run storybook` — Start Storybook on port 6006
- `npm install --legacy-peer-deps` — Use this install mode when npm reports peer dependency conflicts

## Architecture

### Build Modes

Vite has two build modes in `vite.config.ts`:
- **Default**: Builds the demo app (`index.html` entry)
- **Library** (`--mode lib`): Builds from `src/components/index.ts`. React, CodeMirror, and Lezer packages are externalized.

### TypeScript Config

`tsconfig.app.json` enables `erasableSyntaxOnly: true` — **no enums or `private` constructor params**. Use `as const` objects for enum-like patterns and explicit field declarations in classes.

### Core Architecture (Compartment-based, no teardown)

The `EditorView` is created **once** on mount and never destroyed except on unmount. All prop changes are applied via CodeMirror `Compartment` reconfiguration:

- **`EditorController`** (`src/controller.ts`): Owns the EditorView and 3 Compartments (dynamic settings, autosize, history). Implements `GalleyHandle` (the imperative ref API). Holds the command registry.
- **`GalleyEditor.tsx`** (`src/components/`): Thin React `forwardRef` wrapper. Creates the controller once, syncs props via `updateSettings()`, exposes handle via `useImperativeHandle` with a proxy pattern.
- Callback props are stored in stable refs updated via `useLayoutEffect` — they never cause re-initialization.

### Plugin System

Each rendering feature is a `GalleyPlugin` (id + `extensions(classNames)` method). Built-ins live in `src/plugins/`. Consumers can add custom plugins via the `plugins` prop.

Two factory functions in `src/rendering.ts`:
- **`makeInlinePlugin(spec)`** — `ViewPlugin` (viewport-only, efficient). For inline marks (bold, italic, links, etc.).
- **`makeBlockPlugin(spec)`** — `StateField` (full-doc iteration). For multi-line blocks (blockquotes, tables).
- Exception: `code-fence.ts` uses a custom StateField directly to emit per-line decorations.

Reveal strategies (`getRevealStrategy`):
- `'active'` — reveal when cursor is inside the node or its parent (used for bold/italic marks)
- `'line'` — reveal when cursor is on the same line (used for blockquote marks)
- `'select'` — reveal only when cursor directly overlaps the node (used for link URLs)
- `boolean` — custom logic (used for checkboxes)

### Styling

Style-agnostic: the editor applies **semantic CSS classes** (`ge-h1`, `ge-bold`, `ge-code-fence`, etc.) to decorations. No colors or fonts are hardcoded. Consumers style via:
- `galley-base.css` — optional import with minimal defaults
- `@tailwindcss/typography` `prose` classes (compatible but not required)
- Custom CSS targeting `ge-*` classes
- `classNames` prop to override class names entirely

Lezer token classes (`tok-strong`, `tok-emphasis`, etc.) are applied via `classHighlighter`.

### Commands

`src/commands/index.ts` exports `BUILTIN_COMMANDS` — a `Record<BuiltinCommand, CommandFn>` with formatting commands (toggleBold, toggleHeading, insertLink, etc.). Command behavior is implemented from Galley specs and local tests.

### Exports

`src/components/index.ts` re-exports: `GalleyEditor`, `ErrorBoundary`, all types, `makeInlinePlugin`/`makeBlockPlugin` (for custom plugins), `BUILT_IN_PLUGINS`, `BUILTIN_COMMANDS`.

### Path Alias

`@` is aliased to `src/` in Vite config.

## Commit and Release Discipline

All non-merge commits must use Conventional Commits so `semantic-release` can infer and publish versions. Examples:

- `fix: handle empty table control icons`
- `feat(editor): add table toolbar customization`
- `docs: document visual table editing`
- `feat!: remove deprecated editor prop`

Merge commits are allowed as Git creates them. Do not use vague subjects such as `update docs`, `review fixes`, or `commit changes`; they will not produce releases.

The repository installs a versioned `commit-msg` hook from `.githooks/` via `npm install` / `npm run prepare`. The hook rejects non-conventional commit subjects locally before they can be merged.
