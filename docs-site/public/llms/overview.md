# Galley Editor LLM Overview

Galley Editor is a React Markdown editor built on CodeMirror 6. Markdown remains the persisted source document. Galley decorates the editor view with live-preview rendering and reveals raw Markdown when the user edits the active node.

## Install

```tsx
import { GalleyEditor } from '@inkyquill/galley-editor';
import '@inkyquill/galley-editor/style.css';
```

## Core Example

```tsx
import { useRef, useState } from 'react';
import { GalleyEditor, type GalleyHandle } from '@inkyquill/galley-editor';
import '@inkyquill/galley-editor/style.css';

export function MarkdownEditor() {
  const editor = useRef<GalleyHandle>(null);
  const [value, setValue] = useState('# Draft\n\nStart writing...');

  return (
    <GalleyEditor
      ref={editor}
      value={value}
      onChange={setValue}
      ariaLabel="Markdown editor"
      theme="auto"
    />
  );
}
```

## Main Concepts

- `GalleyEditor` is controlled with `value` and `onChange`.
- Modes are `live`, `markdown`, and `preview`.
- `editable={false}` forces preview behavior.
- Commands run through `ref.current?.execCommand(name, ...args)`.
- Apps own persistence, uploads, product toolbar design, and final styling.
- Galley owns CodeMirror setup, Markdown decorations, built-in commands, and renderer hooks.

## Key Docs

- Human docs: https://inkyquill.github.io/galley-editor/
- Quick start: https://inkyquill.github.io/galley-editor/guides/quick-start/
- Commands: https://inkyquill.github.io/galley-editor/guides/commands/
- Styling: https://inkyquill.github.io/galley-editor/guides/customization/
- Plugins and renderers: https://inkyquill.github.io/galley-editor/guides/plugins-renderers/
- File uploads: https://inkyquill.github.io/galley-editor/guides/uploads/
- API reference: https://inkyquill.github.io/galley-editor/reference/api/
