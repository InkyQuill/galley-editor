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

The directory `3rdparty/editor/` contains a copy of [Joplin's editor](https://github.com/laurent22/joplin), © 2016-2025 Laurent Cozic, licensed under [AGPL-3.0-or-later](https://www.gnu.org/licenses/agpl-3.0.html). It is **read-only reference material**. It is excluded from the build, the lint, the typecheck, the published tarball, and the eslint scope.

**Rule:** code in `src/` is authored from a **written behavior description**, not by reading or translating Joplin's source.

The workflow for porting a behavior:

1. Open the relevant Joplin file. Read it. In the appropriate spec doc under `docs/specs/`, write a **prose specification** of what the function does, edge cases, return contract — *not* the algorithm in code form.
2. Close the Joplin file. No `3rdparty/` file open in the IDE during implementation.
3. Implement from the spec. If you get stuck and need to re-consult, repeat step 1 — update the spec, not the code.
4. Tests assert behavior described in the spec, not behavior observed by running Joplin.

## Mechanical safeguards

These prevent accidental contamination of the published package:

- `3rdparty/` is excluded from ESLint via `globalIgnores` in `eslint.config.js`, and from TypeScript via the `exclude` arrays of `tsconfig.app.json` and `tsconfig.lib.json`.
- `package.json` uses an explicit `files` allowlist — only the directories and files named there are included in the published tarball; `3rdparty/` is excluded by omission.
- The CI job `forbid-3rdparty-import` greps `dist/` for Joplin filename tokens and fails the pipeline on any hit.

## PR checklist

Every merge request must include:

- [ ] No code in this PR was copied or translated from `3rdparty/`. Behavior was specified in writing first.
- [ ] All tests pass locally (`npm run test`).
- [ ] Lint passes (`npm run lint`).
- [ ] Typecheck passes (`npx tsc -b`).
- [ ] Library build succeeds (`npm run build:lib`).
- [ ] If user-facing behavior changed: `CHANGELOG.md` updated under `## Unreleased`.
- [ ] If a milestone spec was implemented: `docs/specs/v*.md` `Status` field updated, `docs/specs/ROADMAP.md` updated.

## Attribution

Behavior in this library was inspired by studying Joplin's editor (https://github.com/laurent22/joplin), © 2016-2025 Laurent Cozic, licensed under AGPL-3.0-or-later. No Joplin source code is included in this package.
