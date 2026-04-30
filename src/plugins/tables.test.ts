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

    const table = view.dom.querySelector('.ge-table-widget table');
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

    expect(view.dom.querySelector('.ge-table-widget')).toBeNull();
    expect(lineElement(view, 1).textContent).toBe('| A | B |');
  });

  it('keeps the visual table rendered in preview mode when the cursor is inside the table', () => {
    const doc = '| A | B |\n| - | - |\n| 1 | 2 |\n\nplain';
    const view = createEditorView({
      doc,
      selection: EditorSelection.cursor(doc.indexOf('1')),
      extensions: tablesPlugin.extensions(resolveClassNames(), {
        theme: 'light',
        mode: 'preview',
      }),
    });
    views.push(view);

    expect(view.dom.querySelector('.ge-table-widget table')).toBeInstanceOf(HTMLTableElement);
    expect(lineElement(view, 1).textContent).not.toContain('| A | B |');
  });


  it('applies separator alignment to rendered cells', () => {
    const doc = '| Left | Center | Right |\n| :--- | :---: | ---: |\n| a | b | c |\n\nplain';
    const view = createEditorView({
      doc,
      selection: EditorSelection.cursor(doc.indexOf('plain')),
      extensions: tablesPlugin.extensions(resolveClassNames()),
    });
    views.push(view);

    const cells = view.dom.querySelectorAll('.ge-table-widget tbody td');
    expect(cells.item(0).classList.contains('ge-align-left')).toBe(true);
    expect(cells.item(1).classList.contains('ge-align-center')).toBe(true);
    expect(cells.item(2).classList.contains('ge-align-right')).toBe(true);
  });
});
