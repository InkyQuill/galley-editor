import { afterEach, describe, expect, it } from 'vitest';
import type { EditorView } from '@codemirror/view';
import { createEditorView, destroyViews, lineElement } from '../test-utils/editor';
import { biDirectionalTextExtension } from './bidi';

const views: EditorView[] = [];

afterEach(() => {
  destroyViews(views);
});

describe('biDirectionalTextExtension', () => {
  it('adds dir="auto" to every editor line', () => {
    const view = createEditorView({
      doc: 'Hello\nمرحبا\nשלום',
      extensions: [biDirectionalTextExtension],
    });
    views.push(view);

    expect(lineElement(view, 1).getAttribute('dir')).toBe('auto');
    expect(lineElement(view, 2).getAttribute('dir')).toBe('auto');
    expect(lineElement(view, 3).getAttribute('dir')).toBe('auto');
  });

  it('does not add dir attributes without the extension', () => {
    const view = createEditorView({ doc: 'مرحبا' });
    views.push(view);

    expect(lineElement(view, 1).hasAttribute('dir')).toBe(false);
  });
});
