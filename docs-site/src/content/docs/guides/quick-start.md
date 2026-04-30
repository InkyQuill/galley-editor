---
title: Quick Start
description: Render a controlled Galley Editor in a React app.
---

Galley is a controlled React component. Keep Markdown in your application state and pass updates through `onChange`.

```tsx
import { useState } from 'react';
import { GalleyEditor } from '@inky/galley-editor';
import '@inky/galley-editor/style.css';

export function NotesEditor() {
  const [markdown, setMarkdown] = useState(`# Design notes

Galley keeps Markdown editable while rendering visual helpers.
`);

  return (
    <GalleyEditor
      value={markdown}
      onChange={setMarkdown}
      minRows={12}
      maxRows={32}
      placeholder="Write in Markdown..."
      theme="auto"
    />
  );
}
```

## Modes

Use `mode` when your app wants to switch between writing and reading states:

```tsx
<GalleyEditor
  value={markdown}
  onChange={setMarkdown}
  mode="live"
/>
```

Available modes:

| Mode | Behavior |
| --- | --- |
| `live` | Visual helpers collapse away from the active Markdown block. |
| `markdown` | Markdown stays visible everywhere. |
| `preview` | Blocks render visually and do not revert on click. |

Setting `editable={false}` forces the editor into rendered preview behavior.

## Imperative Access

Use the ref when you need focus, commands, or direct CodeMirror access.

```tsx
import { useRef } from 'react';
import type { GalleyHandle } from '@inky/galley-editor';

const editor = useRef<GalleyHandle>(null);

editor.current?.focus();
editor.current?.execCommand('toggleBold');
```
