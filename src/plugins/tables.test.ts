import { afterEach, describe, expect, it } from 'vitest';
import { EditorSelection } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import { createEditorView, destroyViews, lineElement } from '../test-utils/editor';
import { resolveClassNames } from '../types';
import tablesPlugin from './tables';

const views: EditorView[] = [];

afterEach(() => {
  destroyViews(views);
});

describe('tablesPlugin', () => {
  it('renders an inactive multiline table as a visual table widget', () => {
    const doc = '| A | B |\n| - | - |\n| 1 | 2 |\n\nplain';
    const view = createEditorView({
      doc,
      selection: EditorSelection.cursor(doc.indexOf('plain')),
      extensions: tablesPlugin.extensions(resolveClassNames()),
    });
    views.push(view);

    const table = view.dom.querySelector('.ne-table-widget table');
    expect(table).toBeInstanceOf(HTMLTableElement);
    expect(table?.querySelectorAll('thead th')).toHaveLength(2);
    expect(table?.querySelector('thead th')?.textContent).toBe('A');
    expect(table?.querySelector('tbody td')?.textContent).toBe('1');
  });

  it('keeps raw table markdown visible when the cursor is inside the table', () => {
    const doc = '| A | B |\n| - | - |\n| 1 | 2 |\n\nplain';
    const view = createEditorView({
      doc,
      selection: EditorSelection.cursor(doc.indexOf('1')),
      extensions: tablesPlugin.extensions(resolveClassNames()),
    });
    views.push(view);

    expect(view.dom.querySelector('.ne-table-widget')).toBeNull();
    expect(lineElement(view, 1).textContent).toBe('| A | B |');
  });

  it('applies separator alignment to rendered cells', () => {
    const doc = '| Left | Center | Right |\n| :--- | :---: | ---: |\n| a | b | c |\n\nplain';
    const view = createEditorView({
      doc,
      selection: EditorSelection.cursor(doc.indexOf('plain')),
      extensions: tablesPlugin.extensions(resolveClassNames()),
    });
    views.push(view);

    const cells = view.dom.querySelectorAll('.ne-table-widget tbody td');
    expect(cells.item(0).classList.contains('ne-align-left')).toBe(true);
    expect(cells.item(1).classList.contains('ne-align-center')).toBe(true);
    expect(cells.item(2).classList.contains('ne-align-right')).toBe(true);
  });
});
