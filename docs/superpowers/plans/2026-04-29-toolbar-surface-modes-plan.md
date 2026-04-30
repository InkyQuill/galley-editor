# Toolbar Surface Modes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add toolbar icon customization, surface styling hooks, preview/markdown modes, and updated logo tooltip text.

**Architecture:** Resolve an effective mode in the React wrapper, pass it through controller settings into plugin render context, and let built-in plugins suppress reveal behavior in preview mode. Keep toolbar and surface customization in the React layer through typed props, React nodes, render functions, and CSS variables.

**Tech Stack:** React, TypeScript, CodeMirror 6, Vitest, Storybook, CSS custom properties.

---

### Task 1: React API Tests

**Files:**
- Modify: `src/components/GalleyEditor.test.tsx`
- Modify: `src/theme.test.ts`

- [x] **Step 1: Write failing tests**

Add tests for:

- footer tooltip text `Galley Editor v.0.4.0 by Inky Quill`
- toolbar icon override via React node
- toolbar icon override via render function
- `surface` class/style/padding variables
- `mode="markdown"`
- `mode="preview"`
- `editable={false}` forcing preview
- built-in toolbar mode toggle
- canonical CSS variables for padding and backdrop filter

- [x] **Step 2: Run tests to verify failure**

Run:

```bash
npm test -- src/components/GalleyEditor.test.tsx src/theme.test.ts
```

Expected: FAIL because the public props and behavior do not exist yet.

### Task 2: Public Types and Wrapper Implementation

**Files:**
- Modify: `src/types.ts`
- Modify: `src/components/GalleyEditor.tsx`

- [x] **Step 1: Add types**

Add `GalleyMode`, `ToolbarIconName`, `ToolbarIconRenderer`, `GalleyToolbarOptions`, `GalleyFooterOptions`, and `GalleySurfaceOptions`.

- [x] **Step 2: Implement wrapper behavior**

Resolve `effectiveMode`, support controlled and uncontrolled mode switching, render custom toolbar icons, apply `surface` class/style/variables to `.ge-editor-shell`, and update the tooltip string.

- [x] **Step 3: Run focused wrapper tests**

Run:

```bash
npm test -- src/components/GalleyEditor.test.tsx src/theme.test.ts
```

Expected: PASS.

### Task 3: Rendering Mode Plumbing

**Files:**
- Modify: `src/controller.ts`
- Modify: `src/plugins/emphasis.ts`
- Modify: `src/plugins/headings.ts`
- Modify: `src/plugins/code-inline.ts`
- Modify: `src/plugins/blockquote.ts`
- Modify: `src/plugins/lists.ts`
- Modify: `src/plugins/checkboxes.ts`
- Modify: `src/plugins/dividers.ts`
- Modify: `src/plugins/links.ts`
- Modify: `src/plugins/images.ts`
- Modify: `src/plugins/code-fence.ts`
- Modify: `src/plugins/tables.ts`
- Modify: `src/plugins/code-fence.test.ts`
- Modify: `src/plugins/tables.test.ts`
- Modify: `src/plugins/images.test.ts`

- [x] **Step 1: Pass mode to plugins**

Add `mode` to `ControllerSettings` and `GalleyRenderContext`. Skip plugin extensions in markdown mode and make preview mode read-only.

- [x] **Step 2: Suppress reveal in preview**

Update built-in plugins so preview mode returns `false` reveal strategies or skips cursor-proximity checks for block widgets.

- [x] **Step 3: Add block preview regressions**

Assert code fences, tables, and images remain visual widgets when the cursor is inside the source range in preview mode.

- [x] **Step 4: Run focused plugin tests**

Run:

```bash
npm test -- src/plugins/code-fence.test.ts src/plugins/tables.test.ts src/plugins/images.test.ts
```

Expected: PASS.

### Task 4: Styling, Docs, and Stories

**Files:**
- Modify: `src/galley-base.css`
- Modify: `src/components/GalleyEditor.stories.tsx`
- Modify: `docs/api-reference.md`
- Modify: `CHANGELOG.md`
- Create: `docs/superpowers/specs/2026-04-29-toolbar-surface-modes-design.md`
- Create: `docs/superpowers/plans/2026-04-29-toolbar-surface-modes-plan.md`

- [x] **Step 1: Add CSS variables**

Define and use:

- `--ge-content-padding`
- `--ge-toolbar-padding`
- `--ge-footer-padding`
- `--ge-backdrop-filter`

- [x] **Step 2: Add Storybook examples**

Add stories for mode switching, custom toolbar icons, and frosted surface styling.

- [x] **Step 3: Document the public API**

Update API reference and changelog.

### Task 5: Verification and Publish to Main

**Files:**
- All changed files.

- [x] **Step 1: Run full verification**

Run:

```bash
npm test
npm run lint
npm run build
npm run build:lib
npm run build-storybook
git diff --check
```

Expected: all commands exit 0.

- [x] **Step 2: Commit and push**

Stage only project changes, excluding unrelated `.codex` deletions, then run:

```bash
git commit -m "feat: add editor modes and toolbar customization"
git push origin main
```
