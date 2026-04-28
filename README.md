# Neutrino Editor

> ⚠️ **In active development.** v0.2.0 is the first publishable build. The full feature set lands across v0.3 → v1.0; see [docs/specs/ROADMAP.md](docs/specs/ROADMAP.md) for status.

A React component that provides a half-WYSIWYG markdown editing experience. Built on CodeMirror 6, this library renders markdown blocks as HTML when you're not editing them, similar to Obsidian's live preview mode.

## Features (current)

- 🎨 Half-WYSIWYG editing — markdown blocks render as HTML when the cursor is not on that line
- 🚀 Real-time markdown rendering powered by Lezer's incremental parser
- 🎯 Lightweight (~12 kB gzipped, no markdown-to-HTML step)
- 🌙 Theme prop API for `light` / `dark` / `auto` (styling implementation lands in v0.3)
- ⌨️ Imperative ref API for programmatic control
- 🔧 Full TypeScript types

## Installation

This package is currently published to a private GitLab Package Registry.

1. Configure npm to resolve `@inky` against the GitLab registry. Copy [`.npmrc.example`](./.npmrc.example) to your project root as `.npmrc` and supply a token:

   ```
   @inky:registry=https://git.inkyquill.net/api/v4/packages/npm/
   //git.inkyquill.net/api/v4/packages/npm/:_authToken=${GITLAB_TOKEN}
   ```

   Generate the token at *git.inkyquill.net → User Settings → Access Tokens*, scoped to `read_package_registry`.

2. Install:

   ```bash
   npm install @inky/neutrino-editor
   ```

3. Import in your code (CSS import is optional — see [Styling](docs/styling.md)):

   ```tsx
   import { NeutrinoEditor } from '@inky/neutrino-editor';
   import '@inky/neutrino-editor/style.css';
   ```

## Quick Start

```tsx
import React, { useState } from 'react';
import { NeutrinoEditor } from '@inky/neutrino-editor';
import '@inky/neutrino-editor/style.css';

function App() {
  const [markdown, setMarkdown] = useState('# Hello\n\nStart typing...');

  return (
    <NeutrinoEditor
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

## Development

```bash
git clone https://git.inkyquill.net/inky/neutrino-editor.git
cd neutrino-editor
npm install --legacy-peer-deps
npm run dev          # demo app
npm run storybook    # component playground
npm run test         # unit tests
npm run build:lib    # build the publishable library
```

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for the clean-room rule and PR checklist.

## License

MIT — see [`LICENSE`](./LICENSE).

## Acknowledgments

Built on [CodeMirror 6](https://codemirror.net/) and [Lezer](https://lezer.codemirror.net/).

Behavior in this library was inspired by studying [Joplin's editor](https://github.com/laurent22/joplin), © 2016-2025 Laurent Cozic, licensed under AGPL-3.0-or-later. No Joplin source code is included in this package; see [`CONTRIBUTING.md`](./CONTRIBUTING.md) for the clean-room workflow.
