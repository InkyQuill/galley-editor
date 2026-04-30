# Galley Editor

> ⚠️ **In active development.** v0.7.0 is the current public-repository cleanup build, with rendering parity, reference links, safe image rendering, bidi support, hooks, and a cleaned-up source tree. The full feature set continues toward v1.0; see [docs/specs/ROADMAP.md](docs/specs/ROADMAP.md) for status.

A React component that provides a half-WYSIWYG markdown editing experience. Built on CodeMirror 6, this library renders markdown blocks as HTML when you're not editing them, similar to Obsidian's live preview mode.

## Features (current)

- 🎨 Half-WYSIWYG editing — markdown blocks render as HTML when the cursor is not on that line
- 🚀 Real-time markdown rendering powered by Lezer's incremental parser
- 🎯 Lightweight (~12 kB gzipped, no markdown-to-HTML step)
- 🌙 Theme prop API for `light` / `dark` / `auto`, backed by CSS-variable styling
- ⌨️ Imperative ref API for programmatic control
- 🔧 Full TypeScript types

## Installation

This package is currently published to the GitLab Package Registry from a public project. Consumers only need to point the `@inky` scope at the registry; no token is required to install.

1. Configure npm to resolve `@inky` against the GitLab registry. Copy [`.npmrc.example`](./.npmrc.example) to your project root as `.npmrc`, or add this line manually:

   ```
   @inky:registry=https://git.inkyquill.net/api/v4/packages/npm/
   ```

   Because `inky/galley-editor` is public, package pulls are anonymous. Maintainer publishing still uses authenticated CI.

2. Install:

   ```bash
   npm install @inky/galley-editor
   ```

3. Import in your code (CSS import is optional — see [Styling](docs/styling.md)):

   ```tsx
   import { GalleyEditor } from '@inky/galley-editor';
   import '@inky/galley-editor/style.css';
   ```

## Quick Start

```tsx
import React, { useState } from 'react';
import { GalleyEditor } from '@inky/galley-editor';
import '@inky/galley-editor/style.css';

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

## Documentation

- [Architecture](docs/architecture.md)
- [API reference](docs/api-reference.md)
- [Plugins](docs/plugins.md)
- [Styling](docs/styling.md)
- [Roadmap](docs/specs/ROADMAP.md)

Public documentation website sources live in [`docs-site/`](docs-site/). The site is built with Astro Starlight and published together with Storybook in one GitLab Pages instance.

## Development

```bash
git clone https://git.inkyquill.net/inky/galley-editor.git
cd galley-editor
npm install --legacy-peer-deps
npm run dev          # demo app
npm run storybook    # component playground
npm run docs:dev     # documentation site
npm run test         # unit tests
npm run build:lib    # build the publishable library
```

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for the clean-room rule and PR checklist.

## License

MIT — see [`LICENSE`](./LICENSE).

## Acknowledgments

Built on [CodeMirror 6](https://codemirror.net/) and [Lezer](https://lezer.codemirror.net/).

Behavior in this library was informed by studying existing markdown editors, including [Joplin's editor](https://github.com/laurent22/joplin), © 2016-2025 Laurent Cozic, licensed under AGPL-3.0-or-later. No Joplin source code is included in this package or repository; see [`CONTRIBUTING.md`](./CONTRIBUTING.md) for the clean-room workflow.
