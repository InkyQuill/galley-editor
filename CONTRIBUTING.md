# Contributing to `@inky/galley-editor`

Thanks for your interest. This document covers how to develop, the clean-room rule for code in `src/`, and the PR checklist.

## Local development

```bash
git clone https://git.inkyquill.net/inky/galley-editor.git
cd galley-editor
npm install --legacy-peer-deps
npm run dev          # demo app
npm run storybook    # component playground
npm run test         # unit tests
npm run lint         # ESLint
npx tsc -b           # typecheck
npm run build:lib    # build the publishable library
```

## Clean-room rule

Galley previously carried a local read-only editor reference tree during early behavior research. That source has been audited and removed from the public repository; see [`docs/specs/editor-reference-audit.md`](./docs/specs/editor-reference-audit.md).

**Rule:** code in `src/` is authored from a **written behavior description**, not by copying or translating another editor's source.

The workflow for adding behavior inspired by another editor:

1. Write a prose specification under `docs/specs/` describing the behavior, edge cases, and public contract.
2. Close external source before implementation. Do not translate implementation details, file structure, or algorithms.
3. Implement from the Galley spec in the style of this codebase.
4. Tests assert the behavior described in the spec.

## Mechanical safeguards

These prevent accidental contamination of the published package:

- `package.json` uses an explicit `files` allowlist — only the directories and files named there are included in the published tarball.
- The CI test job greps `dist/` for external editor source markers such as `joplin` and `@joplin`, and fails the pipeline on any hit.

## PR checklist

Every merge request must include:

- [ ] No code in this PR was copied or translated from another editor. Behavior was specified in writing first.
- [ ] All tests pass locally (`npm run test`).
- [ ] Lint passes (`npm run lint`).
- [ ] Typecheck passes (`npx tsc -b`).
- [ ] Library build succeeds (`npm run build:lib`).
- [ ] If user-facing behavior changed: `CHANGELOG.md` updated under `## Unreleased`.
- [ ] If a milestone spec was implemented: `docs/specs/v*.md` `Status` field updated, `docs/specs/ROADMAP.md` updated.

## Attribution

Behavior in this library was informed by studying existing markdown editors, including Joplin's editor (https://github.com/laurent22/joplin), © 2016-2025 Laurent Cozic, licensed under AGPL-3.0-or-later. No Joplin source code is included in this package or repository.
