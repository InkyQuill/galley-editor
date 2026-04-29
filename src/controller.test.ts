import { afterEach, describe, expect, it, vi } from 'vitest';
import { EditorSelection, EditorState, StateField, type Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import {
  EditorController,
  type ControllerSettings,
  type EditorCallbacks,
} from './controller';

const controllers: EditorController[] = [];
const parents: HTMLElement[] = [];

function defaultSettings(overrides: Partial<ControllerSettings> = {}): ControllerSettings {
  return {
    editable: true,
    placeholder: '',
    theme: 'light',
    classNames: {},
    minRows: 3,
    plugins: [],
    disabledPlugins: [],
    extraExtensions: [],
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

function dispatchKey(view: EditorView, init: KeyboardEventInit & { key: string }): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    ...init,
  });
  view.contentDOM.dispatchEvent(event);
  return event;
}

interface InternalConfigState {
  config: {
    base: readonly unknown[];
  };
}

function configBaseLength(state: EditorState): number {
  return (state as unknown as InternalConfigState).config.base.length;
}

function inertExtension(): Extension {
  return StateField.define<number>({
    create: () => 0,
    update: (value) => value,
  });
}

afterEach(() => {
  vi.useRealTimers();
  for (const controller of controllers) controller.destroy();
  controllers.length = 0;

  for (const parent of parents) parent.remove();
  parents.length = 0;
});

describe('EditorController key handling', () => {
  it('passes Escape through when no handler is registered', () => {
    const controller = createController('hello');

    const event = dispatchKey(controller.view, {
      key: 'Escape',
      code: 'Escape',
      keyCode: 27,
      which: 27,
    });

    expect(event.defaultPrevented).toBe(false);
  });

  it('consumes Escape when the handler returns true', () => {
    const onEscape = vi.fn(() => true);
    const controller = createController('hello', { onEscape });

    const event = dispatchKey(controller.view, {
      key: 'Escape',
      code: 'Escape',
      keyCode: 27,
      which: 27,
    });

    expect(onEscape).toHaveBeenCalledOnce();
    expect(event.defaultPrevented).toBe(true);
  });

  it('does not submit on Mod-Shift-Enter and submits once on Mod-Enter', () => {
    const onSubmit = vi.fn();
    const controller = createController('hello', { onSubmit });

    dispatchKey(controller.view, {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13,
      ctrlKey: true,
      shiftKey: true,
    });
    expect(onSubmit).not.toHaveBeenCalled();

    dispatchKey(controller.view, {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13,
      ctrlKey: true,
    });
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it('inserts a newline for each cursor range on Enter', () => {
    const onEnter = vi.fn(() => false);
    const controller = createController('abcd', { onEnter });
    controller.view.dispatch({
      selection: EditorSelection.create([
        EditorSelection.cursor(1),
        EditorSelection.cursor(3),
      ]),
    });

    dispatchKey(controller.view, {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13,
    });

    expect(onEnter).toHaveBeenCalledWith(false, false);
    expect(controller.getContent()).toBe('a\nbc\nd');
    expect(controller.view.state.selection.ranges.map((range) => range.head)).toEqual([2, 5]);
  });
});

describe('EditorController runtime state', () => {
  it('preserves multiple selection ranges when setContent clamps to the new document', () => {
    const controller = createController('0123456789abcdefghij');
    controller.view.dispatch({
      selection: EditorSelection.create(
        [
          EditorSelection.range(8, 2),
          EditorSelection.range(18, 16),
        ],
        1,
      ),
    });

    controller.setContent('0123456789abc');

    expect(controller.getContent()).toBe('0123456789abc');
    expect(controller.view.state.selection.mainIndex).toBe(1);
    expect(
      controller.view.state.selection.ranges.map((range) => ({
        anchor: range.anchor,
        head: range.head,
      })),
    ).toEqual([
      { anchor: 8, head: 2 },
      { anchor: 13, head: 13 },
    ]);
  });

  it('does not grow the root configuration after repeated addExtension remove cycles', () => {
    const controller = createController('hello');
    const initialLength = configBaseLength(controller.view.state);

    for (let i = 0; i < 50; i += 1) {
      const handle = controller.addExtension(inertExtension());
      handle.remove();
    }

    expect(configBaseLength(controller.view.state)).toBe(initialLength);
  });

  it('coalesces synchronous selection changes to one animation-frame callback', () => {
    vi.useFakeTimers();
    const onSelectionChange = vi.fn();
    const controller = createController('0123456789', { onSelectionChange });

    for (let pos = 0; pos < 10; pos += 1) {
      controller.select(pos);
    }

    expect(onSelectionChange).not.toHaveBeenCalled();

    vi.advanceTimersByTime(16);

    expect(onSelectionChange).toHaveBeenCalledOnce();
    expect(onSelectionChange).toHaveBeenCalledWith({
      from: 9,
      to: 9,
      anchor: 9,
      head: 9,
    });
  });
});
