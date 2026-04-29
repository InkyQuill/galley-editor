import { afterEach, describe, expect, it, vi } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { autosizeExtension } from './autosize';

const views: EditorView[] = [];
const parents: HTMLElement[] = [];

function createAutosizeView(options: {
  doc?: string;
  minRows: number;
  maxRows?: number;
  lineHeight: number;
  contentHeight: number;
}): EditorView {
  const parent = document.body.appendChild(document.createElement('div'));
  parents.push(parent);

  const state = EditorState.create({
    doc: options.doc ?? '',
    extensions: [autosizeExtension(options.minRows, options.maxRows)],
  });
  const view = new EditorView({ state, parent });
  views.push(view);

  Object.defineProperties(view, {
    defaultLineHeight: {
      configurable: true,
      value: options.lineHeight,
    },
  });
  Object.defineProperties(view.contentDOM, {
    scrollHeight: {
      configurable: true,
      value: options.contentHeight,
    },
  });

  return view;
}

function appendText(view: EditorView, text: string): void {
  view.dispatch({
    changes: {
      from: view.state.doc.length,
      insert: text,
    },
  });
}

function setContentHeight(view: EditorView, contentHeight: number): void {
  Object.defineProperties(view.contentDOM, {
    scrollHeight: {
      configurable: true,
      value: contentHeight,
    },
  });
}

function flushMeasure(): void {
  vi.advanceTimersByTime(16);
}

function countHeightWrites(style: CSSStyleDeclaration): () => number {
  let writes = 0;
  let height = style.height;

  Object.defineProperty(style, 'height', {
    configurable: true,
    get: () => height,
    set: (value: string) => {
      writes += 1;
      height = value;
    },
  });

  return () => writes;
}

afterEach(() => {
  vi.useRealTimers();
  for (const view of views) view.destroy();
  views.length = 0;
  for (const parent of parents) parent.remove();
  parents.length = 0;
});

describe('autosizeExtension', () => {
  it('stabilizes a short document without rewriting the same height', () => {
    vi.useFakeTimers();
    const view = createAutosizeView({
      minRows: 3,
      maxRows: 10,
      lineHeight: 20,
      contentHeight: 12,
    });
    const heightWrites = countHeightWrites(view.scrollDOM.style);

    appendText(view, 'a');
    flushMeasure();
    appendText(view, 'b');
    flushMeasure();

    expect(view.scrollDOM.style.height).toBe('60px');
    expect(heightWrites()).toBe(1);
  });

  it('ignores target height changes of one pixel or less', () => {
    vi.useFakeTimers();
    const view = createAutosizeView({
      minRows: 1,
      maxRows: 10,
      lineHeight: 20,
      contentHeight: 50,
    });
    const heightWrites = countHeightWrites(view.scrollDOM.style);

    appendText(view, 'a');
    flushMeasure();
    setContentHeight(view, 51);
    appendText(view, 'b');
    flushMeasure();

    expect(view.scrollDOM.style.height).toBe('50px');
    expect(heightWrites()).toBe(1);
  });

  it("sets overflowY to auto when content exceeds maxRows", () => {
    vi.useFakeTimers();
    const view = createAutosizeView({
      minRows: 2,
      maxRows: 4,
      lineHeight: 20,
      contentHeight: 120,
    });

    appendText(view, 'content');
    flushMeasure();

    expect(view.scrollDOM.style.minHeight).toBe('40px');
    expect(view.scrollDOM.style.maxHeight).toBe('80px');
    expect(view.scrollDOM.style.height).toBe('80px');
    expect(view.scrollDOM.style.overflowY).toBe('auto');
  });
});
