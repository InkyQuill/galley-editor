# Neutrino Editor

A React component that provides a half-WYSIWYG markdown editing experience. Built on CodeMirror 6, this library renders markdown blocks as HTML when you're not editing them, similar to Obsidian's live preview mode.

## Features

- 🎨 **Half-WYSIWYG editing** - Markdown blocks render as HTML when the cursor is not on that line
- 🚀 **Real-time rendering** - See your markdown formatted as you type
- 🎯 **Lightweight** - Built on CodeMirror 6 with minimal dependencies
- 🌙 **Dark/light theme support** - Built-in theme switching with auto-detection
- ⌨️ **Rich keyboard shortcuts** - Customizable keyboard handlers
- 🔧 **TypeScript support** - Full type safety with TypeScript definitions
- 📱 **Mobile friendly** - Touch-friendly editing experience

## Installation

```bash
npm install @inkyquill/neutrino-editor
```

## Quick Start

```jsx
import React, { useState } from 'react';
import { NeutrinoEditor } from '@inkyquill/neutrino-editor';

function App() {
  const [markdown, setMarkdown] = useState('# Hello World\n\nStart typing...');

  return (
    <div className="p-4">
      <NeutrinoEditor
        value={markdown}
        onChange={setMarkdown}
        placeholder="Start typing your markdown here..."
        className="w-full h-64"
        theme="auto"
      />
    </div>
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | `''` | The markdown content |
| `onChange` | `(value: string) => void` | - | Called when content changes |
| `onEnter` | `(editor: EditorView, mod: boolean, shift: boolean) => boolean` | - | Handle Enter key. Return true to prevent default behavior |
| `onEscape` | `(editor: EditorView) => void` | - | Handle Escape key |
| `onSubmit` | `(editor: EditorView) => void` | - | Handle Cmd+Enter or Ctrl+Enter |
| `onBlur` | `(editor: EditorView) => void` | - | Handle blur events |
| `onPaste` | `(e: ClipboardEvent, editor: EditorView) => void` | - | Handle paste events |
| `placeholder` | `string` | `''` | Placeholder text when empty |
| `className` | `string` | `''` | Additional CSS classes |
| `editable` | `boolean` | `true` | Whether the editor is editable |
| `theme` | `'light' \| 'dark' \| 'auto'` | `'auto'` | Color theme |

## Keyboard Shortcuts

- `Enter` - New line with smart list continuation
- `Cmd/Ctrl + Enter` - Submit/submit action
- `Shift + Enter` - New line (different behavior)
- `Tab` - Indent
- `Escape` - Blur/focus out

## How It Works

The editor uses a half-WYSIWYG approach:
- When your cursor is on a line, you see the raw markdown source
- When your cursor moves away, the line automatically renders as formatted HTML
- This gives you the best of both worlds: easy editing with visual feedback

## Styling

The component is designed to work with Tailwind CSS and custom styling:

```jsx
<NeutrinoEditor
  className="border-2 border-blue-500 rounded-lg focus:ring-4 focus:ring-blue-200"
  theme="dark"
/>
```

## Advanced Usage

### Custom Event Handlers

```jsx
function MyEditor() {
  const handleSubmit = (editor) => {
    const content = editor.state.doc.toString();
    console.log('Submitted:', content);
  };

  const handleEnter = (editor, mod, shift) => {
    if (mod) {
      handleSubmit(editor);
      return true; // Prevent default behavior
    }
    return false; // Allow default behavior
  };

  return (
    <NeutrinoEditor
      onSubmit={handleSubmit}
      onEnter={handleEnter}
    />
  );
}
```

### Theme Integration

```jsx
const [theme, setTheme] = useState('auto');

// Switch between themes
<button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
  Toggle Theme
</button>

<NeutrinoEditor
  theme={theme}
  className={theme === 'dark' ? 'border-gray-700' : 'border-gray-300'}
/>
```

## Development

```bash
# Install dependencies
npm install

# Start Storybook
npm run storybook

# Build for production
npm run build:lib
```

## License

MIT License - see LICENSE file for details.

## Acknowledgments

- Built on [CodeMirror 6](https://codemirror.net/)
- Markdown parsing powered by [markdown-it](https://github.com/markdown-it/markdown-it)
