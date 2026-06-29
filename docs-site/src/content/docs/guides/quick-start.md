---
title: Quick Start
description: Render a controlled Galley editor and wire common product behaviors.
sidebar:
  order: 20
---

Galley is a controlled React component. Store Markdown in application state and pass it to `value`.

```tsx
import { useRef, useState } from 'react';
import { GalleyEditor, type GalleyHandle } from '@inkyquill/galley-editor';
import '@inkyquill/galley-editor/style.css';

export function MarkdownEditor() {
  const editor = useRef<GalleyHandle>(null);
  const [value, setValue] = useState('# Release notes\n\nStart writing...');

  return (
    <GalleyEditor
      ref={editor}
      value={value}
      onChange={setValue}
      ariaLabel="Release notes editor"
      placeholder="Write Markdown..."
      minRows={12}
      theme="auto"
      onSubmit={() => save(value)}
    />
  );
}
```

## Modes

The editor supports three modes:

| Mode | Behavior |
| --- | --- |
| `live` | Markdown syntax is hidden outside the active node. |
| `markdown` | Raw Markdown stays visible. |
| `preview` | Rendered view only; editing is disabled. |

```tsx
<GalleyEditor mode="live" onModeChange={setMode} />
```

Setting `editable={false}` forces preview mode.

## Toolbar and Footer

The toolbar and footer are enabled by default. Disable them when your app provides its own chrome:

```tsx
<GalleyEditor toolbar={false} footer={false} />
```

Or customize slots while keeping Galley's built-in controls:

```tsx
<GalleyEditor
  toolbar={{
    before: <strong>Draft</strong>,
    after: ({ editor }) => (
      <button type="button" onClick={() => editor?.execCommand('insertHr')}>
        Divider
      </button>
    ),
  }}
  footer={{
    characterCount: true,
    wordCount: true,
    after: ({ mode }) => <span>{mode}</span>,
  }}
/>
```

## Imperative Ref

Use the ref for focus, selection, document updates, commands, and the CodeMirror escape hatch:

```tsx
editor.current?.focus();
editor.current?.insertText('**Important**');
editor.current?.execCommand('toggleHeading', 2);
editor.current?.scrollSelectionIntoView();
```

## Runtime Extensions

For CodeMirror extensions that are not part of Galley's public props, use `extensions` at render time or `addExtension()` at runtime.

```tsx
const disposable = editor.current?.addExtension(myExtension);
disposable?.remove();
```

Prefer stable extension arrays when passing `extensions` as a prop.
