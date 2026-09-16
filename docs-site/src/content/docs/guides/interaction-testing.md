---
title: Interaction testing
description: Reproduce editor interactions and inspect exact Markdown and browser events.
sidebar:
  order: 55
---

Run `npm run dev` in the repository and open the local Vite URL. The demo is an interaction bench using a controlled React `GalleyEditor`.

## Reproducing an editing problem

1. Load **Tasks fixture**, **Spaces fixture**, or paste your document into **Load or edit exact Markdown**.
2. Interact with the editor using the mouse and keyboard. The fixture buttons replace the document; they do not clear undo history.
3. Compare **Raw Markdown**, **Exact Markdown** (JSON), and **Visible whitespace**. Spaces appear as `·`, tabs as `→`, and line breaks as `↵` in the whitespace display only. These displays never modify editor content.
4. Compare Live, Markdown and Preview modes, Editable on/off, and multiple checkbox classes.
5. Leave **Console event tracing** enabled to inspect `[Galley DOM]` and `[Galley transaction]` console records. They include timestamps, keyboard/input/composition events, document contents, selection positions, changes and CodeMirror user-event annotations. Tracing belongs to the demo and can be turned off; it is not part of the library.

For example, enter `тест тест т`, press Backspace once and type `t`. The expected source is `тест тест t`. After Backspace alone, the JSON display must still show the trailing space in `"тест тест "`.

Always record the installed application version, editor package version, operating system and browser engine. A native Tauri WebKitGTK window can differ from Chromium and from the WebKit build bundled with Playwright. Test the actual installed release as well as local source.

## Automated browser checks

```bash
npm install --legacy-peer-deps
npx playwright install --with-deps chromium firefox webkit
npm run test:e2e
```

The suite starts a separate Vite server on port 5174 and checks the real editor with Chromium, Firefox and WebKit. On systems unsupported by Playwright, install compatible browser dependencies or run on a supported Linux distribution; a browser launch failure is not an editor test result.

```bash
npm run test:e2e -- --project=chromium
npm run test:e2e:ui
npm test
```

The browser suite covers task toggling, keyboard activation, read-only and preview behavior, whitespace preservation, Unicode deletion, list continuation/exit/indentation, selection formatting, undo/redo and mode switching. The Vitest suite additionally covers commands, tables, links, images, uploads and React/controller integration. Browser tests complement those tests: dispatching an isolated `input` event does not exercise pointer focus, native selection changes or interactions between all rendering plugins.

Failed browser tests save traces under `test-results/`. Open a trace with `npx playwright show-trace <path-to-trace.zip>`.

## Expected editing behavior

- A task checkbox toggles only its task marker and remains visible. Selecting its Markdown marker directly still reveals the source in Live mode.
- Preview and read-only checkboxes are disabled.
- Backspace removes a complete grapheme (including emoji) without deleting an adjacent space.
- Enter continues a list; Enter on an empty item exits it. Galley's own keymap implements this behavior and invokes configured Enter callbacks.

This bench does not prove every operating-system input method or desktop integration works. Keep native-only regressions reproducible with their application and engine versions.
