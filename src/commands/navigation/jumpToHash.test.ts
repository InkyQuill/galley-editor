import { afterEach, describe, expect, it } from 'vitest';
import type { EditorView } from '@codemirror/view';
import { createEditorView, destroyViews } from '../../test-utils/editor';
import { jumpToHash, slugifyHeading } from './jumpToHash';

const views: EditorView[] = [];

afterEach(() => {
  destroyViews(views);
});

function viewOf(doc: string) {
  const view = createEditorView({ doc });
  views.push(view);
  return view;
}

describe('slugifyHeading', () => {
  it('normalizes markdown headings using the v0.5 GitHub-like subset', () => {
    expect(slugifyHeading('My Section!')).toBe('my-section');
    expect(slugifyHeading('  API: Find & Jump  ')).toBe('api-find-jump');
  });
});

describe('jumpToHash', () => {
  it('jumps to a matching markdown heading slug', () => {
    const view = viewOf('# Intro\n\n## My Section\n\nbody');

    expect(jumpToHash(view, 'my-section')).toBe(true);

    expect(view.state.selection.main.head).toBe(9);
    expect(view.state.doc.lineAt(view.state.selection.main.head).text).toBe('## My Section');
  });

  it('accepts hashes with a leading #', () => {
    const view = viewOf('# Intro\n\n## My Section\n\nbody');

    expect(jumpToHash(view, '#my-section')).toBe(true);
    expect(view.state.selection.main.head).toBe(9);
  });

  it('returns false when no heading matches', () => {
    const view = viewOf('# Intro');

    expect(jumpToHash(view, 'missing')).toBe(false);
    expect(view.state.selection.main.head).toBe(0);
  });

  it('supports duplicate heading suffixes', () => {
    const view = viewOf('# Repeat\n\n## Repeat\n\n### Repeat');

    expect(jumpToHash(view, 'repeat-1')).toBe(true);

    expect(view.state.doc.lineAt(view.state.selection.main.head).text).toBe('## Repeat');
  });
});
