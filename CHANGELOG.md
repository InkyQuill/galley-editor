# [0.11.0](https://github.com/InkyQuill/galley-editor/compare/v0.10.2...v0.11.0) (2026-07-23)


### Bug Fixes

* apply CodeRabbit auto-fixes ([edb1294](https://github.com/InkyQuill/galley-editor/commit/edb12943861da9d3814a046242a19d93ee05e070))
* **editor:** constrain rendered block widths ([5bef48c](https://github.com/InkyQuill/galley-editor/commit/5bef48c3a789b923e4b119ab26153733c4c59afe))
* **editor:** keep code controls within constrained layout ([831b0fa](https://github.com/InkyQuill/galley-editor/commit/831b0fa5f3e61201dc0f6127493dcf6b84e050d6))


### Features

* **editor:** add built-in search ([ef67ca1](https://github.com/InkyQuill/galley-editor/commit/ef67ca16308ff9243278d8715314ed7334b4b6ac))
* **editor:** add horizontal scroll mode ([45f6c8b](https://github.com/InkyQuill/galley-editor/commit/45f6c8bd64f1ee7d6a935d1ae12a6fa4a19da8bb))

## [0.10.2](https://github.com/InkyQuill/galley-editor/compare/v0.10.1...v0.10.2) (2026-07-06)


### Bug Fixes

* **editor:** constrain table blocks ([40c9cdd](https://github.com/InkyQuill/galley-editor/commit/40c9cddadbc57fe16a0643779647b6fa2f2f7c32))

## Unreleased

### Features

* add the built-in CodeMirror search panel with `Mod-f` and `GalleyHandle.openSearch()`
* add opt-in editor-wide horizontal scrolling with `horizontalScroll`

### Bug Fixes

* constrain fenced code and rendered blocks to the editor viewport by default
* delegate code and table overflow to the main editor scroller in horizontal mode
* constrain rendered table blocks in narrow editor surfaces and wrap long table cell content
* add native title tooltips to table block controls and size them consistently with toolbar buttons

## [0.10.1](https://github.com/InkyQuill/galley-editor/compare/v0.10.0...v0.10.1) (2026-07-06)


### Bug Fixes

* enforce conventional commit messages ([3ba402d](https://github.com/InkyQuill/galley-editor/commit/3ba402d9f8a7a8920d9e9bf0a9f9109f243c6861))
* sync release docs with starlight layout ([acec931](https://github.com/InkyQuill/galley-editor/commit/acec931ab0dd7ac65125b1fd1876afe2888803e8))

# [0.10.0](https://github.com/InkyQuill/galley-editor/compare/v0.9.1...v0.10.0) (2026-06-27)


### Bug Fixes

* **build:** make lib postbuild portable ([68e778c](https://github.com/InkyQuill/galley-editor/commit/68e778c5e4109a926d7717eb8f1aa649ecf8dded))
* **editor:** expand theme variable coverage ([f3fa2ce](https://github.com/InkyQuill/galley-editor/commit/f3fa2ced71e444d2748a12dc53b4a4b19fd45b7c))
* **editor:** remove persistent focus and duplicate selection ([011808a](https://github.com/InkyQuill/galley-editor/commit/011808a1c864e00f4b8366cd95df4b746d6f5a9a))
* sync lockfile and audit deps ([3d89d11](https://github.com/InkyQuill/galley-editor/commit/3d89d113a9cf04e830d10aba60f8f54ddf8a1c38))


### Features

* support fill-container editor layout ([381445f](https://github.com/InkyQuill/galley-editor/commit/381445ff9b9d3eedd47e41f775158195b2c50b46))

# Changelog

All notable changes to `@inkyquill/galley-editor` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
from v1.0.0 onward. Versions in the 0.x series may include breaking changes.

## [Unreleased]

### Added
- `layout="fill"` for fixed-height host containers, allowing the editor body to fill available height while the footer stays at the bottom without app-level overrides of CodeMirror internals.
- Built-in toolbar title tooltips now show effective command shortcuts while
  keeping label-only accessible names.
- `formatKeybinding()` and `findCommandKey()` helpers for reusable shortcut
  presentation.

## [0.9.1] — 2026-05-01

### Added
- `ariaLabel` prop for naming the underlying CodeMirror content element without a consumer-owned extension.
- Consumer integration documentation for public LLM-readable Pages URLs, toolbar icon names with Remix/React icon examples, dense workspace styling, `theme="auto"` inside host apps, read-only surfaces, and app-owned dirty/save workflows.
- v0.9.1 docs-site release notes.

### Changed
- `llms.txt` now publishes absolute GitLab Pages URLs for the LLM index and complete Markdown guide.
- The static LLM complete guide now mirrors the new consumer integration recipes.

## [0.9.0] — 2026-05-01

### Added
- Hybrid visual editing for simple GFM pipe tables.
- Excel-lite table cell navigation and single-cell paste behavior.
- Table row, column, alignment, delete, and Source controls.
- Built-in table editing commands for consumer toolbar integrations.

### Changed
- Normal clicks on rendered tables now select visual cells instead of revealing the full Markdown table.
- KaTeX and Mermaid renderer examples are deferred to v0.10 so v0.9 can focus on table UX.

## [0.8.0] — 2026-04-30

### Added
- Hybrid upload UX with inline progress placeholders, drop indicators, optional overlay/locked mode, missing-image placeholders, and visual image resize handles.
- File paste/drop workflows through `onFiles` and `onFileError`, with consumer-returned markdown inserted at the original paste selection or drop position.
- Upload status/progress reporting through `onFileStatus` and the per-operation `input.report()` progress channel.
- Expanded `imageRenderer` metadata with `url`, `title`, `width`, `height`, raw source, preserved attrs, and source positions.
- Image metadata commands: `updateImageMetadata` and `clearImageDimensions`, available as named exports and built-in commands.
- Markdown image metadata syntax support: `![Alt](image.png "Title"){width=640 height=360}`.

### Changed
- Image renderer integrations should read `url` instead of the stale `src` field and can now use image source positions for command-backed editing controls.

## [0.7.0] — 2026-04-30

### Added
- `docs/specs/editor-reference-audit.md` documenting implemented editor parity, out-of-scope reference features, and Galley-specific UX backlog.
- `assets/galley.png` and `assets/galley-color.png` as the Storybook markdown image examples.

### Changed
- Public clean-room guidance now reflects that external editor reference source has been audited and removed from the repository.
- CI leak check now scans built output for external editor source markers instead of an internal `3rdparty/` path.
- Storybook image demos now use Galley brand artwork instead of generated fixture images.

### Removed
- Removed the local `3rdparty/editor/` reference source tree from the public repository.
- Removed remaining pre-rebrand image leftovers from the workspace.
- Removed the old generated Storybook image fixture assets.

## [0.6.0] — 2026-04-30

### Added
- Reference-style link rendering for `[label][ref]`, shorthand `[ref]`, and `[ref]: url` definitions.
- Cmd/Ctrl-click link activation with `onLinkClick` interception.
- `imageRenderer` prop for opt-in custom markdown image widgets.
- `bidi` prop for adding `dir="auto"` to editor lines.
- `useGalley()` hook for hooks-first React consumers.
- `selectionAffectsDecorations` plugin performance hook.
- Toolbar and footer before/after slots for consumer-owned controls and status widgets.

### Changed
- **Breaking:** `GalleyPluginSpec.getDecorationRange()` was removed and replaced with explicit `getLineRange`, `getMarkRange`, and `getPointPosition` methods.
- Markdown images render as built-in image widgets by default; `imageRenderer` remains available for custom widgets or alt-text fallback.
- Storybook now includes a custom chrome slots example and responsive visual checks for editor chrome customization.

## [0.5.0] — 2026-04-30

### Added
- Visual rendering for inactive fenced code blocks with language badges, copy buttons, and dependency-free default highlighting.
- `codeHighlighter` prop so consumers can integrate highlight.js, Shiki, Prism, or a custom highlighter without Galley depending on one.
- Visual rendering for inactive GFM pipe tables.
- Visual rendering for inactive markdown images, including SVG and PNG URLs.
- Built-in editor toolbar, enabled by default and disableable with `toolbar={false}`.
- Built-in footer with word count, character count, and logo tooltip, disableable with `footer={false}`.
- Storybook image samples using local generated SVG assets.
- `mode`, `onModeChange`, and the toolbar mode toggle for live, raw Markdown, and rendered preview modes.
- Toolbar icon overrides for inline SVGs, icon components, and render functions.
- `surface` prop and CSS variables for shell styling, frosted glass, gradients, and editor padding overrides.
- `duplicateLine`, `sortSelectedLines`, `swapLineUp`, `swapLineDown`, `insertLineAfter`, and `insertLineBefore` editing commands.
- `findInDocument` and `jumpToHash` navigation helpers, available as named exports and built-in commands.
- `DEFAULT_KEYMAP` and `BUILTIN_COMMAND_NAMES` exports for command discovery and keymap customization.
- `docs/commands.md` command reference.

### Changed
- Default base stylesheet now skins the full editor shell, toolbar, editing surface, code blocks, tables, and footer in light and dark themes.
- Link source reveal now expands the full `[label](url)` when the cursor is inside the link.
- `editable={false}` now renders the editor in preview mode so rendered Markdown blocks do not revert to source on interaction.
- The logo tooltip now reads `Galley Editor v.{version} by Inky Quill`.
- Array-form `keymap` now fully replaces the default keymap. Function-form `keymap` still receives defaults and returns the full keymap.

## [0.4.0] — 2026-04-29

### Added
- Smart Enter behavior for lists (bullets, tasks, and ordered lists), with line continuation and list-aware mid-line splitting.
- Smart Tab/Shift-Tab behavior for list indentation and outdentation.
- Smart Backspace behavior for empty list markers.
- `tabIndents` editor prop (default: `true`) to control fallback tab indentation behavior.
- `keymap` editor prop for overriding or extending default key bindings.

### Changed
- Consolidated heading commands behind `toggleHeading(level)`; removed `toggleHeading1`…`toggleHeading6` builtin command names.
- Enter/Tab/Backspace handling in the controller now routes through smart-command builders with keyboard-map integration.

### Fixed
- Keymap extension assembly preserves default bindings and custom extensions.
- Ordered-list indentation resets nested markers to `1.` while outdent keeps existing numbering.

## [0.3.0] — 2026-04-29

### Added
- CSS variable theming contract for Galley's base styles.
- Live auto theme subscription so `theme="auto"` updates when the OS color scheme changes.
- Demo theme toggle for cycling auto, light, and dark modes.
- Regression test suites covering v0.3 runtime correctness and theming behavior.

### Changed
- `onEscape` may now return `boolean | void`; returning `true` consumes Escape, while `false` or `void` lets it pass through.
- `GalleyHandle.view` is now nullable and returns `EditorView | null`.

### Fixed
- B1: Multi-line blockquote and table line decorations now apply to every line in a block.
- B2: `editorClassName` updates now react to prop changes and remove stale classes.
- B3: Imperative ref methods are safe before the editor controller has mounted.
- B4: Escape is no longer swallowed when `onEscape` is absent or does not explicitly consume it.
- B5: `Mod-Shift-Enter` no longer fires `onSubmit`; only `Mod-Enter` submits.
- B6: H1 heading toggles now replace existing heading levels instead of prefixing them.
- B7: `setContent` preserves selection direction and secondary cursors where possible.
- B8: Runtime extensions now use a single compartment and no longer leave dead appended config slots.
- B9: Inline plugin parent-depth state is reset between visible ranges.
- B10: Bullet marker widgets remove their previous depth class precisely instead of hard-coded depth classes.
- B11: Decorative bullet and divider widgets are hidden from assistive technology.
- B12: Checkbox toggles now edit only the marker text instead of replacing the full line.
- B13: Enter handling now applies across multiple cursors.
- B14: `onScroll` and `onSelectionChange` are coalesced to one callback per animation frame.
- B15: Autosize first measurement is stabilized and avoids redundant height writes.
- B16: Removed the dead `updateCallbacks` controller method.
- B17: Storybook Tailwind/PostCSS support was verified as already fixed in v0.2.

## [0.2.0] — 2026-04-28

### Added
- MIT `LICENSE` file at repository root.
- `CONTRIBUTING.md` documenting the clean-room rule for porting behavior from `3rdparty/editor/`.
- `tsconfig.lib.json` for library-mode TypeScript with `.d.ts` emission.
- `.npmrc.example` showing how consumers configure the GitLab Package Registry.
- `.gitlab-ci.yml` with three-stage pipeline (validate → build → publish-on-tag).
- `scripts/verify-publish.sh` for manual pre-tag tarball inspection.

### Changed
- Renamed package from `@inkyquill/galley-editor` to `@inkyquill/galley-editor`.
- Version bumped from `1.0.0` to `0.2.0`. The 1.0.0 was aspirational; v0.x indicates active pre-release development. v1.0.0 will be the public-release commitment.
- Moved `react`, `react-dom`, all `@codemirror/*`, all `@lezer/*` from `dependencies` to `peerDependencies` so consumers deduplicate properly.
- `vite.config.ts`: renamed `rolldownOptions` to `rollupOptions`, wired `vite-plugin-dts` for type emission, configured CSS bundling so `dist/style.css` exists.
- `package.json` `exports` map cleaned up; `files` is allowlist-only.
- `.storybook/main.ts`: removed stale `markdown-it` reference and CSS-disabling override.

### Fixed
- `npm run build` no longer fails on a TS6133 unused-parameter error in stories.
- ESLint config ignores `storybook-static/`, `.remember/`, `dist/`, `3rdparty/`.
- TypeScript config excludes `3rdparty/` from typecheck.

### Removed
- `storybook-static/` directory removed from version control (was a tracked build artifact).
- `"private": true` removed from `package.json`.

### Notes
- This release contains zero behavior changes. Bug fixes from the pre-spec code review land in v0.3.0.
- Distribution is private (GitLab Package Registry on `git.inkyquill.net`). Public publication deferred to v1.0.0.

[Unreleased]: https://github.com/InkyQuill/galley-editor/compare/v0.10.0...HEAD
[0.10.0]: https://github.com/InkyQuill/galley-editor/compare/v0.9.1...v0.10.0
[0.9.1]: https://github.com/InkyQuill/galley-editor/compare/v0.9.0...v0.9.1
[0.9.0]: https://github.com/InkyQuill/galley-editor/compare/v0.8.0...v0.9.0
[0.8.0]: https://github.com/InkyQuill/galley-editor/releases/tag/v0.8.0
[0.7.0]: https://github.com/InkyQuill/galley-editor/releases/tag/v0.7.0
[0.6.0]: https://github.com/InkyQuill/galley-editor/releases/tag/v0.6.0
[0.5.0]: https://github.com/InkyQuill/galley-editor/releases/tag/v0.5.0
[0.4.0]: https://github.com/InkyQuill/galley-editor/releases/tag/v0.4.0
[0.3.0]: https://github.com/InkyQuill/galley-editor/releases/tag/v0.3.0
[0.2.0]: https://github.com/InkyQuill/galley-editor/releases/tag/v0.2.0
