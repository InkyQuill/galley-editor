import { afterEach, describe, expect, it } from 'vitest';
import { EditorSelection } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import { createEditorView, destroyViews } from '../test-utils/editor';
import { resolveClassNames } from '../types';
import listsPlugin, { BulletMarkerWidget } from './lists';

const views: EditorView[] = [];

afterEach(() => {
  destroyViews(views);
});

describe('listsPlugin', () => {
  it('renders bullet marker widgets as hidden from assistive technology', () => {
    const doc = '- item\n\nplain';
    const view = createEditorView({
      doc,
      selection: EditorSelection.cursor(doc.indexOf('plain')),
      extensions: listsPlugin.extensions(resolveClassNames()),
    });
    views.push(view);

    const marker = view.dom.querySelector('.ne-list-marker');

    expect(marker).toBeInstanceOf(HTMLElement);
    expect(marker?.getAttribute('aria-hidden')).toBe('true');
    expect(marker?.getAttribute('role')).toBeNull();
    expect(marker?.getAttribute('aria-label')).toBeNull();
  });

  it('updates only the previous bullet depth class when reused', () => {
    const previousWidget = new BulletMarkerWidget(1, 'ne-list-marker');
    const nextWidget = new BulletMarkerWidget(2, 'ne-list-marker');
    const marker = previousWidget.toDOM();
    marker.classList.add('ne-depth-0');

    expect(nextWidget.updateDOM(marker)).toBe(true);

    expect(marker.classList.contains('ne-depth-1')).toBe(false);
    expect(marker.classList.contains('ne-depth-2')).toBe(true);
    expect(marker.classList.contains('ne-depth-0')).toBe(true);
  });
});
