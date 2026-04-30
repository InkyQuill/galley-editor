# Changelog

All notable changes to `@inky/neutrino-editor` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
from v1.0.0 onward. Versions in the 0.x series may include breaking changes.

## [Unreleased]

## [0.6.0] — 2026-04-30

### Added
- Reference-style link rendering for `[label][ref]`, shorthand `[ref]`, and `[ref]: url` definitions.
- Cmd/Ctrl-click link activation with `onLinkClick` interception.
- `imageRenderer` prop for opt-in custom markdown image widgets.
- `bidi` prop for adding `dir="auto"` to editor lines.
- `useNeutrino()` hook for hooks-first React consumers.
- `selectionAffectsDecorations` plugin performance hook.

### Changed
- **Breaking:** `NeutrinoPluginSpec.getDecorationRange()` was removed and replaced with explicit `getLineRange`, `getMarkRange`, and `getPointPosition` methods.
- Markdown images now render as safe alt text by default instead of fetching image URLs automatically.

## [0.5.0] — 2026-04-30

### Added
- Visual rendering for inactive fenced code blocks with language badges, copy buttons, and dependency-free default highlighting.
- `codeHighlighter` prop so consumers can integrate highlight.js, Shiki, Prism, or a custom highlighter without Neutrino depending on one.
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
- The logo tooltip now reads `Neutrino Editor v.{version} by Inky Quill`.
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
- CSS variable theming contract for Neutrino's base styles.
- Live auto theme subscription so `theme="auto"` updates when the OS color scheme changes.
- Demo theme toggle for cycling auto, light, and dark modes.
- Regression test suites covering v0.3 runtime correctness and theming behavior.

### Changed
- `onEscape` may now return `boolean | void`; returning `true` consumes Escape, while `false` or `void` lets it pass through.
- `NeutrinoHandle.view` is now nullable and returns `EditorView | null`.

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
- Renamed package from `@inkyquill/neutrino-editor` to `@inky/neutrino-editor`.
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

[Unreleased]: https://git.inkyquill.net/inky/neutrino-editor/-/compare/v0.6.0...HEAD
[0.6.0]: https://git.inkyquill.net/inky/neutrino-editor/-/tags/v0.6.0
[0.5.0]: https://git.inkyquill.net/inky/neutrino-editor/-/tags/v0.5.0
[0.4.0]: https://git.inkyquill.net/inky/neutrino-editor/-/tags/v0.4.0
[0.3.0]: https://git.inkyquill.net/inky/neutrino-editor/-/tags/v0.3.0
[0.2.0]: https://git.inkyquill.net/inky/neutrino-editor/-/tags/v0.2.0
