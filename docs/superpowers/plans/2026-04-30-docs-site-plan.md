# Galley Docs Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Starlight-powered public documentation site for Galley Editor, publish Storybook alongside it, and provide a GitLab Pages deployment path.

**Architecture:** Create a standalone `docs-site/` Astro project with Starlight content collections. Keep root `docs/` for internal engineering material, expose root npm scripts for docs development, and add a GitLab `pages` job that publishes `docs-site/dist` as the required root `public/` artifact with Storybook mounted at `public/storybook/`.

**Tech Stack:** Astro, `@astrojs/starlight`, Markdown content collections, GitLab Pages.

---

### Task 1: Scaffold Docs App

**Files:**
- Create: `docs-site/package.json`
- Create: `docs-site/astro.config.mjs`
- Create: `docs-site/tsconfig.json`
- Create: `docs-site/src/content.config.ts`
- Create: `docs-site/src/styles/starlight.css`
- Create: `docs-site/src/assets/galley-color.png`
- Create: `docs-site/public/favicon.svg`
- Modify: `package.json`

- [x] **Step 1: Create the standalone Astro/Starlight package**

Create `docs-site/package.json` with Astro and Starlight dependencies and local scripts.

- [x] **Step 2: Configure Starlight**

Create `docs-site/astro.config.mjs` with Galley branding, explicit sidebar entries, GitLab social link, custom CSS, and env-driven `site`/`base`.

- [x] **Step 3: Configure content collections**

Create `docs-site/src/content.config.ts` using Starlight's `docsLoader()` and `docsSchema()`.

- [x] **Step 4: Add root docs scripts**

Add `docs:dev`, `docs:build`, and `docs:preview` to root `package.json`.

### Task 2: Seed Public Documentation

**Files:**
- Create: `docs-site/src/content/docs/index.md`
- Create: `docs-site/src/content/docs/guides/installation.md`
- Create: `docs-site/src/content/docs/guides/quick-start.md`
- Create: `docs-site/src/content/docs/guides/customization.md`
- Create: `docs-site/src/content/docs/guides/plugins-renderers.md`
- Create: `docs-site/src/content/docs/guides/storybook.md`
- Create: `docs-site/src/content/docs/reference/api.md`
- Create: `docs-site/src/content/docs/internals/architecture.md`
- Create: `docs-site/src/content/docs/releases/roadmap.md`
- Create: `docs-site/src/content/docs/releases/v0-7-0.md`

- [x] **Step 1: Write getting-started pages**

Add overview, installation, and quick-start pages with professional, lightly friendly copy tailored to the GitLab package registry and React usage.

- [x] **Step 2: Write customization pages**

Document theme variables, toolbar/footer slots, renderers, markdown extensions, Storybook examples, and future upload hooks.

- [x] **Step 3: Write reference pages**

Add public API, architecture, roadmap, and v0.7.0 release pages.

### Task 3: Add GitLab Pages Deployment

**Files:**
- Modify: `.gitlab-ci.yml`

- [x] **Step 1: Add a `pages` job**

Install root dependencies with `npm ci --legacy-peer-deps`, build Storybook with `npm run build-storybook`, install docs dependencies with `npm --prefix docs-site ci`, build with `npm --prefix docs-site run build`, copy `docs-site/dist/` to root `public/`, and copy `storybook-static/` to `public/storybook/`.

- [x] **Step 2: Document deployment variables**

Record `GALLEY_DOCS_SITE` and `GALLEY_DOCS_BASE` behavior in the docs.

### Task 4: Verify

**Files:**
- Generated: `docs-site/package-lock.json`

- [x] **Step 1: Install docs dependencies**

Run `npm --prefix docs-site install --no-audit --no-fund`.

- [x] **Step 2: Build docs**

Run `npm run docs:build` and confirm Starlight builds successfully.

- [x] **Step 3: Run existing project checks affected by root config**

Run `npm run lint` and `npm run build`.
