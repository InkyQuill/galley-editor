# Changelog

All notable changes to `@inky/neutrino-editor` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
from v1.0.0 onward. Versions in the 0.x series may include breaking changes.

## [Unreleased]

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

[Unreleased]: https://git.inkyquill.net/inky/neutrino-editor/-/compare/v0.2.0...HEAD
[0.2.0]: https://git.inkyquill.net/inky/neutrino-editor/-/tags/v0.2.0
