import { markdown } from '@codemirror/lang-markdown';
import { EditorSelection, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { GFM } from '@lezer/markdown';
import { afterEach, describe, expect, it } from 'vitest';
import { BUILTIN_COMMANDS, clearImageDimensions, updateImageMetadata } from '.';

function createView(doc: string, selection: EditorSelection | { anchor: number; head?: number }): EditorView {
  return new EditorView({
    state: EditorState.create({
      doc,
      selection,
      extensions: [markdown({ extensions: [GFM] })],
    }),
  });
}

function docOf(view: EditorView): string {
  return view.state.doc.toString();
}

let activeView: EditorView | null = null;

function tracked(view: EditorView): EditorView {
  activeView = view;
  return view;
}

afterEach(() => {
  activeView?.destroy();
  activeView = null;
});

describe('updateImageMetadata', () => {
  it('updates alt and URL when the selection is inside an image with a title', () => {
    const doc = '![Old](old.png "Title")';
    const view = tracked(createView(doc, EditorSelection.cursor(doc.indexOf('Old'))));

    expect(updateImageMetadata(view, { alt: 'New', url: 'new.png' })).toBe(true);

    expect(docOf(view)).toBe('![New](new.png "Title")');
  });

  it('adds dimensions as markdown image attributes', () => {
    const doc = '![Diagram](diagram.png)';
    const view = tracked(createView(doc, EditorSelection.cursor(doc.indexOf('Diagram'))));

    expect(updateImageMetadata(view, { width: 640, height: 360 })).toBe(true);

    expect(docOf(view)).toBe('![Diagram](diagram.png){width=640 height=360}');
  });

  it('clears dimensions and keeps the title', () => {
    const doc = '![Diagram](diagram.png "Title"){width=640 height=360}';
    const view = tracked(createView(doc, EditorSelection.cursor(doc.indexOf('width'))));

    expect(clearImageDimensions(view)).toBe(true);

    expect(docOf(view)).toBe('![Diagram](diagram.png "Title")');
  });

  it('returns false outside images without changing the document', () => {
    const doc = 'plain text\n![Diagram](diagram.png)';
    const view = tracked(createView(doc, EditorSelection.cursor(2)));

    expect(updateImageMetadata(view, { alt: 'Updated' })).toBe(false);

    expect(docOf(view)).toBe(doc);
  });

  it('leaves unrelated text before and after the image unchanged', () => {
    const image = '![Old](old.png "Title")';
    const doc = `before ${image} after`;
    const view = tracked(createView(doc, EditorSelection.cursor(doc.indexOf('Old'))));

    expect(updateImageMetadata(view, { alt: 'New', url: 'new.png' })).toBe(true);

    expect(docOf(view)).toBe('before ![New](new.png "Title") after');
  });

  it('updates the image when the cursor is at image end before a newline', () => {
    const image = '![Old](old.png)';
    const doc = `${image}\nnext`;
    const view = tracked(createView(doc, EditorSelection.cursor(image.length)));

    expect(updateImageMetadata(view, { alt: 'New' })).toBe(true);

    expect(docOf(view)).toBe('![New](old.png)\nnext');
  });

  it('preserves unknown attributes when adding and changing dimensions', () => {
    const doc = '![Hero](hero.png){#hero .wide width=100}';
    const view = tracked(createView(doc, EditorSelection.cursor(doc.indexOf('Hero'))));

    expect(updateImageMetadata(view, { width: 640, height: 360 })).toBe(true);

    expect(docOf(view)).toBe('![Hero](hero.png){#hero .wide width=640 height=360}');
  });

  it('updates the second adjacent image when the cursor is at its start', () => {
    const first = '![First](first.png)';
    const second = '![Second](second.png)';
    const doc = `${first}${second}`;
    const view = tracked(createView(doc, EditorSelection.cursor(first.length)));

    expect(updateImageMetadata(view, { alt: 'Updated', width: 320 })).toBe(true);

    expect(docOf(view)).toBe('![First](first.png)![Updated](second.png){width=320}');
  });

  it('is registered as a built-in command', () => {
    const doc = '![Old](old.png)';
    const view = tracked(createView(doc, EditorSelection.cursor(doc.indexOf('Old'))));

    expect(BUILTIN_COMMANDS.updateImageMetadata(view, { alt: 'New' })).toBe(true);

    expect(docOf(view)).toBe('![New](old.png)');
  });
});
