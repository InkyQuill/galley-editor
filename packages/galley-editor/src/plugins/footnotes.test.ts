import { afterEach, describe, expect, it } from 'vitest';
import { EditorSelection } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import { createEditorView, destroyViews } from '../test-utils/editor';
import { resolveClassNames, type GalleyRenderContext } from '../types';
import footnotesPlugin from './footnotes';

const views: EditorView[] = [];
const editableLiveContext: GalleyRenderContext = { theme: 'light', mode: 'live', canEdit: true };
const previewReadonlyContext: GalleyRenderContext = { theme: 'light', mode: 'preview', canEdit: false };

afterEach(() => {
  destroyViews(views);
});

const DOC = [
  'Text with a footnote[^one] here.',
  '',
  'Unknown reference[^ghost] too.',
  '',
  '[^one]: The footnote text.',
  '',
  'plain',
].join('\n');

function footnoteEditor(
  doc: string = DOC,
  selectionText = 'plain',
  context: GalleyRenderContext = editableLiveContext,
): EditorView {
  const view = createEditorView({
    doc,
    selection: EditorSelection.cursor(doc.indexOf(selectionText)),
    extensions: footnotesPlugin.extensions(resolveClassNames(), context),
  });
  views.push(view);
  return view;
}

function refChip(view: EditorView, label: string): HTMLElement | null {
  return view.dom.querySelector(`.ge-footnote-ref[data-ge-footnote="${label}"]`);
}

function clickChip(view: EditorView, label: string): void {
  const chip = refChip(view, label);
  expect(chip).toBeInstanceOf(HTMLElement);
  chip?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

function popover(view: EditorView): HTMLElement | null {
  return view.dom.querySelector('.ge-footnote-popover');
}

describe('footnotesPlugin rendering', () => {
  it('renders a footnote reference as a superscript chip when the cursor is elsewhere', () => {
    const view = footnoteEditor();

    const chip = refChip(view, 'one');
    expect(chip).toBeInstanceOf(HTMLElement);
    expect(chip?.tagName).toBe('SUP');
    expect(chip?.textContent).toBe('one');
  });

  it('makes the reference chip keyboard-focusable', () => {
    const view = footnoteEditor();

    const chip = refChip(view, 'one');
    expect(chip?.tabIndex).toBe(0);
  });

  it('reveals the raw reference markup when the cursor is inside it', () => {
    const view = footnoteEditor(DOC, 'one]');

    expect(refChip(view, 'one')).toBeNull();
  });

  it('does not turn the definition label into a chip on its definition line', () => {
    const view = footnoteEditor();

    const definitionLine = Array.from(view.dom.querySelectorAll('.cm-line')).find(
      (line) => line.textContent?.includes('The footnote text.'),
    );
    expect(definitionLine).toBeTruthy();
    expect(definitionLine?.querySelector('.ge-footnote-ref')).toBeNull();
    expect(definitionLine?.classList.contains('ge-footnote-def')).toBe(true);
  });

  it('still renders chips in preview mode', () => {
    const view = footnoteEditor(DOC, 'plain', previewReadonlyContext);

    expect(refChip(view, 'one')).toBeInstanceOf(HTMLElement);
  });
});

describe('footnotesPlugin popover', () => {
  it('shows the definition text in a popover when a chip is clicked', () => {
    const view = footnoteEditor();

    clickChip(view, 'one');

    const shown = popover(view);
    expect(shown).toBeInstanceOf(HTMLElement);
    expect(shown?.textContent).toContain('The footnote text.');
  });

  it('shows a missing-definition message for unknown labels', () => {
    const view = footnoteEditor();

    clickChip(view, 'ghost');

    expect(popover(view)?.textContent).toContain('No definition');
  });

  it('closes the popover when the same chip is clicked again', () => {
    const view = footnoteEditor();

    clickChip(view, 'one');
    expect(popover(view)).toBeInstanceOf(HTMLElement);

    clickChip(view, 'one');
    expect(popover(view)).toBeNull();
  });

  it('hides the edit button in preview mode', () => {
    const view = footnoteEditor(DOC, 'plain', previewReadonlyContext);

    clickChip(view, 'one');

    expect(popover(view)).toBeInstanceOf(HTMLElement);
    expect(popover(view)?.querySelector('button.ge-footnote-popover-edit')).toBeNull();
  });

  it.each(['Enter', ' '])('opens the popover on %s keydown for a focused chip', (key) => {
    const view = footnoteEditor();
    const chip = refChip(view, 'one');

    chip?.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key }));

    expect(popover(view)?.textContent).toContain('The footnote text.');
  });
});

describe('footnotesPlugin editing', () => {
  function openEditor(view: EditorView, label: string): HTMLTextAreaElement {
    clickChip(view, label);
    const editButton = popover(view)?.querySelector<HTMLButtonElement>(
      'button.ge-footnote-popover-edit',
    );
    expect(editButton).toBeInstanceOf(HTMLButtonElement);
    editButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const textarea = popover(view)?.querySelector<HTMLTextAreaElement>('textarea');
    expect(textarea).toBeInstanceOf(HTMLTextAreaElement);
    return textarea as HTMLTextAreaElement;
  }

  it('opens an editable popup with the definition text', () => {
    const view = footnoteEditor();

    const textarea = openEditor(view, 'one');

    expect(textarea.value).toBe('The footnote text.');
  });

  it('keeps the edit draft open across an unrelated document edit', () => {
    const view = footnoteEditor();

    const textarea = openEditor(view, 'one');
    textarea.value = 'draft in progress';

    // An edit elsewhere in the document (e.g. typed text, or content pushed
    // in by the host) must not tear down the popover DOM or discard the draft
    view.dispatch({ changes: { from: view.state.doc.length, insert: ' more text' } });

    const stillOpen = popover(view)?.querySelector<HTMLTextAreaElement>('textarea');
    expect(stillOpen).toBe(textarea);
    expect(stillOpen?.value).toBe('draft in progress');
  });

  it('saves edited definition text back into the document', () => {
    const view = footnoteEditor();

    const textarea = openEditor(view, 'one');
    textarea.value = 'Updated note.';
    popover(view)
      ?.querySelector<HTMLButtonElement>('button.ge-footnote-popover-save')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(view.state.doc.toString()).toContain('[^one]: Updated note.');
    expect(view.state.doc.toString()).not.toContain('The footnote text.');
    expect(popover(view)).toBeNull();
  });

  it('appends a definition line when saving a footnote that has none', () => {
    const view = footnoteEditor();

    const textarea = openEditor(view, 'ghost');
    expect(textarea.value).toBe('');
    textarea.value = 'A brand new note.';
    popover(view)
      ?.querySelector<HTMLButtonElement>('button.ge-footnote-popover-save')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(view.state.doc.toString()).toContain('[^ghost]: A brand new note.');
  });

  it('cancel returns to the read-only popover without changing the document', () => {
    const view = footnoteEditor();

    const textarea = openEditor(view, 'one');
    textarea.value = 'Discarded edit.';
    popover(view)
      ?.querySelector<HTMLButtonElement>('button.ge-footnote-popover-cancel')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(view.state.doc.toString()).toContain('[^one]: The footnote text.');
    expect(popover(view)?.querySelector('textarea')).toBeNull();
    expect(popover(view)?.textContent).toContain('The footnote text.');
  });
});
