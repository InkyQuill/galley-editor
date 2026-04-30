# Rendering Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix active link reveal, add visual code/table rendering, add optional footer status UI, improve the default theme, and add Storybook image samples.

**Architecture:** Keep rendering behavior in built-in plugins and pass a small render context from `EditorController` to plugin `extensions`. Use CodeMirror block widgets for inactive code fences and tables; keep raw markdown visible while editing. Implement footer in the React wrapper because word/character counts are already available from controlled `value`.

**Tech Stack:** React, TypeScript, CodeMirror 6, Lezer Markdown, Vitest, Storybook.

---

### Task 1: Render Context and Link Reveal

**Files:**
- Modify: `src/types.ts`
- Modify: `src/controller.ts`
- Modify: `src/plugins/links.ts`
- Test: `src/plugins/links.test.ts`

- [x] Add `CodeHighlighter` and `GalleyRenderContext` types.
- [x] Add optional `codeHighlighter` prop to `GalleyEditorProps` and `ControllerSettings`.
- [x] Pass `{ theme: resolved theme, codeHighlighter }` into built-in and custom plugin `extensions`.
- [x] Write a failing link test where cursor inside the link label reveals all hidden syntax.
- [x] Change the link hide reveal strategy to use the parent link as the active reveal boundary.
- [x] Run `npm test -- src/plugins/links.test.ts`.

### Task 2: Code Fence Widget

**Files:**
- Modify: `src/plugins/code-fence.ts`
- Modify: `src/galley-base.css`
- Test: `src/plugins/code-fence.test.ts`

- [x] Write failing tests for inactive code-fence widget rendering, active raw rendering, and custom highlighter usage.
- [x] Replace line-only code fence styling with a `WidgetType` that renders the inactive fence as a block widget.
- [x] Add dependency-free token highlighting for common JavaScript/TypeScript/JSON/CSS/HTML patterns.
- [x] Add copy button DOM behavior.
- [x] Add CSS classes for `.ge-code-block`, `.ge-code-block-header`, `.ge-code-language`, `.ge-code-copy`, `.ge-code-body`, and token spans.
- [x] Run `npm test -- src/plugins/code-fence.test.ts`.

### Task 3: Table Widget

**Files:**
- Modify: `src/plugins/tables.ts`
- Modify: `src/galley-base.css`
- Test: `src/plugins/tables.test.ts`

- [x] Write failing tests for inactive table widget rendering and active raw rendering.
- [x] Parse simple GFM pipe tables into headers, alignments, and body rows.
- [x] Render inactive tables as a block widget with a real `<table>`.
- [x] Add CSS classes for `.ge-table-widget`, `.ge-table-scroll`, `.ge-table-rendered`, and alignment states.
- [x] Run `npm test -- src/plugins/tables.test.ts`.

### Task 4: Footer and Theme

**Files:**
- Modify: `src/types.ts`
- Modify: `src/components/GalleyEditor.tsx`
- Modify: `src/components/GalleyEditor.test.tsx`
- Modify: `src/galley-base.css`
- Modify: `vite.config.ts` if SVG import typing requires it

- [x] Write failing component tests for footer default rendering, live counts, tooltip, and `footer={false}`.
- [x] Add `footer` prop and count helper in `GalleyEditor.tsx`.
- [x] Render footer below the CodeMirror container with the root logo and styled package version tooltip.
- [x] Expand base CSS variables and default surface styling for light/dark mode.
- [x] Run `npm test -- src/components/GalleyEditor.test.tsx`.

### Task 5: Default Toolbar

**Files:**
- Modify: `src/types.ts`
- Modify: `src/components/GalleyEditor.tsx`
- Modify: `src/components/GalleyEditor.test.tsx`
- Modify: `src/galley-base.css`

- [x] Write failing component tests for toolbar default rendering and `toolbar={false}`.
- [x] Add `toolbar?: boolean` prop.
- [x] Render a compact top toolbar that calls existing commands through the controller ref.
- [x] Style the toolbar to match the provided reference direction.
- [x] Run `npm test -- src/components/GalleyEditor.test.tsx`.

### Task 6: Storybook and Docs

**Files:**
- Use: `assets/galley.png`
- Use: `assets/galley-color.png`
- Modify: `src/components/GalleyEditor.stories.tsx`
- Modify: `docs/api-reference.md`
- Modify: `CHANGELOG.md`

- [ ] Add deterministic local SVG sample image assets.
- [x] Add deterministic local SVG sample image assets.
- [x] Add markdown image rendering for image URLs, using Galley brand PNG assets in Storybook.
- [x] Update Storybook markdown samples to include image syntax, code fences, tables, and footer variations.
- [x] Document `codeHighlighter`, `toolbar`, and `footer` props.
- [x] Add changelog notes under `Unreleased`.
- [x] Run `npm run build-storybook` if practical; otherwise run `npm run build`.

### Task 7: Final Verification

**Files:**
- No new files.

- [x] Run `npm test`.
- [x] Run `npm run lint`.
- [x] Run `npm run build`.
- [x] Run `npm run build:lib`.
- [x] Review `git diff --stat` and ensure unrelated `.codex/` deletions remain unstaged.
