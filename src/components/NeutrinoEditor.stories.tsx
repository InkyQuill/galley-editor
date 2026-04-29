import type { Meta, StoryObj } from '@storybook/react-vite';
import { useRef, useState, useCallback } from 'react';
import NeutrinoEditor from './NeutrinoEditor';
import ErrorBoundary from './ErrorBoundary';
import type { NeutrinoHandle } from '../types';
import type { NeutrinoPlugin, NeutrinoClassNames } from '../types';
import { Decoration } from '@codemirror/view';
import { makeInlinePlugin } from '../rendering';
import { EditorView } from '@codemirror/view';
import '../neutrino-base.css';
import samplePng from '../../assets/img.png';
import sampleDiagram from '../stories/assets/sample-diagram.svg';
import sampleLandscape from '../stories/assets/sample-landscape.svg';

const meta = {
  title: 'Components/NeutrinoEditor',
  component: NeutrinoEditor,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof NeutrinoEditor>;

export default meta;
type Story = StoryObj<typeof meta>;
type ThemeChoice = 'light' | 'dark' | 'auto';

// ── Sample content ──────────────────────────────────────────────────────────

const sampleMarkdown = `# Neutrino Editor

A **half-WYSIWYG** markdown editor that renders blocks as HTML when you're not editing them.

## Features

- Real-time markdown rendering
- *Italic* and **bold** text support
- \`Inline code\` formatting
- [Links](https://example.com) support
- ~~Strikethrough~~ text

### Images

![Generated landscape sample](${sampleLandscape})

![Generated workflow diagram](${sampleDiagram})

![Generated PNG sample](${samplePng})

### Task Lists

- [ ] Unchecked item
- [x] Checked item

### Code Block

\`\`\`javascript
function hello() {
  console.log("Hello, world!");
}
\`\`\`

> This is a blockquote
> with multiple lines

---

| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
`;

const allFeaturesMarkdown = `# Heading 1

## Heading 2

### Heading 3

#### Heading 4

##### Heading 5

###### Heading 6

This is a paragraph with **bold**, *italic*, ~~strikethrough~~, and \`inline code\`.

You can also use ***bold italic*** text and combine ~~**strikethrough bold**~~ formatting.

[Visit Example](https://example.com) is a link. Here's another: [GitHub](https://github.com).

- Bullet item 1
- Bullet item 2
  - Nested bullet
    - Deeply nested bullet
- Bullet item 3

1. Ordered item 1
2. Ordered item 2
3. Ordered item 3

- [ ] Task: Design the UI
- [x] Task: Implement editor
- [ ] Task: Write documentation
- [x] Task: Add tests

\`\`\`typescript
interface NeutrinoPlugin {
  id: string;
  extensions(classNames: NeutrinoClassNames): Extension[];
}
\`\`\`

> A blockquote can contain **bold** and *italic* text.
> It can also span multiple lines.

---

| Feature | Status | Notes |
|---------|--------|-------|
| Bold | Done | Uses \`**\` |
| Italic | Done | Uses \`*\` |
| Links | Done | \`[text](url)\` |

![Generated landscape sample](${sampleLandscape})

![Generated PNG sample](${samplePng})
`;

// ── Default ─────────────────────────────────────────────────────────────────

function DefaultStory() {
  const [value, setValue] = useState(sampleMarkdown);
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <NeutrinoEditor
        value={value}
        onChange={setValue}
        placeholder="Start typing your markdown here..."
        minRows={10}
      />
    </div>
  );
}

/**
 * The default editor with sample markdown content. Click on any formatted
 * element to reveal the raw markdown. Click away to see it rendered.
 */
export const Default: Story = {
  render: DefaultStory,
};

// ── All Markdown Features ───────────────────────────────────────────────────

function AllFeaturesStory() {
  const [value, setValue] = useState(allFeaturesMarkdown);
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <NeutrinoEditor
        value={value}
        onChange={setValue}
        minRows={15}
      />
    </div>
  );
}

/**
 * Showcases every built-in markdown feature: headings (H1-H6), bold, italic,
 * strikethrough, inline code, links, bullet lists, ordered lists, task lists,
 * code fences, blockquotes, horizontal rules, and tables.
 */
export const AllFeatures: Story = {
  render: AllFeaturesStory,
};

// ── With Toolbar ────────────────────────────────────────────────────────────

function WithToolbarStory() {
  const [value, setValue] = useState('# Try the Toolbar\n\nSelect some text and click a button!');
  const ref = useRef<NeutrinoHandle>(null);

  const btn = (label: string, cmd: string) => (
    <button
      onClick={() => ref.current?.execCommand(cmd)}
      style={{
        padding: '4px 8px',
        border: '1px solid #d1d5db',
        borderRadius: '4px',
        background: '#fff',
        cursor: 'pointer',
        fontSize: '13px',
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '8px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
        {btn('B', 'toggleBold')}
        {btn('I', 'toggleItalic')}
        {btn('S', 'toggleStrikethrough')}
        {btn('Code', 'toggleCode')}
        <button
          onClick={() => ref.current?.execCommand('toggleHeading', 1)}
          style={{
            padding: '4px 8px',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            background: '#fff',
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >
          H1
        </button>
        <button
          onClick={() => ref.current?.execCommand('toggleHeading', 2)}
          style={{
            padding: '4px 8px',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            background: '#fff',
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >
          H2
        </button>
        <button
          onClick={() => ref.current?.execCommand('toggleHeading', 3)}
          style={{
            padding: '4px 8px',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            background: '#fff',
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >
          H3
        </button>
        {btn('UL', 'toggleBulletList')}
        {btn('OL', 'toggleOrderedList')}
        {btn('Task', 'toggleCheckList')}
        {btn('Link', 'insertLink')}
        {btn('Image', 'insertImage')}
        {btn('Code Block', 'insertCodeBlock')}
        {btn('Table', 'insertTable')}
        {btn('HR', 'insertHr')}
        {btn('Indent', 'indent')}
        {btn('Outdent', 'outdent')}
        {btn('Undo', 'undo')}
        {btn('Redo', 'redo')}
      </div>
      <NeutrinoEditor
        ref={ref}
        value={value}
        onChange={setValue}
        minRows={8}
      />
    </div>
  );
}

/**
 * Demonstrates all built-in commands via toolbar buttons. Select text
 * then click a formatting button, or use the insert buttons to add
 * markdown structures at the cursor position.
 */
export const WithToolbar: Story = {
  render: WithToolbarStory,
};

// ── Dark Theme ──────────────────────────────────────────────────────────────

function DarkThemeStory() {
  const [value, setValue] = useState(sampleMarkdown);
  return (
    <div style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: '20px',
      backgroundColor: '#18181b',
      borderRadius: '8px',
    }}>
      <NeutrinoEditor
        value={value}
        onChange={setValue}
        theme="dark"
        minRows={10}
      />
    </div>
  );
}

/**
 * The editor with `theme="dark"`. The wrapper resolves to
 * `data-theme="dark"`, so `neutrino-base.css` applies its dark variable
 * overrides.
 */
export const DarkTheme: Story = {
  render: DarkThemeStory,
};

// ── CSS Variable Overrides ─────────────────────────────────────────────────

function CssVariableOverridesStory() {
  const [value, setValue] = useState(sampleMarkdown);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <style>{`
        .recipe-css-vars {
          --ne-color-text: #18202f;
          --ne-color-text-muted: #657089;
          --ne-color-bg: #fbfcff;
          --ne-color-link: #0f766e;
          --ne-color-link-hover: #115e59;
          --ne-color-code-fg: #18202f;
          --ne-color-code-bg: rgba(15, 118, 110, 0.12);
          --ne-color-code-fence-bg: rgba(15, 118, 110, 0.08);
          --ne-color-blockquote-border: rgba(15, 118, 110, 0.45);
          --ne-color-blockquote-fg: #475569;
          --ne-color-divider: rgba(15, 118, 110, 0.28);
          --ne-color-table-border: rgba(15, 118, 110, 0.24);
          --ne-color-checkbox-accent: #0f766e;
          --ne-color-selection: rgba(15, 118, 110, 0.2);
          --ne-color-focus-ring: #0f766e;
          --ne-font-body: Inter, ui-sans-serif, system-ui, sans-serif;
          --ne-font-size: 0.975rem;
          border: 1px solid rgba(15, 118, 110, 0.2);
          border-radius: 8px;
        }
        .recipe-css-vars[data-theme="dark"] {
          --ne-color-text: #e6edf7;
          --ne-color-text-muted: #9fb0c7;
          --ne-color-bg: #101820;
          --ne-color-code-fg: #e6edf7;
          --ne-color-link: #5eead4;
          --ne-color-link-hover: #99f6e4;
          --ne-color-blockquote-fg: #b6c3d4;
          --ne-color-checkbox-accent: #5eead4;
          --ne-color-selection: rgba(94, 234, 212, 0.26);
          --ne-color-focus-ring: #5eead4;
        }
      `}</style>
      <NeutrinoEditor
        className="recipe-css-vars"
        value={value}
        onChange={setValue}
        theme="auto"
        minRows={10}
      />
    </div>
  );
}

/**
 * A scoped plain-CSS recipe: pass `className` to the wrapper and override
 * `--ne-*` variables there. Dark overrides target the same wrapper when its
 * resolved `data-theme` is `dark`.
 */
export const CssVariableOverrides: Story = {
  render: CssVariableOverridesStory,
};

// ── Tailwind Token Mapping ─────────────────────────────────────────────────

function TailwindTokenMappingStory() {
  const [value, setValue] = useState(allFeaturesMarkdown);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <style>{`
        .recipe-tailwind-tokens {
          --color-editor-text: #111827;
          --color-editor-muted: #6b7280;
          --color-editor-link: #2563eb;
          --color-editor-link-hover: #1d4ed8;
          --color-editor-code-bg: #f1f5f9;
          --color-editor-code-fence-bg: #f8fafc;
          --color-editor-ring: #2563eb;
          --font-editor-body: ui-sans-serif, system-ui, sans-serif;
          --font-editor-mono: ui-monospace, SFMono-Regular, Consolas, monospace;
          --ne-color-text: var(--color-editor-text);
          --ne-color-text-muted: var(--color-editor-muted);
          --ne-color-link: var(--color-editor-link);
          --ne-color-link-hover: var(--color-editor-link-hover);
          --ne-color-code-bg: var(--color-editor-code-bg);
          --ne-color-code-fence-bg: var(--color-editor-code-fence-bg);
          --ne-color-checkbox-accent: var(--color-editor-link);
          --ne-color-focus-ring: var(--color-editor-ring);
          --ne-font-body: var(--font-editor-body);
          --ne-font-mono: var(--font-editor-mono);
          border: 1px solid #dbe4f0;
          border-radius: 8px;
        }
        .recipe-tailwind-tokens[data-theme="dark"] {
          --color-editor-text: #f1f5f9;
          --color-editor-muted: #94a3b8;
          --color-editor-link: #38bdf8;
          --color-editor-link-hover: #7dd3fc;
          --color-editor-code-bg: rgba(148, 163, 184, 0.18);
          --color-editor-code-fence-bg: rgba(148, 163, 184, 0.12);
          --color-editor-ring: #38bdf8;
        }
      `}</style>
      <NeutrinoEditor
        className="recipe-tailwind-tokens"
        value={value}
        onChange={setValue}
        theme="auto"
        minRows={12}
      />
    </div>
  );
}

/**
 * Runtime equivalent of the Tailwind v4 recipe: app tokens such as
 * `--color-editor-link` map into Neutrino's `--ne-*` variables.
 */
export const TailwindTokenMapping: Story = {
  render: TailwindTokenMappingStory,
};

// ── Theme Selector ──────────────────────────────────────────────────────────

function ThemeSelectorStory() {
  const [value, setValue] = useState(sampleMarkdown);
  const [theme, setTheme] = useState<ThemeChoice>('auto');
  const choices: ThemeChoice[] = ['light', 'dark', 'auto'];

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <style>{`
        .recipe-theme-selector {
          border: 1px solid rgba(127, 127, 127, 0.24);
          border-radius: 8px;
        }
      `}</style>
      <div style={{ display: 'inline-flex', gap: '4px', marginBottom: '12px' }}>
        {choices.map((choice) => (
          <button
            key={choice}
            type="button"
            onClick={() => setTheme(choice)}
            style={{
              padding: '6px 10px',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              background: theme === choice ? '#0f172a' : '#ffffff',
              color: theme === choice ? '#ffffff' : '#0f172a',
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {choice}
          </button>
        ))}
      </div>
      <NeutrinoEditor
        className="recipe-theme-selector"
        value={value}
        onChange={setValue}
        theme={theme}
        minRows={10}
      />
    </div>
  );
}

/**
 * Switches the editor through `theme="light"`, `theme="dark"`, and
 * `theme="auto"` so the wrapper `data-theme` behavior is visible.
 */
export const ThemeSelector: Story = {
  render: ThemeSelectorStory,
};

// ── Footer Disabled ────────────────────────────────────────────────────────

function FooterDisabledStory() {
  const [value, setValue] = useState(sampleMarkdown);
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <NeutrinoEditor
        value={value}
        onChange={setValue}
        footer={false}
        minRows={10}
      />
    </div>
  );
}

/**
 * The editor with its built-in status footer disabled via `footer={false}`.
 */
export const FooterDisabled: Story = {
  render: FooterDisabledStory,
};

// ── With Placeholder ────────────────────────────────────────────────────────

function WithPlaceholderStory() {
  const [value, setValue] = useState('');
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <NeutrinoEditor
        value={value}
        onChange={setValue}
        placeholder="Type your markdown here..."
        minRows={4}
      />
    </div>
  );
}

/**
 * An empty editor with placeholder text. The placeholder disappears
 * as soon as you start typing.
 */
export const WithPlaceholder: Story = {
  render: WithPlaceholderStory,
};

// ── Read Only ───────────────────────────────────────────────────────────────

/**
 * The editor in read-only mode (`editable={false}`). Content is rendered
 * with all decorations but cannot be modified. Useful for preview displays.
 */
export const ReadOnly: Story = {
  render: () => {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <NeutrinoEditor
          value={sampleMarkdown}
          editable={false}
          minRows={10}
        />
      </div>
    );
  },
};

// ── Autosize ────────────────────────────────────────────────────────────────

function AutosizeStory() {
  const [value, setValue] = useState('Type more lines to see the editor grow.\n\nIt has minRows=3 and maxRows=15.');
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '8px', fontSize: '14px', color: '#6b7280' }}>
        Editor height: minRows=3, maxRows=15. Add more lines to see it grow.
      </div>
      <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px' }}>
        <NeutrinoEditor
          value={value}
          onChange={setValue}
          minRows={3}
          maxRows={15}
        />
      </div>
    </div>
  );
}

/**
 * Demonstrates the autosize behavior. The editor starts at `minRows=3`
 * and grows as you type until it reaches `maxRows=15`, after which it scrolls.
 */
export const Autosize: Story = {
  render: AutosizeStory,
};

// ── With Event Handlers ─────────────────────────────────────────────────────

function WithEventHandlersStory() {
  const [value, setValue] = useState('# Event Handlers\n\nTry pressing Cmd+Enter or Escape!');
  const [log, setLog] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLog((prev) => [...prev.slice(-19), `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <NeutrinoEditor
        value={value}
        onChange={setValue}
        minRows={6}
        onEnter={(mod, shift) => {
          addLog(`Enter pressed - mod: ${mod}, shift: ${shift}`);
          return false;
        }}
        onSubmit={() => addLog('Submit triggered (Cmd+Enter)')}
        onEscape={() => addLog('Escape pressed')}
        onBlur={() => addLog('Editor blurred')}
        onFocus={() => addLog('Editor focused')}
        onSelectionChange={(sel) => addLog(`Selection: ${sel.from}-${sel.to}`)}
        onScroll={(fraction) => addLog(`Scroll: ${(fraction * 100).toFixed(0)}%`)}
      />
      <div style={{
        marginTop: '16px',
        padding: '12px',
        backgroundColor: '#f3f4f6',
        borderRadius: '8px',
        fontFamily: 'monospace',
        fontSize: '12px',
        maxHeight: '200px',
        overflowY: 'auto',
      }}>
        <strong>Event Log:</strong>
        <ul style={{ marginTop: '8px', listStyle: 'none', padding: 0 }}>
          {log.map((entry, i) => (
            <li key={i} style={{ padding: '2px 0', borderBottom: '1px solid #e5e7eb' }}>
              {entry}
            </li>
          ))}
          {log.length === 0 && <li style={{ color: '#9ca3af' }}>No events yet. Interact with the editor.</li>}
        </ul>
      </div>
    </div>
  );
}

/**
 * All event handlers wired up with a live log. Focus, blur, enter, escape,
 * submit (Cmd+Enter), selection changes, and scroll events are all captured
 * and displayed in the event log below the editor.
 */
export const WithEventHandlers: Story = {
  render: WithEventHandlersStory,
};

// ── Imperative Handle ───────────────────────────────────────────────────────

function ImperativeHandleStory() {
  const [value, setValue] = useState('# Imperative API\n\nUse the buttons below to control the editor programmatically.');
  const ref = useRef<NeutrinoHandle>(null);
  const [output, setOutput] = useState('');

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <NeutrinoEditor ref={ref} value={value} onChange={setValue} minRows={6} />
      <div style={{ marginTop: '12px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
        <button onClick={() => setOutput(ref.current?.getContent() ?? '')}>
          getContent()
        </button>
        <button onClick={() => ref.current?.setContent('# Replaced!\n\nContent was replaced programmatically.')}>
          setContent()
        </button>
        <button onClick={() => ref.current?.insertText('\n\n> Inserted text!')}>
          insertText()
        </button>
        <button onClick={() => ref.current?.focus()}>
          focus()
        </button>
        <button onClick={() => ref.current?.blur()}>
          blur()
        </button>
        <button onClick={() => ref.current?.select(0, ref.current.getContent().length)}>
          selectAll
        </button>
        <button onClick={() => {
          const sel = ref.current?.getSelection();
          setOutput(sel ? `from=${sel.from} to=${sel.to} anchor=${sel.anchor} head=${sel.head}` : '');
        }}>
          getSelection()
        </button>
        <button onClick={() => ref.current?.scrollTo(0)}>
          scrollTo(0)
        </button>
        <button onClick={() => ref.current?.scrollTo(1)}>
          scrollTo(1)
        </button>
        <button onClick={() => ref.current?.undo()}>
          undo()
        </button>
        <button onClick={() => ref.current?.redo()}>
          redo()
        </button>
      </div>
      {output && (
        <pre style={{
          marginTop: '12px',
          padding: '12px',
          backgroundColor: '#f3f4f6',
          borderRadius: '4px',
          fontSize: '12px',
          whiteSpace: 'pre-wrap',
          maxHeight: '200px',
          overflowY: 'auto',
        }}>
          {output}
        </pre>
      )}
    </div>
  );
}

/**
 * Demonstrates the imperative handle API (`NeutrinoHandle`). Use the buttons
 * to call methods like `getContent()`, `setContent()`, `insertText()`,
 * `focus()`, `blur()`, `select()`, `getSelection()`, `scrollTo()`, etc.
 */
export const ImperativeHandle: Story = {
  render: ImperativeHandleStory,
};

// ── Custom Commands ─────────────────────────────────────────────────────────

function CustomCommandsStory() {
  const [value, setValue] = useState('# Custom Commands\n\nSelect text and use the toolbar buttons.');
  const ref = useRef<NeutrinoHandle>(null);
  const [registered, setRegistered] = useState(false);

  const registerCommands = () => {
    if (!ref.current || registered) return;
    ref.current.registerCommand('insertTimestamp', (view) => {
      view.dispatch(view.state.replaceSelection(`[${new Date().toLocaleString()}]`));
      return true;
    });
    ref.current.registerCommand('wrapInCallout', (view) => {
      const sel = view.state.selection.main;
      const text = view.state.sliceDoc(sel.from, sel.to) || 'Your text here';
      view.dispatch(view.state.replaceSelection(`> [!note]\n> ${text}\n`));
      return true;
    });
    ref.current.registerCommand('uppercaseSelection', (view) => {
      const sel = view.state.selection.main;
      const text = view.state.sliceDoc(sel.from, sel.to).toUpperCase();
      if (text) {
        view.dispatch({ changes: { from: sel.from, to: sel.to, insert: text } });
      }
      return true;
    });
    setRegistered(true);
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <NeutrinoEditor ref={ref} value={value} onChange={setValue} minRows={6} />
      <div style={{ marginTop: '12px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
        {!registered && (
          <button onClick={registerCommands} style={{ background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', padding: '6px 12px', cursor: 'pointer' }}>
            Register Custom Commands
          </button>
        )}
        {registered && (
          <>
            <button onClick={() => ref.current?.execCommand('insertTimestamp')}>
              Insert Timestamp
            </button>
            <button onClick={() => ref.current?.execCommand('wrapInCallout')}>
              Wrap in Callout
            </button>
            <button onClick={() => ref.current?.execCommand('uppercaseSelection')}>
              Uppercase Selection
            </button>
          </>
        )}
      </div>
      {registered && (
        <div style={{ marginTop: '8px', fontSize: '13px', color: '#059669' }}>
          3 custom commands registered: insertTimestamp, wrapInCallout, uppercaseSelection
        </div>
      )}
    </div>
  );
}

/**
 * Shows how to register and execute custom commands via `registerCommand()`
 * and `execCommand()`. Click "Register Custom Commands" first, then use the
 * command buttons. Custom commands take precedence over built-ins.
 */
export const CustomCommands: Story = {
  render: CustomCommandsStory,
};

// ── Disabled Plugins ────────────────────────────────────────────────────────

function DisabledPluginsStory() {
  const [value, setValue] = useState(sampleMarkdown);
  const [disabled, setDisabled] = useState<string[]>([]);

  const pluginIds = [
    'ne:headings', 'ne:emphasis', 'ne:code-inline', 'ne:code-fence',
    'ne:blockquote', 'ne:links', 'ne:images', 'ne:lists', 'ne:checkboxes',
    'ne:dividers', 'ne:tables',
  ];

  const toggle = (id: string) => {
    setDisabled((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '12px' }}>
        <strong style={{ fontSize: '14px' }}>Toggle plugins:</strong>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '6px' }}>
          {pluginIds.map((id) => (
            <button
              key={id}
              onClick={() => toggle(id)}
              style={{
                padding: '4px 8px',
                border: '1px solid',
                borderColor: disabled.includes(id) ? '#ef4444' : '#22c55e',
                borderRadius: '4px',
                background: disabled.includes(id) ? '#fef2f2' : '#f0fdf4',
                color: disabled.includes(id) ? '#ef4444' : '#22c55e',
                cursor: 'pointer',
                fontSize: '12px',
                fontFamily: 'monospace',
              }}
            >
              {id.replace('ne:', '')} {disabled.includes(id) ? 'OFF' : 'ON'}
            </button>
          ))}
        </div>
      </div>
      <NeutrinoEditor
        value={value}
        onChange={setValue}
        disabledPlugins={disabled}
        minRows={10}
      />
    </div>
  );
}

/**
 * Demonstrates the `disabledPlugins` prop. Toggle individual built-in plugins
 * on/off to see how the editor renders without them. Disabling a plugin
 * removes its decorations but does not affect the underlying markdown.
 */
export const DisabledPlugins: Story = {
  render: DisabledPluginsStory,
};

// ── Custom Class Names ──────────────────────────────────────────────────────

function CustomClassNamesStory() {
  const [value, setValue] = useState('# Custom Classes\n\n**Bold text** and *italic text* with custom CSS class names.\n\n- [x] Completed task\n- [ ] Pending task');

  const customNames: NeutrinoClassNames = {
    bold: 'custom-bold',
    italic: 'custom-italic',
    h1: 'custom-h1',
    completedTask: 'custom-completed',
    checkbox: 'custom-checkbox',
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <style>{`
        .custom-bold { font-weight: 900; color: #dc2626; }
        .custom-italic { font-style: italic; color: #7c3aed; }
        .custom-h1 { font-size: 2.5em; font-weight: 900; }
        .custom-completed { opacity: 0.3; text-decoration: line-through; }
      `}</style>
      <div style={{ marginBottom: '12px', padding: '12px', background: '#f3f4f6', borderRadius: '8px', fontSize: '13px', fontFamily: 'monospace' }}>
        <div>classNames = {'{'}</div>
        <div>&nbsp;&nbsp;bold: 'custom-bold' <span style={{ color: '#dc2626' }}>(red, weight 900)</span></div>
        <div>&nbsp;&nbsp;italic: 'custom-italic' <span style={{ color: '#7c3aed' }}>(purple)</span></div>
        <div>&nbsp;&nbsp;h1: 'custom-h1' <span style={{ color: '#6b7280' }}>(2.5em)</span></div>
        <div>&nbsp;&nbsp;completedTask: 'custom-completed' <span style={{ color: '#6b7280' }}>(opacity 0.3)</span></div>
        <div>{'}'}</div>
      </div>
      <NeutrinoEditor
        value={value}
        onChange={setValue}
        classNames={customNames}
        minRows={6}
      />
    </div>
  );
}

/**
 * Shows how to override the default `ne-*` CSS classes with custom names
 * via the `classNames` prop. This is useful when integrating into a design
 * system that has its own class naming conventions.
 */
export const CustomClassNames: Story = {
  render: CustomClassNamesStory,
};

/**
 * Recipe-focused alias for the `classNames` escape hatch.
 */
export const ClassNamesOverrides: Story = {
  render: CustomClassNamesStory,
};

// ── Custom Plugin ───────────────────────────────────────────────────────────

const highlightPlugin: NeutrinoPlugin = {
  id: 'custom:highlight',
  extensions() {
    return [
      makeInlinePlugin({
        createDecoration(node) {
          if (node.name !== 'Emphasis') return null;
          const parent = node.node.parent;
          if (parent?.name !== 'StrongEmphasis') return null;
          return Decoration.mark({
            class: 'custom-highlight',
            attributes: { title: 'Highlighted text (bold+italic)' },
          });
        },
        getRevealStrategy: () => false,
        hideWhenNearCursor: false,
      }),
    ];
  },
};

function CustomPluginStory() {
  const [value, setValue] = useState(
    '# Custom Plugin Demo\n\nRegular **bold** and *italic* text.\n\nBut ***bold italic*** text gets a special highlight!\n\nTry typing ***your own highlighted text*** to see it in action.'
  );

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <style>{`
        .custom-highlight {
          background: linear-gradient(120deg, #fef08a 0%, #fde68a 100%);
          padding: 2px 4px;
          border-radius: 3px;
        }
      `}</style>
      <div style={{ marginBottom: '12px', padding: '12px', background: '#fefce8', borderRadius: '8px', fontSize: '13px' }}>
        <strong>Custom plugin:</strong> Bold+italic text (<code>***text***</code>) gets a yellow highlight background.
        This plugin uses <code>makeInlinePlugin</code> to detect <code>Emphasis</code> nodes
        inside <code>StrongEmphasis</code> parents.
      </div>
      <NeutrinoEditor
        value={value}
        onChange={setValue}
        plugins={[highlightPlugin]}
        minRows={6}
      />
    </div>
  );
}

/**
 * Demonstrates building a custom plugin using `makeInlinePlugin`. This example
 * adds a yellow highlight to bold+italic text (`***text***`). Shows how to
 * inspect the syntax tree, check parent nodes, and return decorations.
 */
export const CustomPlugin: Story = {
  render: CustomPluginStory,
};

// ── Custom Extensions ───────────────────────────────────────────────────────

function CustomExtensionsStory() {
  const [value, setValue] = useState('# Custom Extensions\n\nThis editor has a line number gutter and custom key binding.\n\nTry pressing Ctrl+Shift+D to duplicate the current line.');

  const lineNumbers = EditorView.lineWrapping;
  const customKeymap = EditorView.domEventHandlers({
    keydown: (event, view) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'D') {
        event.preventDefault();
        const line = view.state.doc.lineAt(view.state.selection.main.anchor);
        view.dispatch({
          changes: { from: line.to, insert: '\n' + line.text },
        });
        return true;
      }
      return false;
    },
  });

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '12px', padding: '12px', background: '#eff6ff', borderRadius: '8px', fontSize: '13px' }}>
        <strong>Custom extensions:</strong> Added <code>Ctrl+Shift+D</code> to duplicate the current line.
        Extensions are appended after all internal extensions, so they can override built-in behavior.
      </div>
      <NeutrinoEditor
        value={value}
        onChange={setValue}
        extensions={[lineNumbers, customKeymap]}
        minRows={6}
      />
    </div>
  );
}

/**
 * Demonstrates the `extensions` prop for adding raw CodeMirror 6 extensions.
 * Custom extensions are appended after all internal extensions, allowing them
 * to override built-in behavior. This example adds a Ctrl+Shift+D key binding
 * to duplicate the current line.
 */
export const CustomExtensions: Story = {
  render: CustomExtensionsStory,
};

// ── Controlled Value ────────────────────────────────────────────────────────

function ControlledValueStory() {
  const [value, setValue] = useState('# Controlled Component\n\nEdit this text or use the buttons below.');
  const [charCount, setCharCount] = useState(value.length);
  const [lineCount, setLineCount] = useState(value.split('\n').length);

  const handleChange = useCallback((newValue: string) => {
    setValue(newValue);
    setCharCount(newValue.length);
    setLineCount(newValue.split('\n').length);
  }, []);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <NeutrinoEditor value={value} onChange={handleChange} minRows={6} />
      <div style={{ marginTop: '12px', display: 'flex', gap: '16px', fontSize: '13px', color: '#6b7280' }}>
        <span>Characters: {charCount}</span>
        <span>Lines: {lineCount}</span>
      </div>
      <div style={{ marginTop: '8px', display: 'flex', gap: '4px' }}>
        <button onClick={() => handleChange('# Fresh Content\n\nReplaced via controlled value.')}>
          Replace Content
        </button>
        <button onClick={() => handleChange('')}>
          Clear
        </button>
        <button onClick={() => handleChange(value + '\n\nAppended paragraph.')}>
          Append
        </button>
      </div>
    </div>
  );
}

/**
 * Shows the controlled component pattern. The `value` prop controls the content,
 * and `onChange` reports changes. External buttons modify the value state,
 * demonstrating two-way data flow. Character and line counts update in real time.
 */
export const ControlledValue: Story = {
  render: ControlledValueStory,
};

// ── Editor Class Name ───────────────────────────────────────────────────────

function EditorClassNameStory() {
  const [value, setValue] = useState('# Styled Editor\n\nThis editor has custom border and shadow applied via `editorClassName`.');

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <style>{`
        .styled-editor {
          border: 2px solid #6366f1;
          border-radius: 12px;
          box-shadow: 0 4px 16px rgba(99, 102, 241, 0.15);
          transition: border-color 0.2s;
        }
        .styled-editor:focus-within {
          border-color: #4f46e5;
          box-shadow: 0 4px 16px rgba(99, 102, 241, 0.3);
        }
      `}</style>
      <NeutrinoEditor
        value={value}
        onChange={setValue}
        className="my-wrapper"
        editorClassName="styled-editor"
        minRows={6}
      />
      <div style={{ marginTop: '8px', fontSize: '13px', color: '#6b7280' }}>
        <code>className="my-wrapper"</code> on the outer div, <code>editorClassName="styled-editor"</code> on the CM6 element.
      </div>
    </div>
  );
}

/**
 * Demonstrates `className` (outer wrapper) and `editorClassName` (CodeMirror element)
 * props. The `editorClassName` applies directly to `.cm-editor`, enabling custom
 * borders, shadows, and focus effects on the editor itself.
 */
export const EditorClassName: Story = {
  render: EditorClassNameStory,
};

// ── With Error Boundary ─────────────────────────────────────────────────────

function ErrorBoundaryStory() {
  const [value, setValue] = useState('# Error Boundary\n\nThe editor is wrapped in an ErrorBoundary for graceful error handling.');

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '12px', padding: '12px', background: '#fef2f2', borderRadius: '8px', fontSize: '13px' }}>
        <strong>ErrorBoundary</strong> wraps the editor to catch rendering errors.
        It shows a fallback UI with error details and a "Try Again" button.
      </div>
      <ErrorBoundary>
        <NeutrinoEditor value={value} onChange={setValue} minRows={6} />
      </ErrorBoundary>
    </div>
  );
}

/**
 * Shows the `ErrorBoundary` component wrapping the editor. If the editor
 * throws a rendering error, the boundary catches it and displays a recovery UI
 * with error details and a "Try Again" button.
 */
export const WithErrorBoundary: Story = {
  render: ErrorBoundaryStory,
};

// ── Custom Error Boundary Fallback ──────────────────────────────────────────

function CustomFallbackStory() {
  const [value, setValue] = useState('# Custom Fallback\n\nThe ErrorBoundary has a custom fallback UI.');

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <ErrorBoundary
        fallback={
          <div style={{
            padding: '40px',
            textAlign: 'center',
            background: '#fafafa',
            borderRadius: '8px',
            border: '1px dashed #d1d5db',
          }}>
            <p style={{ fontSize: '18px', fontWeight: 600 }}>Editor unavailable</p>
            <p style={{ color: '#6b7280' }}>Please refresh the page to try again.</p>
          </div>
        }
      >
        <NeutrinoEditor value={value} onChange={setValue} minRows={6} />
      </ErrorBoundary>
    </div>
  );
}

/**
 * ErrorBoundary with a custom `fallback` prop. Instead of the default error panel,
 * a clean fallback UI is shown when an error occurs.
 */
export const CustomErrorFallback: Story = {
  render: CustomFallbackStory,
};

// ── Dynamic Runtime Extension ───────────────────────────────────────────────

function RuntimeExtensionStory() {
  const [value, setValue] = useState('# Runtime Extensions\n\nClick the button to add a word count extension at runtime.\n\nThe extension can be removed after adding it.');
  const ref = useRef<NeutrinoHandle>(null);
  const [handle, setHandle] = useState<{ remove: () => void } | null>(null);
  const [wordCount, setWordCount] = useState(0);

  const addExtension = () => {
    if (!ref.current || handle) return;
    const ext = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        const words = update.state.doc.toString().trim().split(/\s+/).filter(Boolean).length;
        setWordCount(words);
      }
    });
    const h = ref.current.addExtension(ext);
    setHandle(h);
    // Trigger initial count
    const words = ref.current.getContent().trim().split(/\s+/).filter(Boolean).length;
    setWordCount(words);
  };

  const removeExtension = () => {
    if (handle) {
      handle.remove();
      setHandle(null);
      setWordCount(0);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <NeutrinoEditor ref={ref} value={value} onChange={setValue} minRows={6} />
      <div style={{ marginTop: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
        {!handle ? (
          <button onClick={addExtension} style={{ background: '#22c55e', color: 'white', border: 'none', borderRadius: '4px', padding: '6px 12px', cursor: 'pointer' }}>
            Add Word Count Extension
          </button>
        ) : (
          <>
            <span style={{ fontSize: '14px', fontWeight: 600 }}>Words: {wordCount}</span>
            <button onClick={removeExtension} style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', padding: '6px 12px', cursor: 'pointer' }}>
              Remove Extension
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Demonstrates `addExtension()` for adding CM6 extensions at runtime.
 * A word count extension is added dynamically and can be removed via the
 * returned handle. This is useful for features that are toggled on/off.
 */
export const RuntimeExtension: Story = {
  render: RuntimeExtensionStory,
};

// ── Selection Tracking ──────────────────────────────────────────────────────

function SelectionTrackingStory() {
  const [value, setValue] = useState('# Selection Tracking\n\nSelect some text to see the selection details below.\n\nTry selecting across **bold text** and [links](https://example.com).');
  const [selection, setSelection] = useState({ from: 0, to: 0, anchor: 0, head: 0 });
  const [selectedText, setSelectedText] = useState('');
  const ref = useRef<NeutrinoHandle>(null);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <NeutrinoEditor
        ref={ref}
        value={value}
        onChange={setValue}
        onSelectionChange={(sel) => {
          setSelection(sel);
          if (ref.current) {
            const content = ref.current.getContent();
            setSelectedText(content.slice(sel.from, sel.to));
          }
        }}
        minRows={6}
      />
      <div style={{
        marginTop: '12px',
        padding: '12px',
        background: '#f3f4f6',
        borderRadius: '8px',
        fontFamily: 'monospace',
        fontSize: '12px',
      }}>
        <div>from: {selection.from} | to: {selection.to} | anchor: {selection.anchor} | head: {selection.head}</div>
        <div style={{ marginTop: '4px' }}>
          length: {selection.to - selection.from}
          {selectedText && (
            <span> | text: "{selectedText.length > 60 ? selectedText.slice(0, 60) + '...' : selectedText}"</span>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Live selection tracking via the `onSelectionChange` callback. Shows
 * from/to/anchor/head positions and the selected text. Useful for building
 * toolbars that react to the current selection state.
 */
export const SelectionTracking: Story = {
  render: SelectionTrackingStory,
};

// ── Paste Handler ───────────────────────────────────────────────────────────

function PasteHandlerStory() {
  const [value, setValue] = useState('# Paste Handler\n\nTry pasting some text (Cmd+V / Ctrl+V) to see the paste event details.');
  const [pasteLog, setPasteLog] = useState<string[]>([]);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <NeutrinoEditor
        value={value}
        onChange={setValue}
        onPaste={(event) => {
          const text = event.clipboardData?.getData('text/plain') ?? '';
          const html = event.clipboardData?.getData('text/html') ?? '';
          const types = Array.from(event.clipboardData?.types ?? []).join(', ');
          setPasteLog((prev) => [
            ...prev.slice(-9),
            `${new Date().toLocaleTimeString()} | types: [${types}] | text: "${text.slice(0, 80)}${text.length > 80 ? '...' : ''}"${html ? ' | has HTML' : ''}`,
          ]);
        }}
        minRows={6}
      />
      <div style={{
        marginTop: '12px',
        padding: '12px',
        background: '#f3f4f6',
        borderRadius: '8px',
        fontFamily: 'monospace',
        fontSize: '11px',
        maxHeight: '150px',
        overflowY: 'auto',
      }}>
        <strong>Paste Log:</strong>
        {pasteLog.length === 0 && <div style={{ color: '#9ca3af', marginTop: '4px' }}>No pastes yet.</div>}
        {pasteLog.map((entry, i) => (
          <div key={i} style={{ marginTop: '4px', borderBottom: '1px solid #e5e7eb', paddingBottom: '4px' }}>
            {entry}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Demonstrates the `onPaste` event handler. Paste content into the editor
 * to see clipboard data types, text content, and HTML presence logged below.
 * Useful for building custom paste processing (e.g. converting HTML to markdown).
 */
export const PasteHandler: Story = {
  render: PasteHandlerStory,
};
