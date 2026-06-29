# Roadmap — `@inkyquill/galley-editor`

Single source of truth for the production-readiness plan. Every milestone has a dedicated spec document linked below; this file tracks status, links, and high-level scope.

## Vision

A React component library exposing a half-WYSIWYG markdown editor (live preview, similar to Obsidian) built on CodeMirror 6 and Lezer's markdown parser. Style-agnostic, fully themable via CSS custom properties and Tailwind v4 `@theme`, with a small plugin API for extending decorations and a command system for editor actions.

## License & legal posture

- **License:** MIT (`LICENSE` at repo root, `"license": "MIT"` in `package.json`).
- **Reference material:** the early local editor reference tree was audited and removed before public release. See [editor-reference-audit.md](./editor-reference-audit.md).
- **Clean-room rule:** behavior in `src/` is authored from written Galley specifications, not by copying or translating another editor's source. See `CONTRIBUTING.md` for the workflow.
- **Published package scope:** `package.json` uses a `files` allowlist, and CI greps `dist/` for external editor source markers before publishing.

## Distribution

- **Repository:** `https://github.com/InkyQuill/galley-editor`.
- **Registry:** npmjs.
- **Scope:** `@inkyquill`.
- **Auth:** GitHub Actions publishes with the `NPM_TOKEN` repository secret after `semantic-release` creates a release.
- **Docs:** GitHub Pages serves Astro Starlight at `/galley-editor/` and Storybook at `/galley-editor/storybook/`.

## Milestones

Each milestone is independently shippable to npmjs. Implementation is sequential — no milestone starts until the previous is tagged.

| Version | Title | Status | Spec | Tag |
|---|---|---|---|---|
| 0.2.0 | Publishable | shipped 2026-04-28 | [v0.2-publishable.md](./v0.2-publishable.md) | v0.2.0 |
| 0.3.0 | Correctness & Theming | shipped 2026-04-29 | [v0.3-correctness.md](./v0.3-correctness.md) | v0.3.0 |
| 0.4.0 | Smart Input | shipped 2026-04-29 | [v0.4-smart-input.md](./v0.4-smart-input.md) | v0.4.0 |
| 0.5.0 | Editor Commands | shipped 2026-04-30 | [v0.5-editor-commands.md](./v0.5-editor-commands.md) | v0.5.0 |
| 0.6.0 | Rendering Parity | shipped 2026-04-30 | [v0.6-rendering-parity.md](./v0.6-rendering-parity.md) | v0.6.0 |
| 0.7.0 | Public Repository Cleanup | shipped 2026-04-30 | [v0.7-public-cleanup.md](./v0.7-public-cleanup.md) | v0.7.0 |
| 0.8.0 | Asset Workflows | shipped 2026-04-30 | [v0.8 asset workflows design](../superpowers/specs/2026-04-30-v0.8-asset-workflows-design.md) | v0.8.0 |
| 0.9.0 | Table Editing | shipped 2026-05-01 | [v0.9 table editing design](../superpowers/specs/2026-04-30-v0.9-advanced-authoring-design.md) | v0.9.0 |
| 0.9.1 | Consumer Integration Polish | shipped 2026-05-01 | Consumer feedback patch: accessible naming, public LLM docs, and customization recipes | v0.9.1 |
| 0.10.0 | KaTeX/Mermaid Renderer Examples | draft | — | — |
| 1.0.0 | Public Release & API Stabilization | draft | [v1.0 API stabilization design](../superpowers/specs/2026-04-30-v1.0-api-stabilization-design.md), [v1.0-public-release.md](./v1.0-public-release.md) | — |

**Status values:** `draft` (spec written, not started) → `in-progress` (work began) → `shipped vX.Y.Z on YYYY-MM-DD` (frozen; corrections go in the spec's Post-ship notes section).

## Cross-cutting principles

These apply to every milestone and are not re-stated in individual specs.

1. **Backwards compatibility.** Until v1.0.0 we have no external consumers and may break API freely between versions. Every breaking change is documented in `CHANGELOG.md`.
2. **`main` is always green.** Lint, typecheck, test, and `build:lib` must pass on every push. CI enforces this.
3. **Test discipline (pragmatic).** Every bug fix ships with a regression test. Every new behavior ships with unit tests. Coverage target 70% (CI floor 65%); raised to 80% at v1.0. No TDD enforcement, no test-for-tests-sake.
4. **Documentation evolves in lockstep.** When a milestone changes the API, the relevant `docs/*.md` is updated in the same merge request. `docs/api-reference.md` is fully rewritten in v1.0; intermediate milestones may leave it partially stale, but `CLAUDE.md` always reflects current internals.
5. **Clean-room boundary.** All work in `src/` is authored from prose specs. CI checks prevent accidental external editor source markers from leaking into the build.

## Open questions

These need decisions before the relevant milestone starts.

| Question | Blocking | Owner |
|---|---|---|
| Author name + canonical email for `LICENSE` and `package.json` `author` field | v0.2 | maintainer |
| Repository URL — confirm `https://github.com/InkyQuill/galley-editor.git` is final | v0.2 | maintainer |
| Whether to use a custom docs domain | v1.0 | maintainer |
| What's the canonical screenshot/GIF for the README? | v1.0 | maintainer |

## Post-ship notes

(Added retroactively as we ship each milestone — captures things the spec missed, deviations from plan, follow-up work.)

_None yet._
