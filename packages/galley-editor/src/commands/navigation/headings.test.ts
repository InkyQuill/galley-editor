import { EditorState } from '@codemirror/state';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createEditorView } from '../../test-utils/editor';
import { getHeadings, getViewport, revealPosition } from './headings';

describe('getHeadings', () => {
  it.each(['page title: Draft', 'page title : Draft', "'author''s name': Ada", 'tags:\n- draft\n- outline'])('excludes front matter with the key %s', (mapping) => {
    const state = EditorState.create({ doc: `---\n${mapping}\n# Metadata\n---\n\n# Chapter` });
    expect(getHeadings(state).map((heading) => heading.slug)).toEqual(['chapter']);
  });

  it('returns source spans and display text from rendered ATX headings', () => {
    const source = [
      '---', 'title: Draft', '# Metadata', '---', '',
      '   # **Hello** [world](https://example.com) `code` ###', '',
      '```md', '# Fenced', '```', '',
      '    # Indented code', '', 'Setext', '======', '',
      '> ## Quote', '- ### List', '', '#',
    ].join('\r\n');
    const state = EditorState.create({ doc: source });
    const headings = getHeadings(state);

    expect(headings.map(({ level, text, slug }) => ({ level, text, slug }))).toEqual([
      { level: 1, text: 'Hello world code', slug: 'hello-world-code' },
      { level: 2, text: 'Quote', slug: 'quote' },
      { level: 3, text: 'List', slug: 'list' },
      { level: 1, text: '', slug: '' },
    ]);
    expect(state.doc.sliceString(headings[1].from, headings[1].to)).toBe('## Quote');
  });

  it('assigns unique slugs and caches only for the same document', () => {
    const state = EditorState.create({ doc: '# A\n# A-1\n# A' });
    const headings = getHeadings(state);
    expect(headings.map(({ slug }) => slug)).toEqual(['a', 'a-1', 'a-2']);
    expect(getHeadings(state.update({ selection: { anchor: 1 } }).state)).toBe(headings);
    expect(getHeadings(state.update({ changes: { from: 2, to: 3, insert: 'B' } }).state)[0].text).toBe('B');
  });

  it('keeps visible automatic link text and removes explicit link destinations', () => {
    const state = EditorState.create({
      doc: '# https://example.com <https://example.org> [site](https://example.net)',
    });
    expect(getHeadings(state)[0].text).toBe('https://example.com https://example.org site');
  });

  it('recognizes a Unicode YAML key after a leading comment', () => {
    const state = EditorState.create({ doc: '---\n# Metadata\nзаголовок: Черновик\n---\n\n# Chapter' });
    expect(getHeadings(state).map(({ text }) => text)).toEqual(['Chapter']);
  });

  it('keeps headings between horizontal rules at the start of a document', () => {
    const state = EditorState.create({ doc: '---\n\n# First heading\n\n---\n\n## Second heading' });
    expect(getHeadings(state).map(({ text }) => text)).toEqual(['First heading', 'Second heading']);
  });

  it('keeps headings when a Markdown list follows a mapping-like paragraph', () => {
    const state = EditorState.create({
      doc: '---\n\n# First\n\nReading note: text\n\n- item\n\n---\n\n## Second',
    });
    expect(getHeadings(state).map(({ text }) => text)).toEqual(['First', 'Second']);
  });

  it('keeps headings after a leading rule without closing front matter', () => {
    const state = EditorState.create({ doc: '---\n\n# Chapter' });
    expect(getHeadings(state)).toMatchObject([{ text: 'Chapter' }]);
  });
});

describe('viewport navigation', () => {
  const views: ReturnType<typeof createEditorView>[] = [];

  afterEach(() => {
    views.splice(0).forEach((view) => view.destroy());
  });

  it('preserves selection by default and supports selecting and focusing the target', () => {
    const view = createEditorView({ doc: '# First\n# Second' });
    views.push(view);
    revealPosition(view, 8);
    expect(view.state.selection.main.head).toBe(0);
    revealPosition(view, 8, { align: 'start', select: true, focus: true });
    expect(view.state.selection.main.head).toBe(8);
    expect(view.hasFocus).toBe(true);
  });

  it('returns the source offsets of the visible lines', () => {
    const view = createEditorView({ doc: '# First\n# Second' });
    views.push(view);
    vi.spyOn(view, 'lineBlockAtHeight')
      .mockReturnValueOnce({ from: 8 } as ReturnType<typeof view.lineBlockAtHeight>)
      .mockReturnValueOnce({ to: 16 } as ReturnType<typeof view.lineBlockAtHeight>);
    expect(getViewport(view)).toEqual({ from: 8, to: 16 });
  });
});
