---
title: Roadmap
description: Current project status and the path to a stable Galley Editor release.
sidebar:
  order: 10
---

Galley Editor is currently `v0.12.0` and still pre-1.0.

## Current Focus

- Stabilize the public React API and TypeScript types.
- Keep command behavior covered by local tests.
- Improve advanced authoring flows such as tables, images, smart input, and upload status.
- Keep the docs and Storybook examples aligned with the package exports.

## Release Direction

The v1.0 target is a dependable editor component that product teams can embed without adopting a full document platform. The core contract is:

- Markdown remains the persisted document format.
- CodeMirror owns editing and selection behavior.
- Galley owns live-preview decorations and command behavior.
- Applications own persistence, uploads, product chrome, and final design.

Detailed planning documents live in the repository:

<https://github.com/InkyQuill/galley-editor/blob/main/docs/specs/ROADMAP.md>
