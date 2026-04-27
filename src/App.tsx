import { useRef, useState } from 'react';
import { NeutrinoEditor, ErrorBoundary } from './components';
import type { NeutrinoHandle } from './types';
import './neutrino-base.css';

const sampleMarkdown = `# Neutrino Editor

A **half-WYSIWYG** markdown editor that renders blocks as HTML when you're not editing them.

## Features

- Real-time markdown rendering
- *Italic* and **bold** text support
- \`Inline code\` formatting
- [Links](https://example.com) support
- ~~Strikethrough~~ text

### Task Lists

- [ ] Unchecked item
- [x] Checked item
- [ ] Another task

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
| Cell 3   | Cell 4   |
`;

function App() {
  const [markdown, setMarkdown] = useState(sampleMarkdown);
  const [log, setLog] = useState<string[]>([]);
  const editorRef = useRef<NeutrinoHandle>(null);

  const addLog = (message: string) => {
    setLog((prev) => [...prev.slice(-49), `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  return (
    <div style={{ minHeight: '100vh', padding: '20px', backgroundColor: '#f5f5f5' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ marginBottom: '20px' }}>Neutrino Editor Test</h1>

        {/* Toolbar */}
        <div style={{ marginBottom: '8px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          <button onClick={() => editorRef.current?.execCommand('toggleBold')}>Bold</button>
          <button onClick={() => editorRef.current?.execCommand('toggleItalic')}>Italic</button>
          <button onClick={() => editorRef.current?.execCommand('toggleCode')}>Code</button>
          <button onClick={() => editorRef.current?.execCommand('toggleStrikethrough')}>Strike</button>
          <button onClick={() => editorRef.current?.execCommand('toggleHeading1')}>H1</button>
          <button onClick={() => editorRef.current?.execCommand('toggleHeading2')}>H2</button>
          <button onClick={() => editorRef.current?.execCommand('toggleHeading3')}>H3</button>
          <button onClick={() => editorRef.current?.execCommand('toggleBulletList')}>Bullet</button>
          <button onClick={() => editorRef.current?.execCommand('toggleOrderedList')}>Ordered</button>
          <button onClick={() => editorRef.current?.execCommand('toggleCheckList')}>Check</button>
          <button onClick={() => editorRef.current?.execCommand('insertLink', 'Link', 'https://example.com')}>Link</button>
          <button onClick={() => editorRef.current?.execCommand('insertCodeBlock', 'js')}>Code Block</button>
          <button onClick={() => editorRef.current?.execCommand('insertTable')}>Table</button>
          <button onClick={() => editorRef.current?.execCommand('insertHr')}>HR</button>
          <span style={{ borderLeft: '1px solid #ccc', margin: '0 4px' }} />
          <button onClick={() => editorRef.current?.undo()}>Undo</button>
          <button onClick={() => editorRef.current?.redo()}>Redo</button>
        </div>

        <div style={{ marginBottom: '20px', padding: '20px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <ErrorBoundary>
            <NeutrinoEditor
              ref={editorRef}
              value={markdown}
              onChange={setMarkdown}
              placeholder="Start typing your markdown here..."
              minRows={10}
              theme="auto"
              onFocus={() => addLog('Focus')}
              onBlur={() => addLog('Blur')}
              onSelectionChange={(sel) => addLog(`Selection: ${sel.from}-${sel.to}`)}
              onSubmit={() => addLog('Submit (Cmd+Enter)')}
              onEscape={() => addLog('Escape')}
            />
          </ErrorBoundary>
        </div>

        <div style={{ marginBottom: '20px', padding: '20px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h2 style={{ marginBottom: '10px' }}>Event Log</h2>
          <div style={{ maxHeight: '200px', overflowY: 'auto', padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '4px', fontSize: '12px' }}>
            {log.length === 0 ? (
              <div style={{ color: '#999' }}>No events yet. Try interacting with the editor.</div>
            ) : (
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                {log.map((entry, i) => (
                  <li key={i}>{entry}</li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div style={{ padding: '20px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h2 style={{ marginBottom: '10px' }}>Raw Markdown</h2>
          <pre style={{
            padding: '10px',
            backgroundColor: '#f9f9f9',
            borderRadius: '4px',
            overflowX: 'auto',
            fontSize: '12px',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
          }}>
            <code>{markdown}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}

export default App;
