import { useEffect, useMemo, useRef, useState } from 'react';
import { EditorView, type ViewUpdate } from '@codemirror/view';
import { Transaction } from '@codemirror/state';
import { GalleyEditor, ErrorBoundary } from './components';
import type { GalleyHandle, GalleyMode } from './types';
import './galley-base.css';

function logTransaction(update: ViewUpdate) {
    if (!update.docChanged && !update.selectionSet && !update.focusChanged) return;
    console.log('[Galley transaction]', JSON.stringify({
      time: performance.now(),
      events: update.transactions.map(tr => tr.annotation(Transaction.userEvent) ?? null),
      changes: update.changes.toJSON(),
      selection: update.state.selection.toJSON(),
      document: update.state.doc.toString(),
      focused: update.view.hasFocus,
    }));
}

const sampleMarkdown = `# Galley Editor

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
  const [theme, setTheme] = useState<'auto' | 'light' | 'dark'>('auto');
  const [mode, setMode] = useState<GalleyMode>('live');
  const [editable, setEditable] = useState(true);
  const [customClasses, setCustomClasses] = useState(false);
  const [traceEvents, setTraceEvents] = useState(false);
  const editorRef = useRef<GalleyHandle>(null);
  const traceExtensions = useMemo(() => traceEvents ? [EditorView.updateListener.of(logTransaction)] : [], [traceEvents]);

  useEffect(() => {
    if (!traceEvents) return;
    const names = ['keydown', 'keyup', 'beforeinput', 'input', 'compositionstart', 'compositionupdate', 'compositionend', 'selectionchange', 'pointerdown', 'mousedown', 'click', 'focusin', 'focusout', 'paste', 'cut', 'drop'];
    const logEvent = (event: Event) => {
      const target = event.target instanceof Element ? event.target : document.activeElement;
      if (!target?.closest('.cm-editor')) return;
      const selection = document.getSelection();
      console.log('[Galley DOM]', JSON.stringify({
        time: performance.now(), type: event.type, trusted: event.isTrusted,
        key: event instanceof KeyboardEvent ? event.key : undefined,
        code: event instanceof KeyboardEvent ? event.code : undefined,
        inputType: event instanceof InputEvent ? event.inputType : undefined,
        data: event instanceof InputEvent || event instanceof CompositionEvent ? event.data : undefined,
        defaultPrevented: event.defaultPrevented,
        target: target.className,
        anchorOffset: selection?.anchorOffset, focusOffset: selection?.focusOffset,
        anchorText: selection?.anchorNode?.textContent,
        document: editorRef.current?.getContent(),
      }));
    };
    names.forEach(name => document.addEventListener(name, logEvent, true));
    return () => names.forEach(name => document.removeEventListener(name, logEvent, true));
  }, [traceEvents]);

  const addLog = (message: string) => {
    setLog((prev) => [...prev.slice(-49), `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const cycleTheme = () => {
    setTheme((current) =>
      current === 'auto' ? 'light' : current === 'light' ? 'dark' : 'auto',
    );
  };

  return (
    <div style={{ minHeight: '100vh', padding: '20px', backgroundColor: '#f5f5f5' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ marginBottom: '20px' }}>Galley Editor Test</h1>
        <fieldset style={{ marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <legend>Interaction bench</legend>
          <button onClick={() => setMarkdown(sampleMarkdown)}>Reset sample</button>
          <button onClick={() => setMarkdown('intro\n\n- [ ] task\n- [x] done\n- [X] uppercase')}>Tasks fixture</button>
          <button onClick={() => setMarkdown('тест тест т')}>Spaces fixture</button>
          <label>Mode <select aria-label="Mode" value={mode} onChange={event => setMode(event.target.value as GalleyMode)}>
            <option value="live">Live</option><option value="markdown">Markdown</option><option value="preview">Preview</option>
          </select></label>
          <label><input type="checkbox" checked={editable} onChange={event => setEditable(event.target.checked)} /> Editable</label>
          <label><input type="checkbox" checked={customClasses} onChange={event => setCustomClasses(event.target.checked)} /> Multiple checkbox classes</label>
          <label><input type="checkbox" checked={traceEvents} onChange={event => setTraceEvents(event.target.checked)} /> Console event tracing</label>
        </fieldset>
        <details style={{ marginBottom: 16 }}>
          <summary>Load or edit exact Markdown</summary>
          <textarea aria-label="Markdown source" value={markdown} onChange={event => setMarkdown(event.target.value)} rows={6} className="ge-markdown-source" style={{ width: '100%' }} />
        </details>
        <p>Use the editor below, then inspect exact spaces and selection in the diagnostics. Switch modes to compare rendering with source.</p>

        {/* Toolbar */}
        <div style={{ marginBottom: '8px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          <button onClick={() => editorRef.current?.execCommand('toggleBold')}>Bold</button>
          <button onClick={() => editorRef.current?.execCommand('toggleItalic')}>Italic</button>
          <button onClick={() => editorRef.current?.execCommand('toggleCode')}>Code</button>
          <button onClick={() => editorRef.current?.execCommand('toggleStrikethrough')}>Strike</button>
          <button onClick={() => editorRef.current?.execCommand('toggleHeading', 1)}>H1</button>
          <button onClick={() => editorRef.current?.execCommand('toggleHeading', 2)}>H2</button>
          <button onClick={() => editorRef.current?.execCommand('toggleHeading', 3)}>H3</button>
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
          <span style={{ borderLeft: '1px solid #ccc', margin: '0 4px' }} />
          <button onClick={cycleTheme}>Theme: {theme}</button>
        </div>

        <div style={{ marginBottom: '20px', padding: '20px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <ErrorBoundary>
            <GalleyEditor
              ref={editorRef}
              value={markdown}
              onChange={setMarkdown}
              placeholder="Start typing your markdown here..."
              minRows={10}
              theme={theme}
              mode={mode}
              editable={editable}
              classNames={customClasses ? { checkbox: 'ge-checkbox custom-task' } : undefined}
              extensions={traceExtensions}
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
          <div aria-label="Exact Markdown" className="ge-markdown-diagnostics" style={{ overflowWrap: 'anywhere' }}>{JSON.stringify(markdown)}</div>
          <div aria-label="Visible whitespace" className="ge-markdown-diagnostics" style={{ whiteSpace: 'pre-wrap' }}>{markdown.replaceAll(' ', '·').replaceAll('\t', '→').replaceAll('\n', '↵\n')}</div>
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
