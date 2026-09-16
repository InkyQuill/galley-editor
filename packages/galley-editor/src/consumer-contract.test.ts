import { afterEach, describe, expect, it } from 'vitest';
import { EditorView } from '@codemirror/view';
import {
  EditorController,
  type ControllerSettings,
  type EditorCallbacks,
} from './controller';

// ── jsdom scaffolding (mirrors controller.test.ts) ──────────────────────────

const controllers: EditorController[] = [];
const parents: HTMLElement[] = [];

const fallbackDomRect = new DOMRect(0, 0, 0, 0);
const fallbackDomRectList = {
  0: fallbackDomRect,
  length: 1,
  item: (index: number) => index === 0 ? fallbackDomRect : null,
  [Symbol.iterator]: function* iterate() {},
} as DOMRectList;

if (!Range.prototype.getClientRects) {
  Range.prototype.getClientRects = () => fallbackDomRectList;
}
if (!Range.prototype.getBoundingClientRect) {
  Range.prototype.getBoundingClientRect = () => new DOMRect();
}

function defaultSettings(overrides: Partial<ControllerSettings> = {}): ControllerSettings {
  return {
    editable: true,
    placeholder: '',
    theme: 'light',
    editorClassName: '',
    classNames: {},
    minRows: 3,
    layout: 'autosize',
    horizontalScroll: false,
    tabIndents: true,
    bidi: false,
    mode: 'live',
    plugins: [],
    disabledPlugins: [],
    extraExtensions: [],
    uploadInteraction: 'inline',
    ...overrides,
  };
}

function createController(
  initialValue = '',
  callbacks: EditorCallbacks = {},
  settings: Partial<ControllerSettings> = {},
): EditorController {
  const parent = document.createElement('div');
  document.body.appendChild(parent);
  parents.push(parent);

  const controller = new EditorController(
    parent,
    initialValue,
    defaultSettings(settings),
    callbacks,
  );
  controllers.push(controller);
  return controller;
}

afterEach(() => {
  for (const controller of controllers) controller.destroy();
  controllers.length = 0;

  for (const parent of parents) parent.remove();
  parents.length = 0;
});

// ── Consumer-side transaction observer ──────────────────────────────────────
// This is the exact subscription pattern a host app (Galley Desk) uses to
// track manuscript edits through the public `extensions` prop.

interface DocumentChange {
  from: number;
  to: number;
  insert: string;
}

function changeObserver() {
  const changes: DocumentChange[] = [];
  let transactions = 0;
  const observer = EditorView.updateListener.of((update) => {
    transactions += update.transactions.length;
    for (const tr of update.transactions) {
      tr.changes.iterChanges((from, to, _newFrom, _newTo, inserted) => {
        changes.push({ from, to, insert: inserted.toString() });
      });
    }
  });
  return {
    changes,
    observer,
    transactionsSeen: () => transactions,
  };
}

describe('consumer contract: document transactions and positions', () => {
  it('reports a selection replacement as one change in current markdown coordinates', () => {
    const { changes, observer } = changeObserver();
    const controller = createController('**кот**', {}, { extraExtensions: [observer] });

    controller.select(2, 5);
    controller.insertText('кит');

    expect(changes.at(-1)).toEqual({ from: 2, to: 5, insert: 'кит' });
    expect(changes).toHaveLength(1);
    expect(controller.getContent()).toBe('**кит**');
  });

  it('keeps hidden markers part of the document while positions address the raw markdown', () => {
    const { changes, observer } = changeObserver();
    const controller = createController('текст **кот**', {}, { extraExtensions: [observer] });

    // The cursor rests outside the bold node, so the live preview hides the
    // marks and styles the content…
    const line = controller.view.dom.querySelector('.cm-line');
    expect(line?.textContent).toBe('текст кот');
    expect(controller.view.dom.querySelector('.ge-bold')).toBeInstanceOf(HTMLElement);
    // …but the document keeps them: coordinates cover the full markdown.
    expect(controller.getContent()).toBe('текст **кот**');

    controller.select(8, 11);
    expect(controller.getSelection()).toEqual({ from: 8, to: 11, anchor: 8, head: 11 });
    expect(controller.getContent().slice(8, 11)).toBe('кот');

    controller.insertText('кит');
    expect(changes.at(-1)).toEqual({ from: 8, to: 11, insert: 'кит' });
    expect(controller.getContent()).toBe('текст **кит**');
  });

  it('keeps the observer and transaction coordinates stable across reconfiguration', () => {
    const { changes, observer } = changeObserver();
    const controller = createController('**кот**', {}, { extraExtensions: [observer] });
    const originalView = controller.view;

    controller.updateSettings(
      defaultSettings({ theme: 'dark', bidi: true, extraExtensions: [observer] }),
    );

    expect(controller.view).toBe(originalView);

    controller.select(2, 5);
    controller.insertText('кит');

    expect(changes).toHaveLength(1);
    expect(changes.at(-1)).toEqual({ from: 2, to: 5, insert: 'кит' });
    expect(controller.getContent()).toBe('**кит**');
  });

  it('does not dispatch an extra transaction when callbacks are swapped', () => {
    const { changes, observer, transactionsSeen } = changeObserver();
    let onChange: EditorCallbacks['onChange'] = undefined;
    const received: string[] = [];
    // The same stable-ref pattern GalleyEditor uses: the callback identity
    // changes on every consumer render while the editor stays untouched.
    const callbacks: EditorCallbacks = {
      get onChange() {
        return onChange;
      },
    };
    const controller = createController('**кот**', callbacks, { extraExtensions: [observer] });

    controller.select(2, 5);
    const seenBeforeSwap = transactionsSeen();

    onChange = (value) => received.push(value);
    expect(transactionsSeen()).toBe(seenBeforeSwap);

    controller.insertText('кит');
    expect(transactionsSeen()).toBe(seenBeforeSwap + 1);
    expect(changes).toEqual([{ from: 2, to: 5, insert: 'кит' }]);
    expect(received).toEqual(['**кит**']);
  });

  it('reports UTF-16 code-unit positions across astral characters (emoji)', () => {
    const { changes, observer } = changeObserver();
    // '🐱' occupies two UTF-16 code units.
    const controller = createController('🐱 кот', {}, { extraExtensions: [observer] });
    expect(controller.getContent().length).toBe(6);

    controller.select(2, 6);
    controller.insertText('кит');

    expect(changes.at(-1)).toEqual({ from: 2, to: 6, insert: 'кит' });
    expect(controller.getContent()).toBe('🐱кит');
    expect(controller.getContent().length).toBe(5);
  });

  it('normalizes CRLF line separators so positions address the normalized document', () => {
    const { changes, observer } = changeObserver();
    const controller = createController('alpha\r\n**кот**', {}, { extraExtensions: [observer] });

    // CodeMirror normalizes \r\n to \n on load: coordinates in the editor are
    // offsets into the normalized text, not into the raw file bytes.
    expect(controller.getContent()).toBe('alpha\n**кот**');
    expect(controller.getContent().length).toBe(13);

    controller.select(8, 11);
    controller.insertText('кит');
    expect(changes.at(-1)).toEqual({ from: 8, to: 11, insert: 'кит' });
    expect(controller.getContent()).toBe('alpha\n**кит**');

    controller.select(0, 0);
    controller.insertText('первая\r\nвторая ');
    expect(changes.at(-1)).toEqual({ from: 0, to: 0, insert: 'первая\nвторая ' });
    expect(controller.getContent()).toContain('первая\nвторая ');
  });
});
