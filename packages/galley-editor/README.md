# @inkyquill/galley-editor

A React component that provides a half-WYSIWYG markdown editing experience. Built on CodeMirror 6, the editor renders markdown blocks as HTML when you are not editing them, similar to Obsidian's live preview mode.

## Installation

```bash
npm install @inkyquill/galley-editor
```

Import in your code (CSS import is optional):

```tsx
import { GalleyEditor } from '@inkyquill/galley-editor';
import '@inkyquill/galley-editor/style.css';
```

## Quick Start

```tsx
import React, { useState } from 'react';
import { GalleyEditor } from '@inkyquill/galley-editor';
import '@inkyquill/galley-editor/style.css';

function App() {
  const [markdown, setMarkdown] = useState('# Hello\n\nStart typing...');

  return (
    <GalleyEditor
      value={markdown}
      onChange={setMarkdown}
      placeholder="Start typing your markdown here..."
      minRows={10}
      theme="auto"
    />
  );
}
```

## Peer dependencies

The editor expects `react`, `react-dom`, `@codemirror/*`, and `@lezer/*` packages to be provided by the host application. See the full table in the [installation guide](https://inkyquill.github.io/galley-editor/guides/installation/).

## Themes

Built-in theme tokens and palettes used across Galley apps are available as a separate dependency-free package:

```bash
npm install @inkyquill/galley-themes
```

```ts
import { getTheme, themeToCssVariables } from '@inkyquill/galley-themes';

const variables = themeToCssVariables(getTheme('galley-light')!);
```

## Documentation

- Documentation site: <https://inkyquill.github.io/galley-editor/>
- API reference: <https://inkyquill.github.io/galley-editor/reference/api/>
- Storybook: <https://inkyquill.github.io/galley-editor/storybook/>

## License

MIT — see [LICENSE](./LICENSE).
