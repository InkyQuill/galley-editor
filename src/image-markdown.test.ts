import { markdown } from '@codemirror/lang-markdown';
import { EditorSelection, EditorState } from '@codemirror/state';
import { GFM } from '@lezer/markdown';
import { describe, expect, it } from 'vitest';
import {
  imageAtSelection,
  parseImageMarkdown,
  serializeImageMarkdown,
} from './image-markdown';
import type { GalleyImageInfo } from './types';

function createMarkdownState(doc: string, selection: EditorSelection | { anchor: number; head?: number }) {
  return EditorState.create({
    doc,
    selection,
    extensions: [markdown({ extensions: [GFM] })],
  });
}

describe('parseImageMarkdown', () => {
  it('parses title, dimensions, raw text, and source range', () => {
    const raw = '![Diagram](diagram.png "System"){width=640 height=360}';

    expect(parseImageMarkdown(raw, 5, 5 + raw.length)).toEqual({
      alt: 'Diagram',
      url: 'diagram.png',
      title: 'System',
      width: 640,
      height: 360,
      raw,
      from: 5,
      to: 5 + raw.length,
    });
  });

  it('parses explicit zero dimensions', () => {
    const raw = '![Diagram](diagram.png){width=0 height=0}';

    expect(parseImageMarkdown(raw)).toMatchObject({
      width: 0,
      height: 0,
    });
  });

  it('does not parse empty dimensions as zero', () => {
    const raw = '![Diagram](diagram.png){width= height=}';
    const image = parseImageMarkdown(raw);

    expect(image?.width).toBeUndefined();
    expect(image?.height).toBeUndefined();
  });

  it('preserves unknown attributes', () => {
    const raw = '![x](a){#hero .wide width=100}';

    expect(parseImageMarkdown(raw)).toMatchObject({
      alt: 'x',
      url: 'a',
      width: 100,
      attrs: ['#hero', '.wide'],
    });
  });

  it('preserves urls that contain parentheses', () => {
    const dataUrl = "data:image/svg+xml,%3csvg%3e%3crect%20fill='url(%23sky)'/%3e%3c/svg%3e";
    const raw = `![Galley logo](${dataUrl})`;

    expect(parseImageMarkdown(raw)).toMatchObject({
      alt: 'Galley logo',
      url: dataUrl,
      raw,
      from: 0,
      to: raw.length,
    });
  });
});

describe('serializeImageMarkdown', () => {
  it('applies metadata patches and removes nullable fields', () => {
    const image: GalleyImageInfo = {
      alt: 'Diagram',
      url: 'diagram.png',
      title: 'System',
      width: 640,
      height: 360,
      raw: '![Diagram](diagram.png "System"){width=640 height=360}',
      from: 0,
      to: 55,
    };

    expect(serializeImageMarkdown(image, {
      alt: 'Updated',
      title: null,
      width: null,
      height: 720,
    })).toBe('![Updated](diagram.png){height=720}');
  });

  it('serializes explicit zero dimensions', () => {
    const image: GalleyImageInfo = {
      alt: 'Diagram',
      url: 'diagram.png',
      raw: '![Diagram](diagram.png)',
      from: 0,
      to: 23,
    };

    expect(serializeImageMarkdown(image, {
      width: 0,
      height: 0,
    })).toBe('![Diagram](diagram.png){width=0 height=0}');
  });

  it('preserves unknown attributes when patching metadata', () => {
    const image = parseImageMarkdown('![x](a){#hero .wide width=100}');

    expect(image).not.toBeNull();
    expect(serializeImageMarkdown(image as GalleyImageInfo, {
      height: 200,
    })).toBe('![x](a){#hero .wide width=100 height=200}');
  });
});

describe('imageAtSelection', () => {
  it('returns the image on the current line when the main selection is inside its token', () => {
    const raw = '![Diagram](diagram.png "System"){width=640 height=360}';
    const doc = `intro\n${raw}\nplain`;
    const from = doc.indexOf(raw);
    const state = createMarkdownState(doc, EditorSelection.cursor(from + 3));

    expect(imageAtSelection(state)).toEqual({
      alt: 'Diagram',
      url: 'diagram.png',
      title: 'System',
      width: 640,
      height: 360,
      raw,
      from,
      to: from + raw.length,
    });
  });

  it('returns null when the main selection is outside the image token', () => {
    const raw = '![Diagram](diagram.png "System"){width=640 height=360}';
    const doc = `intro\n${raw}\nplain`;
    const from = doc.indexOf(raw);
    const state = createMarkdownState(doc, EditorSelection.cursor(from + raw.length + 1));

    expect(imageAtSelection(state)).toBeNull();
  });
});
