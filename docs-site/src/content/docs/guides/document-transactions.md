---
title: Document Transactions
description: Observe edits and positions through CodeMirror transactions when building editors around Galley.
sidebar:
  order: 45
---

Galley Editor exposes the underlying CodeMirror 6 view, so a host application can observe every document change through standard `EditorView.updateListener` transactions. This is the recommended integration when your app needs more than the `onChange` string: per-edit offsets, old and new positions, or the ability to distinguish user edits from programmatic ones.

## Subscribe to Transactions

Pass an update listener through the `extensions` prop. Galley forwards it into the editor configuration and keeps it active across reconfigurations (theme changes, mode switches, prop updates — the view is never recreated):

```tsx
import { EditorView } from '@codemirror/view';
import { GalleyEditor } from '@inkyquill/galley-editor';

// Create the observer once, outside the component, so its identity is stable.
const observer = EditorView.updateListener.of(({ transactions }) => {
  for (const tr of transactions) {
    if (!tr.docChanged) continue;
    tr.changes.iterChanges((from, to, _a, _b, text) => {
      console.debug({ from, to, insertedLength: text.length });
    });
  }
});

<GalleyEditor
  value={value}
  onChange={setValue}
  extensions={[observer]}
/>
```

Each reported change gives you:

- `from`, `to` — the replaced range in the **old** document, in UTF-16 code units;
- the inserted text (`text.toString()` is the actual inserted string).

The same subscription works through the imperative API (`handle.addExtension(observer)`) if you need to attach it after mount.

## Coordinates Are UTF-16 Offsets into the Current Markdown

All positions — transaction offsets, `handle.select()`, `handle.getSelection()`, `onSelectionChange` — are UTF-16 code-unit offsets into the document text as the editor holds it (the current Markdown source, `handle.getContent()`).

Two consequences matter in practice:

**Hidden formatting markers stay part of the document.** In live preview mode Galley hides `**`, `*`, `~~` and similar marks visually, but they remain in the text and keep occupying offsets. For the document `текст **кот**` the bold text is at offsets `8..11` — the same coordinates you would compute from the raw Markdown string:

```ts
handle.select(8, 11);           // selects 'кот', inside hidden markers
handle.getContent().slice(8, 11); // 'кот'
```

**Astral characters (emoji) take two code units.** `'🐱 кот'` has length 6, not 5: the emoji occupies offsets `0..2`. Never iterate positions by "character count"; use `string.length` / CodeMirror offsets consistently on both sides of the integration.

## Old Positions Come from `tr.startState`

A `ViewUpdate` shows the document *after* the transaction. If you need positions or text from before the edit (for example, to remap stored ranges), read them from `tr.startState`:

```ts
const observer = EditorView.updateListener.of(({ transactions }) => {
  for (const tr of transactions) {
    if (!tr.docChanged) continue;
    const oldLineCount = tr.startState.doc.lines;
    const newLineCount = tr.state.doc.lines;
    // tr.changes maps old offsets to new ones:
    tr.changes.iterChanges((fromA, toA, fromB, toB) => {
      // fromA/toA — old document; fromB/toB — new document
    });
  }
});
```

`tr.changes.mapPos(oldOffset)` converts any position recorded before the edit to the corresponding position after it.

## Tag Programmatic Replacement with an Annotation

When your app applies an edit programmatically (for example, writing an accepted sidecar edit back into the document), annotate the transaction and skip annotated transactions in your observer. Without this, the observer treats your own write as a user edit and you get a feedback loop:

```ts
import { Annotation } from '@codemirror/state';

const AppliedByHost = Annotation.define<boolean>();

function applyExternalEdit(handle: GalleyHandle, edit: {
  from: number;
  to: number;
  insert: string;
}) {
  handle.view?.dispatch({
    changes: edit,
    annotations: AppliedByHost.of(true),
  });
}

const observer = EditorView.updateListener.of(({ transactions }) => {
  for (const tr of transactions) {
    if (tr.annotation(AppliedByHost)) continue; // our own write — not a user edit
    if (!tr.docChanged) continue;
    // …record user edits only
  }
});
```

## Swapping Callbacks Does Not Touch the Editor

Galley keeps callbacks (`onChange`, `onSelectionChange`, …) in stable refs: a React re-render that changes callback identities never reconfigures the editor and never dispatches a transaction. Your `extensions` observer keeps working across such swaps. Keep the observer itself in a module-level or `useMemo`-stable variable so the `extensions` array identity stays stable too.

## Do Not Copy EOLs Blindly — and Do Not Log Manuscripts

Two operational rules for host applications:

- **Line separators.** CodeMirror normalizes `\r\n` and `\r` to `\n` when a document is loaded and when text is inserted. Offsets you compute from raw file bytes will not match editor offsets once the file contains CRLF. If your storage format must preserve original EOLs and exact bytes, keep the raw file on your side and treat the editor text as a normalized working copy.
- **Privacy.** Transaction contents are the manuscript itself. When debugging or reporting, log offsets and lengths (`{ from, to, insertedLength }`), never the inserted text. The example above deliberately logs `text.length` only.
