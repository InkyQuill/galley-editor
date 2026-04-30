import type { Meta, StoryObj } from '@storybook/react-vite';
import { useArgs } from 'storybook/preview-api';
import { useRef, useState, useCallback, useEffect, type CSSProperties } from 'react';
import GalleyEditor from './GalleyEditor';
import ErrorBoundary from './ErrorBoundary';
import type {
  GalleyEditorProps,
  GalleyFileInput,
  GalleyFileStatus,
  GalleyHandle,
  GalleyImageInfo,
  GalleyMode,
} from '../types';
import type { GalleyPlugin, GalleyClassNames } from '../types';
import { Decoration } from '@codemirror/view';
import { makeInlinePlugin } from '../rendering';
import { EditorView } from '@codemirror/view';
import '../galley-base.css';
import galleyMark from '../../assets/galley.png';
import galleyLogo from '../../assets/galley-color.png';

const meta = {
  title: 'Components/GalleyEditor',
  component: GalleyEditor,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    value: { control: 'text' },
    placeholder: { control: 'text' },
    editable: { control: 'boolean' },
    minRows: { control: { type: 'number', min: 1, max: 24, step: 1 } },
    maxRows: { control: { type: 'number', min: 1, max: 30, step: 1 } },
    theme: { control: 'inline-radio', options: ['light', 'dark', 'auto'] },
    mode: { control: 'inline-radio', options: ['live', 'markdown', 'preview'] },
    toolbar: { control: 'boolean' },
    footer: { control: 'boolean' },
    tabIndents: { control: 'boolean' },
    bidi: { control: 'boolean' },
    onChange: { table: { disable: true } },
    plugins: { table: { disable: true } },
    extensions: { table: { disable: true } },
    keymap: { table: { disable: true } },
    imageRenderer: { table: { disable: true } },
    codeHighlighter: { table: { disable: true } },
    onPaste: { table: { disable: true } },
  },
} satisfies Meta<typeof GalleyEditor>;

export default meta;
type Story = StoryObj<typeof meta>;
type ThemeChoice = 'light' | 'dark' | 'auto';
type UploadLogEntry = Pick<GalleyFileStatus, 'id' | 'phase' | 'progress' | 'message' | 'source'> & {
  fileNames: string;
};

const escapeMarkdownAlt = (value: string) => value.replace(/[\n\r[\]\\]/g, ' ').trim();

const fakeUpload = async (file: File) =>
  `![${escapeMarkdownAlt(file.name)}](/uploads/${encodeURIComponent(file.name)})`;

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

const markdownPreviewStyle = {
  marginTop: '12px',
  padding: '12px',
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace',
  fontSize: '12px',
  lineHeight: 1.5,
  overflowX: 'auto',
  whiteSpace: 'pre-wrap',
} satisfies CSSProperties;

function MarkdownPreview({ value }: { value: string }) {
  return (
    <pre aria-label="Current markdown" style={markdownPreviewStyle}>
      {value}
    </pre>
  );
}

function UploadStatusLog({ rows }: { rows: UploadLogEntry[] }) {
  return (
    <div
      aria-label="Upload status"
      aria-live="polite"
      role="status"
      style={{
        marginTop: '12px',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        overflow: 'hidden',
      }}
    >
      <div style={{
        display: 'grid',
        gridTemplateColumns: '90px minmax(120px, 1fr) 90px minmax(120px, 1.4fr)',
        gap: '8px',
        padding: '8px 10px',
        background: '#f9fafb',
        color: '#4b5563',
        fontSize: '12px',
        fontWeight: 700,
      }}>
        <span>Source</span>
        <span>Files</span>
        <span>Progress</span>
        <span>Status</span>
      </div>
      {rows.length === 0 ? (
        <div style={{ padding: '10px', color: '#6b7280', fontSize: '13px' }}>
          No uploads yet.
        </div>
      ) : rows.map((row) => (
        <div
          key={row.id}
          style={{
            display: 'grid',
            gridTemplateColumns: '90px minmax(120px, 1fr) 90px minmax(120px, 1.4fr)',
            gap: '8px',
            padding: '8px 10px',
            borderTop: '1px solid #e5e7eb',
            fontSize: '13px',
          }}
        >
          <span>{row.source}</span>
          <span>{row.fileNames}</span>
          <span>{row.progress === undefined ? '-' : `${Math.round(row.progress * 100)}%`}</span>
          <span>{row.message ?? row.phase}</span>
        </div>
      ))}
    </div>
  );
}

function appendFileStatus(rows: UploadLogEntry[], status: GalleyFileStatus): UploadLogEntry[] {
  const nextRow = {
    id: status.id,
    phase: status.phase,
    progress: status.progress,
    message: status.message,
    source: status.source,
    fileNames: status.files.map((file) => file.name).join(', '),
  };
  const existingIndex = rows.findIndex((row) => row.id === status.id);
  if (existingIndex === -1) return [...rows.slice(-5), nextRow];
  return rows.map((row, index) => (index === existingIndex ? nextRow : row));
}

async function uploadFilesWithProgress(input: GalleyFileInput) {
  const markdown: string[] = [];
  for (const [index, file] of input.files.entries()) {
    input.report({
      phase: 'progress',
      progress: index / input.files.length,
      message: `Uploading ${file.name}`,
    });
    await wait(250);
    markdown.push(await fakeUpload(file));
    input.report({
      phase: 'progress',
      progress: (index + 1) / input.files.length,
      message: `Uploaded ${file.name}`,
    });
  }
  return markdown;
}

function firstImageRange(markdown: string) {
  const match = /!\[[^\]]*\]\([^)]*\)(?:\{[^}]*\})?/.exec(markdown);
  if (!match) return null;
  return { from: match.index, to: match.index + match[0].length };
}

function selectFirstImage(editor: GalleyHandle | null, markdown: string) {
  const range = firstImageRange(markdown);
  if (!editor || !range) return false;
  editor.select(range.from, range.to);
  return true;
}

// ── Sample content ──────────────────────────────────────────────────────────

const sampleMarkdown = `# Galley Editor

A **half-WYSIWYG** markdown editor that renders blocks as HTML when you're not editing them.

## Features

- Real-time markdown rendering
- *Italic* and **bold** text support
- \`Inline code\` formatting
- [Links](https://example.com) support
- ~~Strikethrough~~ text

### Images

![Galley project logo](${galleyLogo})

![Galley monochrome mark](${galleyMark})

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
interface GalleyPlugin {
  id: string;
  extensions(classNames: GalleyClassNames): Extension[];
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

![Galley project logo](${galleyLogo})

![Galley monochrome mark](${galleyMark})
`;

// ── Default ─────────────────────────────────────────────────────────────────

function DefaultStory() {
  const [value, setValue] = useState(sampleMarkdown);
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <GalleyEditor
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

// ── Controls Playground ────────────────────────────────────────────────────

function ControlsStory(args: GalleyEditorProps) {
  const [, updateArgs] = useArgs<GalleyEditorProps>();

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto' }}>
      <GalleyEditor
        {...args}
        value={args.value ?? ''}
        onChange={(nextValue) => updateArgs({ value: nextValue })}
      />
    </div>
  );
}

/**
 * Storybook controls for the public component props that are useful to tune
 * interactively: theme, mode, editability, sizing, toolbar/footer visibility,
 * placeholder text, bidi support, and Tab behavior.
 */
export const Controls: Story = {
  args: {
    value: sampleMarkdown,
    placeholder: 'Start typing your markdown here...',
    editable: true,
    minRows: 10,
    maxRows: undefined,
    theme: 'auto',
    mode: 'live',
    toolbar: true,
    footer: true,
    tabIndents: true,
    bidi: false,
  },
  render: ControlsStory,
};

// ── All Markdown Features ───────────────────────────────────────────────────

function AllFeaturesStory() {
  const [value, setValue] = useState(allFeaturesMarkdown);
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <GalleyEditor
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

// ── Image Rendering ────────────────────────────────────────────────────────

function ImageRenderingStory() {
  const [value, setValue] = useState(`## Default image widgets

![Galley project logo](${galleyLogo})

![Galley monochrome mark](${galleyMark})

## Custom renderer

Enable the renderer below to opt into thumbnails.`);
  const [thumbnails, setThumbnails] = useState(false);

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <label style={{ display: 'inline-flex', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
        <input
          type="checkbox"
          checked={thumbnails}
          onChange={(event) => setThumbnails(event.currentTarget.checked)}
        />
        Use custom imageRenderer
      </label>
      <GalleyEditor
        value={value}
        onChange={setValue}
        minRows={10}
        imageRenderer={thumbnails
          ? ({ alt, url }) => {
            const image = document.createElement('img');
            image.src = url;
            image.alt = alt;
            image.loading = 'lazy';
            image.style.maxWidth = '280px';
            image.style.borderRadius = '8px';
            image.style.display = 'block';
            return image;
          }
          : undefined}
      />
    </div>
  );
}

export const ImageRendering: Story = {
  render: ImageRenderingStory,
};

// ── Asset Workflows ────────────────────────────────────────────────────────

function PasteUploadWorkflowStory() {
  const [value, setValue] = useState('# Paste Upload Workflow\n\nPaste one or more image files into the editor.');
  const [statusRows, setStatusRows] = useState<UploadLogEntry[]>([]);

  return (
    <div style={{ maxWidth: '880px', margin: '0 auto' }}>
      <GalleyEditor
        value={value}
        onChange={setValue}
        minRows={8}
        onFiles={uploadFilesWithProgress}
        onFileStatus={(status) => setStatusRows((rows) => appendFileStatus(rows, status))}
      />
      <UploadStatusLog rows={statusRows} />
      <MarkdownPreview value={value} />
    </div>
  );
}

/**
 * Demonstrates async file paste handling with `onFiles`, consumer progress
 * updates through `input.report()`, and app-level status rendering through
 * `onFileStatus`.
 */
export const PasteUploadWorkflow: Story = {
  render: PasteUploadWorkflowStory,
};

function DropUploadWorkflowStory() {
  const [value, setValue] = useState('# Drop Upload Workflow\n\nDrop image files between paragraphs.\n\nThe uploaded markdown is inserted at the drop position.');
  const [statusRows, setStatusRows] = useState<UploadLogEntry[]>([]);

  return (
    <div style={{ maxWidth: '880px', margin: '0 auto' }}>
      <GalleyEditor
        value={value}
        onChange={setValue}
        minRows={8}
        onFiles={uploadFilesWithProgress}
        onFileStatus={(status) => setStatusRows((rows) => appendFileStatus(rows, status))}
      />
      <UploadStatusLog rows={statusRows} />
      <MarkdownPreview value={value} />
    </div>
  );
}

/**
 * Shows the same consumer-owned upload flow for drag and drop. Galley keeps
 * the original drop selection while the async upload runs, then inserts the
 * returned markdown when the promise resolves.
 */
export const DropUploadWorkflow: Story = {
  render: DropUploadWorkflowStory,
};

function ImageMetadataEditorStory() {
  const initialMarkdown = '## Image Metadata\n\n![Draft hero](/uploads/hero.png "Hero image"){width=640 height=360}\n\nSelect the image or use the controls below to update the metadata.';
  const [value, setValue] = useState(initialMarkdown);
  const [alt, setAlt] = useState('Product screenshot');
  const [url, setUrl] = useState('/uploads/product-screenshot.png');
  const [title, setTitle] = useState('Annotated product screenshot');
  const [width, setWidth] = useState('720');
  const [height, setHeight] = useState('405');
  const editorRef = useRef<GalleyHandle>(null);

  const applyMetadata = () => {
    if (!selectFirstImage(editorRef.current, editorRef.current?.getContent() ?? value)) return;
    editorRef.current?.execCommand('updateImageMetadata', {
      alt,
      url,
      title: title.trim() ? title : null,
      width: width.trim() ? Number(width) : null,
      height: height.trim() ? Number(height) : null,
    });
  };

  const clearDimensions = () => {
    if (!selectFirstImage(editorRef.current, editorRef.current?.getContent() ?? value)) return;
    editorRef.current?.execCommand('clearImageDimensions');
    setWidth('');
    setHeight('');
  };

  return (
    <div style={{ maxWidth: '920px', margin: '0 auto' }}>
      <GalleyEditor
        ref={editorRef}
        value={value}
        onChange={setValue}
        minRows={8}
      />
      <div
        style={{
          marginTop: '12px',
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: '10px',
        }}
      >
        <label style={{ display: 'grid', gap: '4px', fontSize: '13px' }}>
          Alt
          <input value={alt} onChange={(event) => setAlt(event.currentTarget.value)} />
        </label>
        <label style={{ display: 'grid', gap: '4px', fontSize: '13px' }}>
          URL
          <input value={url} onChange={(event) => setUrl(event.currentTarget.value)} />
        </label>
        <label style={{ display: 'grid', gap: '4px', fontSize: '13px' }}>
          Title
          <input value={title} onChange={(event) => setTitle(event.currentTarget.value)} />
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <label style={{ display: 'grid', gap: '4px', fontSize: '13px' }}>
            Width
            <input inputMode="numeric" value={width} onChange={(event) => setWidth(event.currentTarget.value)} />
          </label>
          <label style={{ display: 'grid', gap: '4px', fontSize: '13px' }}>
            Height
            <input inputMode="numeric" value={height} onChange={(event) => setHeight(event.currentTarget.value)} />
          </label>
        </div>
      </div>
      <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button type="button" onClick={applyMetadata}>
          Apply metadata
        </button>
        <button type="button" onClick={clearDimensions}>
          Clear dimensions
        </button>
      </div>
      <MarkdownPreview value={value} />
    </div>
  );
}

/**
 * Demonstrates the `updateImageMetadata` and `clearImageDimensions` commands.
 * The metadata syntax stays in Markdown as `![Alt](image.png "Title"){width=640 height=360}`.
 */
export const ImageMetadataEditor: Story = {
  render: ImageMetadataEditorStory,
};

function ResizableImageRendererStory() {
  const [value, setValue] = useState('## Resizable Renderer\n\n![Dashboard screenshot](/uploads/dashboard.png "Dashboard"){width=480 height=270}\n\nThe custom renderer reads image dimensions and writes them back to markdown.');
  const editorRef = useRef<GalleyHandle>(null);

  const selectImage = useCallback((image: GalleyImageInfo) => {
    editorRef.current?.select(image.from, image.to);
  }, []);

  const renderImage = useCallback((image: GalleyImageInfo) => {
    const figure = document.createElement('figure');
    figure.style.display = 'inline-grid';
    figure.style.gap = '8px';
    figure.style.margin = '0';
    figure.style.maxWidth = '100%';

    const img = document.createElement('img');
    img.src = image.url;
    img.alt = image.alt;
    if (image.title) img.title = image.title;
    img.loading = 'lazy';
    img.style.display = 'block';
    img.style.maxWidth = '100%';
    img.style.width = image.width ? `${image.width}px` : 'min(100%, 420px)';
    if (image.height) img.style.height = `${image.height}px`;
    img.style.objectFit = 'cover';
    img.style.borderRadius = '8px';

    const controls = document.createElement('div');
    controls.style.display = 'flex';
    controls.style.gap = '6px';
    controls.style.flexWrap = 'wrap';

    const makeButton = (label: string, onClick: () => void) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.style.border = '1px solid #cbd5e1';
      button.style.borderRadius = '6px';
      button.style.background = '#ffffff';
      button.style.cursor = 'pointer';
      button.style.fontSize = '12px';
      button.style.padding = '4px 8px';
      button.addEventListener('mousedown', (event) => event.preventDefault());
      button.addEventListener('click', () => {
        selectImage(image);
        onClick();
      });
      return button;
    };

    controls.append(
      makeButton('320px', () => editorRef.current?.execCommand('updateImageMetadata', { width: 320, height: 180 })),
      makeButton('+80px', () => editorRef.current?.execCommand('updateImageMetadata', {
        width: (image.width ?? 480) + 80,
        height: image.height ? image.height + 45 : undefined,
      })),
      makeButton('Clear size', () => editorRef.current?.execCommand('clearImageDimensions')),
    );

    figure.append(img, controls);
    return figure;
  }, [selectImage]);

  return (
    <div style={{ maxWidth: '920px', margin: '0 auto' }}>
      <GalleyEditor
        ref={editorRef}
        value={value}
        onChange={setValue}
        minRows={8}
        imageRenderer={renderImage}
      />
      <MarkdownPreview value={value} />
    </div>
  );
}

/**
 * Demonstrates a custom `imageRenderer` that consumes `width` and `height`
 * metadata and offers small resize actions backed by Galley's image metadata
 * commands.
 */
export const ResizableImageRenderer: Story = {
  render: ResizableImageRendererStory,
};

// ── With Toolbar ────────────────────────────────────────────────────────────

function WithToolbarStory() {
  const [value, setValue] = useState('# Try the Toolbar\n\nSelect some text and click a button!');
  const ref = useRef<GalleyHandle>(null);

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
      <GalleyEditor
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
      <GalleyEditor
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
 * `data-theme="dark"`, so `galley-base.css` applies its dark variable
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
          --ge-color-text: #18202f;
          --ge-color-text-muted: #657089;
          --ge-color-bg: #fbfcff;
          --ge-color-link: #0f766e;
          --ge-color-link-hover: #115e59;
          --ge-color-code-fg: #18202f;
          --ge-color-code-bg: rgba(15, 118, 110, 0.12);
          --ge-color-code-fence-bg: rgba(15, 118, 110, 0.08);
          --ge-color-blockquote-border: rgba(15, 118, 110, 0.45);
          --ge-color-blockquote-fg: #475569;
          --ge-color-divider: rgba(15, 118, 110, 0.28);
          --ge-color-table-border: rgba(15, 118, 110, 0.24);
          --ge-color-checkbox-accent: #0f766e;
          --ge-color-selection: rgba(15, 118, 110, 0.2);
          --ge-color-focus-ring: #0f766e;
          --ge-font-body: Inter, ui-sans-serif, system-ui, sans-serif;
          --ge-font-size: 0.975rem;
          border: 1px solid rgba(15, 118, 110, 0.2);
          border-radius: 8px;
        }
        .recipe-css-vars[data-theme="dark"] {
          --ge-color-text: #e6edf7;
          --ge-color-text-muted: #9fb0c7;
          --ge-color-bg: #101820;
          --ge-color-code-fg: #e6edf7;
          --ge-color-link: #5eead4;
          --ge-color-link-hover: #99f6e4;
          --ge-color-blockquote-fg: #b6c3d4;
          --ge-color-checkbox-accent: #5eead4;
          --ge-color-selection: rgba(94, 234, 212, 0.26);
          --ge-color-focus-ring: #5eead4;
        }
      `}</style>
      <GalleyEditor
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
 * `--ge-*` variables there. Dark overrides target the same wrapper when its
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
          --ge-color-text: var(--color-editor-text);
          --ge-color-text-muted: var(--color-editor-muted);
          --ge-color-link: var(--color-editor-link);
          --ge-color-link-hover: var(--color-editor-link-hover);
          --ge-color-code-bg: var(--color-editor-code-bg);
          --ge-color-code-fence-bg: var(--color-editor-code-fence-bg);
          --ge-color-checkbox-accent: var(--color-editor-link);
          --ge-color-focus-ring: var(--color-editor-ring);
          --ge-font-body: var(--font-editor-body);
          --ge-font-mono: var(--font-editor-mono);
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
      <GalleyEditor
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
 * `--color-editor-link` map into Galley's `--ge-*` variables.
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
      <GalleyEditor
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
      <GalleyEditor
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

// ── Mode Switching ─────────────────────────────────────────────────────────

function ModeSwitchingStory() {
  const [value, setValue] = useState(allFeaturesMarkdown);
  const [mode, setMode] = useState<GalleyMode>('live');

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <GalleyEditor
        value={value}
        onChange={setValue}
        mode={mode}
        onModeChange={setMode}
        minRows={12}
      />
    </div>
  );
}

/**
 * Uses the built-in mode toggle to switch between live editing, raw Markdown,
 * and rendered preview. Preview keeps blocks rendered even when clicked.
 */
export const ModeSwitching: Story = {
  render: ModeSwitchingStory,
};

// ── Custom Toolbar Icons ───────────────────────────────────────────────────

function CustomToolbarIconsStory() {
  const [value, setValue] = useState(sampleMarkdown);
  const icon = (path: string) => (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path d={path} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <GalleyEditor
        value={value}
        onChange={setValue}
        minRows={10}
        toolbar={{
          icons: {
            bold: icon('M6 4h8a4 4 0 0 1 0 8H6zM6 12h9a4 4 0 0 1 0 8H6z'),
            italic: icon('M19 4h-9M14 20H5M15 4 9 20'),
            link: icon('M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71'),
            mode: ({ mode }) => <span>{mode === 'preview' ? 'HTML' : mode === 'markdown' ? 'MD' : 'Live'}</span>,
          },
        }}
      />
    </div>
  );
}

/**
 * Demonstrates icon overrides with inline SVG nodes and a render function.
 * The same API accepts React icon pack components such as Lucide icons.
 */
export const CustomToolbarIcons: Story = {
  render: CustomToolbarIconsStory,
};

// ── Custom Toolbar and Footer Slots ────────────────────────────────────────

function CustomChromeSlotsStory() {
  const [value, setValue] = useState('# Custom Chrome\n\nThe built-in toolbar and footer can host consumer controls.');
  const [savedAt, setSavedAt] = useState('Not saved');

  return (
    <div style={{ maxWidth: '880px', margin: '0 auto' }}>
      <style>{`
        .recipe-custom-chrome .ge-toolbar-button.ge-save-button {
          background: #111827;
          color: #ffffff;
          gap: 6px;
          padding: 0 12px;
        }
        .recipe-custom-chrome .ge-toolbar-button.ge-save-button:hover,
        .recipe-custom-chrome .ge-toolbar-button.ge-save-button:focus-visible {
          background: #374151;
        }
        .recipe-custom-chrome .ge-status-pill {
          align-items: center;
          background: color-mix(in srgb, var(--ge-color-link) 12%, transparent);
          border: 1px solid color-mix(in srgb, var(--ge-color-link) 28%, transparent);
          border-radius: 999px;
          color: var(--ge-color-link);
          display: inline-flex;
          font-size: 0.75rem;
          font-weight: 650;
          min-height: 24px;
          padding: 0 9px;
        }
      `}</style>
      <GalleyEditor
        className="recipe-custom-chrome"
        value={value}
        onChange={setValue}
        minRows={8}
        toolbar={{
          before: <span className="ge-status-pill">Draft</span>,
          after: ({ execCommand, canEdit }) => (
            <>
              <button
                type="button"
                className="ge-toolbar-button"
                aria-label="Insert section divider"
                disabled={!canEdit}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => execCommand('insertHr')}
              >
                Section
              </button>
              <button
                type="button"
                className="ge-toolbar-button ge-save-button"
                aria-label="Save draft"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => setSavedAt(new Date().toLocaleTimeString())}
              >
                Save
              </button>
            </>
          ),
        }}
        footer={{
          before: <span className="ge-status-pill">Local draft</span>,
          after: ({ mode, wordCount }) => (
            <span>
              {mode} · {wordCount} words · {savedAt}
            </span>
          ),
        }}
      />
    </div>
  );
}

/**
 * Shows consumer-owned toolbar controls and footer widgets inside the built-in
 * chrome using `toolbar.before`, `toolbar.after`, `footer.before`, and
 * `footer.after`.
 */
export const CustomChromeSlots: Story = {
  render: CustomChromeSlotsStory,
};

// ── Frosted Surface ────────────────────────────────────────────────────────

function FrostedSurfaceStory() {
  const [value, setValue] = useState(`${sampleMarkdown}

## More scroll content

The glass treatment stays readable while the editing surface scrolls.

- Overlay-style scrollbars inherit the theme
- Thumb colors are controlled with CSS variables
- The track stays transparent over the frosted surface

${allFeaturesMarkdown}`);
  return (
    <div
      style={{
        maxWidth: '920px',
        margin: '0 auto',
        padding: '42px',
        borderRadius: '24px',
        background: [
          'radial-gradient(circle at 18% 18%, rgba(59, 130, 246, 0.34), transparent 30%)',
          'radial-gradient(circle at 82% 24%, rgba(236, 72, 153, 0.26), transparent 28%)',
          'radial-gradient(circle at 50% 86%, rgba(16, 185, 129, 0.26), transparent 34%)',
          'linear-gradient(135deg, #e0f2fe 0%, #fdf2f8 48%, #ecfccb 100%)',
        ].join(', '),
      }}
    >
      <style>{`
        .recipe-frosted-surface {
          --ge-color-bg: rgba(255, 255, 255, 0.48);
          --ge-color-surface: rgba(255, 255, 255, 0.36);
          --ge-color-surface-elevated: rgba(255, 255, 255, 0.52);
          --ge-color-border: rgba(255, 255, 255, 0.62);
          --ge-color-scrollbar-thumb: rgba(15, 23, 42, 0.22);
          --ge-color-scrollbar-thumb-hover: rgba(15, 23, 42, 0.42);
          --ge-scrollbar-size: 12px;
          box-shadow:
            0 24px 60px rgba(15, 23, 42, 0.16),
            inset 0 1px 0 rgba(255, 255, 255, 0.72);
        }
      `}</style>
      <GalleyEditor
        value={value}
        onChange={setValue}
        minRows={10}
        maxRows={18}
        surface={{
          className: 'recipe-frosted-surface',
          contentPadding: '36px 48px',
          toolbarPadding: '10px 16px',
          footerPadding: '7px 12px',
          style: {
            background: 'rgba(255, 255, 255, 0.46)',
            backdropFilter: 'blur(26px) saturate(1.55)',
          },
        }}
      />
    </div>
  );
}

/**
 * Uses the `surface` prop to apply a glassy shell, custom paddings,
 * stylable overlay-like scrollbars, and a parent gradient background.
 */
export const FrostedSurface: Story = {
  render: FrostedSurfaceStory,
};

// ── With Placeholder ────────────────────────────────────────────────────────

function WithPlaceholderStory() {
  const [value, setValue] = useState('');
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <GalleyEditor
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
        <GalleyEditor
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
        <GalleyEditor
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
      <GalleyEditor
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
  const ref = useRef<GalleyHandle>(null);
  const [output, setOutput] = useState('');

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <GalleyEditor ref={ref} value={value} onChange={setValue} minRows={6} />
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
 * Demonstrates the imperative handle API (`GalleyHandle`). Use the buttons
 * to call methods like `getContent()`, `setContent()`, `insertText()`,
 * `focus()`, `blur()`, `select()`, `getSelection()`, `scrollTo()`, etc.
 */
export const ImperativeHandle: Story = {
  render: ImperativeHandleStory,
};

// ── Custom Commands ─────────────────────────────────────────────────────────

function CustomCommandsStory() {
  const [value, setValue] = useState('# Custom Commands\n\nSelect text and use the toolbar buttons.');
  const ref = useRef<GalleyHandle>(null);
  const [registered, setRegistered] = useState(false);

  useEffect(() => {
    if (registered) return;

    const frame = requestAnimationFrame(() => {
      if (!ref.current) return;
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
    });

    return () => cancelAnimationFrame(frame);
  }, [registered]);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <GalleyEditor
        ref={ref}
        value={value}
        onChange={setValue}
        minRows={6}
        toolbar={{
          after: ({ canEdit, execCommand }) => (
            <>
              <button
                type="button"
                className="ge-toolbar-button"
                disabled={!canEdit || !registered}
                title="Insert timestamp"
                aria-label="Insert timestamp"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => execCommand('insertTimestamp')}
              >
                Time
              </button>
              <button
                type="button"
                className="ge-toolbar-button"
                disabled={!canEdit || !registered}
                title="Wrap in callout"
                aria-label="Wrap in callout"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => execCommand('wrapInCallout')}
              >
                Callout
              </button>
              <button
                type="button"
                className="ge-toolbar-button"
                disabled={!canEdit || !registered}
                title="Uppercase selection"
                aria-label="Uppercase selection"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => execCommand('uppercaseSelection')}
              >
                Upper
              </button>
            </>
          ),
        }}
      />
      <div style={{ marginTop: '12px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
        {registered ? (
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
        ) : (
          <span style={{ color: '#6b7280', fontSize: '13px' }}>
            Registering commands...
          </span>
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
 * and `execCommand()`. The same custom commands are also wired into
 * `toolbar.after` buttons, matching the documented extension pattern.
 */
export const CustomCommands: Story = {
  render: CustomCommandsStory,
};

// ── Disabled Plugins ────────────────────────────────────────────────────────

function DisabledPluginsStory() {
  const [value, setValue] = useState(sampleMarkdown);
  const [disabled, setDisabled] = useState<string[]>([]);

  const pluginIds = [
    'ge:headings', 'ge:emphasis', 'ge:code-inline', 'ge:code-fence',
    'ge:blockquote', 'ge:links', 'ge:images', 'ge:lists', 'ge:checkboxes',
    'ge:dividers', 'ge:tables',
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
              {id.replace('ge:', '')} {disabled.includes(id) ? 'OFF' : 'ON'}
            </button>
          ))}
        </div>
      </div>
      <GalleyEditor
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

  const customNames: GalleyClassNames = {
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
      <GalleyEditor
        value={value}
        onChange={setValue}
        classNames={customNames}
        minRows={6}
      />
    </div>
  );
}

/**
 * Shows how to override the default `ge-*` CSS classes with custom names
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

const highlightPlugin: GalleyPlugin = {
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
      <GalleyEditor
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
      <GalleyEditor
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
      <GalleyEditor value={value} onChange={handleChange} minRows={6} />
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
      <GalleyEditor
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
        <GalleyEditor value={value} onChange={setValue} minRows={6} />
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
        <GalleyEditor value={value} onChange={setValue} minRows={6} />
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
  const ref = useRef<GalleyHandle>(null);
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
      <GalleyEditor ref={ref} value={value} onChange={setValue} minRows={6} />
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
  const ref = useRef<GalleyHandle>(null);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <GalleyEditor
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
      <GalleyEditor
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

// ── Slow Drop Upload Progress ──────────────────────────────────────────────

function SlowDropUploadProgressStory() {
  const [value, setValue] = useState(
    '# Slow Drop Upload\n\nDrop one or more files into the editor. The story simulates a slow upload, reports progress, and inserts Markdown file links when it completes.',
  );
  const [statusRows, setStatusRows] = useState<UploadLogEntry[]>([]);

  const slowUpload = useCallback(async (input: GalleyFileInput) => {
    const markdownItems: string[] = [];
    const totalSteps = 8;

    for (const [fileIndex, file] of input.files.entries()) {
      for (let step = 0; step <= totalSteps; step += 1) {
        const fileProgress = step / totalSteps;
        const totalProgress = (fileIndex + fileProgress) / input.files.length;
        input.report({
          phase: 'progress',
          progress: totalProgress,
          message: `Uploading ${file.name} (${Math.round(fileProgress * 100)}%)`,
        });
        await wait(220);
      }

      markdownItems.push(`[${escapeMarkdownAlt(file.name)}](/uploads/${encodeURIComponent(file.name)})`);
    }

    input.report({ phase: 'progress', progress: 1, message: 'Inserting file links' });
    return markdownItems;
  }, []);

  const latestStatus = statusRows.at(-1);
  const progress = latestStatus?.progress ?? 0;
  const activeCount = statusRows.filter((row) => row.phase === 'progress' && row.progress !== 1).length;

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto' }}>
      <GalleyEditor
        value={value}
        onChange={setValue}
        minRows={8}
        onFiles={slowUpload}
        onFileStatus={(status) => setStatusRows((rows) => appendFileStatus(rows, status))}
        footer={{
          after: () => (
            <span>
              {activeCount > 0 ? 'Upload in progress' : 'Drop files to upload'}
            </span>
          ),
        }}
      />
      <div
        style={{
          marginTop: '12px',
          padding: '12px',
          background: '#f8fafc',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          fontSize: '13px',
        }}
        aria-label="Slow upload progress"
        aria-live="polite"
        role="status"
      >
        <strong>Drop upload progress</strong>
        <div
          style={{
            marginTop: '10px',
            height: '8px',
            borderRadius: '999px',
            background: '#e5e7eb',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${Math.round(progress * 100)}%`,
              height: '100%',
              background: '#2563eb',
              transition: 'width 180ms ease',
            }}
          />
        </div>
        {statusRows.length === 0 && (
          <div style={{ color: '#6b7280', marginTop: '6px' }}>
            Drop files to start a simulated slow upload.
          </div>
        )}
        {statusRows.map((upload) => (
          <div
            key={upload.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: '12px',
              marginTop: '6px',
              borderTop: '1px solid #e5e7eb',
              paddingTop: '6px',
            }}
          >
            <span>{upload.fileNames}</span>
            <code>
              {upload.progress === undefined
                ? upload.phase
                : `${upload.phase} ${Math.round(upload.progress * 100)}%`}
            </code>
          </div>
        ))}
      </div>
      <MarkdownPreview value={value} />
    </div>
  );
}

/**
 * Demonstrates a slow drop upload powered by `onFiles`, `input.report()`, and
 * `onFileStatus`. The simulated upload reports progress before inserting
 * Markdown file links into the editor.
 */
export const SlowDropUploadProgress: Story = {
  render: SlowDropUploadProgressStory,
};
