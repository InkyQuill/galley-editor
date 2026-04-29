import { afterEach, describe, expect, it } from 'vitest';
import { EditorSelection } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import { createEditorView, destroyViews } from '../test-utils/editor';
import { resolveClassNames } from '../types';
import dividersPlugin from './dividers';

const views: EditorView[] = [];

afterEach(() => {
  destroyViews(views);
});

describe('dividersPlugin', () => {
  it('renders divider widgets as hidden from assistive technology', () => {
    const doc = '---\n\nplain';
    const view = createEditorView({
      doc,
      selection: EditorSelection.cursor(doc.indexOf('plain')),
      extensions: dividersPlugin.extensions(resolveClassNames()),
    });
    views.push(view);

    const divider = view.dom.querySelector('hr.ne-divider-widget');

    expect(divider).toBeInstanceOf(HTMLHRElement);
    expect(divider?.getAttribute('aria-hidden')).toBe('true');
  });
});
