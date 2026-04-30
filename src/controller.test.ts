import { afterEach, describe, expect, it, vi } from 'vitest';
import { EditorSelection, EditorState, StateField, type Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import {
  EditorController,
  type ControllerSettings,
  type EditorCallbacks,
} from './controller';
import { DEFAULT_KEYMAP } from './commands';
import type { GalleyFileInput, GalleyFileStatus } from './types';

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

function destroyController(controller: EditorController): void {
  controller.destroy();
  const index = controllers.indexOf(controller);
  if (index >= 0) controllers.splice(index, 1);
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

function setScrollMetrics(view: EditorView, scrollTop: number): void {
  Object.defineProperties(view.scrollDOM, {
    clientHeight: { configurable: true, value: 100 },
    scrollHeight: { configurable: true, value: 500 },
  });
  view.scrollDOM.scrollTop = scrollTop;
}

function dispatchScroll(view: EditorView): Event {
  const event = new Event('scroll', {
    bubbles: true,
    cancelable: false,
  });
  view.scrollDOM.dispatchEvent(event);
  return event;
}

function fileDataTransfer(file: File): DataTransfer {
  if (typeof DataTransfer !== 'undefined') {
    const transfer = new DataTransfer();
    transfer.items.add(file);
    return transfer;
  }

  return {
    files: [file],
    getData: () => '',
    types: [],
  } as unknown as DataTransfer;
}

function pasteEvent(transfer: DataTransfer): ClipboardEvent {
  const event = typeof ClipboardEvent !== 'undefined'
    ? new ClipboardEvent('paste', {
      bubbles: true,
      cancelable: true,
    })
    : new Event('paste', {
      bubbles: true,
      cancelable: true,
    }) as ClipboardEvent;
  Object.defineProperty(event, 'clipboardData', {
    configurable: true,
    value: transfer,
  });
  return event;
}

function dropEvent(transfer: DataTransfer): DragEvent {
  const event = typeof DragEvent !== 'undefined'
    ? new DragEvent('drop', {
      bubbles: true,
      cancelable: true,
      clientX: 0,
      clientY: 0,
    })
    : new Event('drop', {
      bubbles: true,
      cancelable: true,
    }) as DragEvent;
  Object.defineProperty(event, 'dataTransfer', {
    configurable: true,
    value: transfer,
  });
  return event;
}

function dragoverEvent(transfer: DataTransfer): DragEvent {
  const event = typeof DragEvent !== 'undefined'
    ? new DragEvent('dragover', {
      bubbles: true,
      cancelable: true,
    })
    : new Event('dragover', {
      bubbles: true,
      cancelable: true,
    }) as DragEvent;
  Object.defineProperty(event, 'dataTransfer', {
    configurable: true,
    value: transfer,
  });
  return event;
}

function dragleaveEvent(transfer: DataTransfer): DragEvent {
  const event = typeof DragEvent !== 'undefined'
    ? new DragEvent('dragleave', {
      bubbles: true,
      cancelable: true,
    })
    : new Event('dragleave', {
      bubbles: true,
      cancelable: true,
    }) as DragEvent;
  Object.defineProperty(event, 'dataTransfer', {
    configurable: true,
    value: transfer,
  });
  return event;
}

function fileIntentDataTransfer(): DataTransfer {
  return {
    files: [],
    types: ['Files'],
  } as unknown as DataTransfer;
}

function nonFileIntentDataTransfer(): DataTransfer {
  return {
    files: [],
    types: ['text/plain'],
  } as unknown as DataTransfer;
}

async function nextMicrotask(): Promise<void> {
  await Promise.resolve();
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

function docChangedListener(fn: () => void): Extension {
  return EditorView.updateListener.of((update) => {
    if (update.docChanged) fn();
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

  it('falls through Tab when tabIndents=false', () => {
    const controller = createController('hello', {}, { tabIndents: false });
    const event = dispatchKey(controller.view, {
      key: 'Tab',
      code: 'Tab',
      keyCode: 9,
      which: 9,
    });

    expect(event.defaultPrevented).toBe(false);
  });

  it('preserves defaults when keymap is extended and keeps custom binding', () => {
    const custom = vi.fn(() => true);
    const controller = createController('hello', {}, {
      keymap: (defaults) => [...defaults, { key: 'F9', run: () => custom() }],
    });

    const f9 = dispatchKey(controller.view, {
      key: 'F9',
      code: 'F9',
      keyCode: 120,
      which: 120,
    });
    expect(custom).toHaveBeenCalledOnce();
    expect(f9.defaultPrevented).toBe(true);

    controller.view.dispatch({
      selection: EditorSelection.cursor(controller.getContent().length),
    });

    dispatchKey(controller.view, {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13,
    });
    expect(controller.getContent()).toBe('hello\n');
  });

  it('exports the v0.5 default key bindings', () => {
    expect(DEFAULT_KEYMAP.map((binding) => binding.key)).toEqual(
      expect.arrayContaining([
        'Mod-d',
        'Alt-ArrowUp',
        'Alt-ArrowDown',
        'Mod-Alt-ArrowUp',
        'Mod-Alt-ArrowDown',
      ]),
    );
  });

  it('uses Mod-D to duplicate the current line by default', () => {
    const controller = createController('one\ntwo');
    controller.select(1);

    const event = dispatchKey(controller.view, {
      key: 'D',
      code: 'KeyD',
      keyCode: 68,
      which: 68,
      ctrlKey: true,
    });

    expect(event.defaultPrevented).toBe(true);
    expect(controller.getContent()).toBe('one\none\ntwo');
  });

  it('lets array-form keymap replace defaults completely', () => {
    const custom = vi.fn(() => true);
    const controller = createController('one\ntwo', {}, {
      keymap: [{ key: 'F8', run: () => custom() }],
    });
    controller.select(1);

    const duplicate = dispatchKey(controller.view, {
      key: 'D',
      code: 'KeyD',
      keyCode: 68,
      which: 68,
      ctrlKey: true,
    });
    const f8 = dispatchKey(controller.view, {
      key: 'F8',
      code: 'F8',
      keyCode: 119,
      which: 119,
    });

    expect(duplicate.defaultPrevented).toBe(false);
    expect(controller.getContent()).toBe('one\ntwo');
    expect(custom).toHaveBeenCalledOnce();
    expect(f8.defaultPrevented).toBe(true);
  });

  it('passes exported defaults to the function-form keymap', () => {
    let receivedDefaults: string[] = [];
    createController('hello', {}, {
      keymap: (defaults) => {
        receivedDefaults = defaults.map((binding) => binding.key ?? '');
        return defaults;
      },
    });

    expect(receivedDefaults).toEqual(
      expect.arrayContaining(DEFAULT_KEYMAP.map((binding) => binding.key ?? '')),
    );
  });
});

describe('EditorController runtime state', () => {
  it('accepts file workflow callbacks through stable callbacks', () => {
    const controller = createController('', {
      onFiles: () => '![demo](demo.png)',
      onFileError: () => undefined,
    });

    expect(controller.view).toBeDefined();
  });

  it('accepts upload and image UX renderer settings', () => {
    const controller = createController('', {}, {
      uploadInteraction: 'overlay',
      uploadPlaceholderRenderer: () => document.createElement('div'),
      dropIndicatorRenderer: () => document.createElement('div'),
      uploadOverlayRenderer: () => document.createElement('div'),
      missingImageRenderer: () => document.createElement('div'),
      imageControlsRenderer: () => document.createElement('div'),
    });

    expect(controller.view).toBeDefined();
  });

  it('does not corrupt image markdown when updateImageMetadata receives null args', () => {
    const doc = '![Diagram](diagram.png)';
    const controller = createController(doc);
    controller.select(doc.indexOf('Diagram'));

    expect(() => controller.execCommand('updateImageMetadata', null)).not.toThrow();

    expect(controller.getContent()).toBe(doc);
  });

  it('updates image metadata through execCommand', () => {
    const doc = '![Diagram](diagram.png)';
    const controller = createController(doc);
    controller.select(doc.indexOf('Diagram'));

    expect(controller.execCommand('updateImageMetadata', { width: 640 })).toBe(true);

    expect(controller.getContent()).toBe('![Diagram](diagram.png){width=640}');
  });

  it('ignores malformed image metadata fields through execCommand', () => {
    const doc = '![Diagram](diagram.png)';
    const controller = createController(doc);
    controller.select(doc.indexOf('Diagram'));

    expect(() =>
      controller.execCommand('updateImageMetadata', {
        alt: Symbol('x'),
        width: '640',
      }),
    ).not.toThrow();

    expect(controller.getContent()).toBe(doc);
  });

  it('applies valid mixed image metadata fields through execCommand', () => {
    const doc = '![Old](old.png "Title")';
    const controller = createController(doc);
    controller.select(doc.indexOf('Old'));

    expect(controller.execCommand('updateImageMetadata', {
      alt: 'New',
      title: null,
      width: 640,
    })).toBe(true);

    expect(controller.getContent()).toBe('![New](old.png){width=640}');
  });

  it('inserts markdown returned from a paste file handler', async () => {
    const file = new File(['image'], 'demo.png', { type: 'image/png' });
    const onFiles = vi.fn(() => '![upload](uploaded.png)');
    const callbacks = { onFiles };
    const controller = createController('before ', callbacks);

    const event = pasteEvent(fileDataTransfer(file));
    controller.view.contentDOM.dispatchEvent(event);
    await nextMicrotask();

    expect(event.defaultPrevented).toBe(true);
    expect(onFiles).toHaveBeenCalledOnce();
    expect(controller.getContent()).toContain('![upload](uploaded.png)');
  });

  it('does not process pasted files when editable=false', async () => {
    const file = new File(['image'], 'demo.png', { type: 'image/png' });
    const onFiles = vi.fn(() => '![upload](uploaded.png)');
    const callbacks = { onFiles };
    const controller = createController('unchanged', callbacks, { editable: false });

    const event = pasteEvent(fileDataTransfer(file));
    controller.view.contentDOM.dispatchEvent(event);
    await nextMicrotask();

    expect(onFiles).not.toHaveBeenCalled();
    expect(controller.getContent()).toBe('unchanged');
  });

  it('does not process pasted files in preview mode', async () => {
    const file = new File(['image'], 'demo.png', { type: 'image/png' });
    const onFiles = vi.fn(() => '![upload](uploaded.png)');
    const callbacks = { onFiles };
    const controller = createController('unchanged', callbacks, { mode: 'preview' });

    const event = pasteEvent(fileDataTransfer(file));
    controller.view.contentDOM.dispatchEvent(event);
    await nextMicrotask();

    expect(onFiles).not.toHaveBeenCalled();
    expect(controller.getContent()).toBe('unchanged');
  });

  it('does not mutate when async paste resolves after editable becomes false', async () => {
    const file = new File(['image'], 'demo.png', { type: 'image/png' });
    let resolveUpload!: (markdown: string) => void;
    const upload = new Promise<string>((resolve) => {
      resolveUpload = resolve;
    });
    const onFiles = vi.fn(() => upload);
    const callbacks = { onFiles };
    const controller = createController('unchanged', callbacks);

    const event = pasteEvent(fileDataTransfer(file));
    controller.view.contentDOM.dispatchEvent(event);
    controller.updateSettings(defaultSettings({ editable: false }));
    resolveUpload('![upload](uploaded.png)');
    await upload;
    await nextMicrotask();

    expect(onFiles).toHaveBeenCalledOnce();
    expect(controller.getContent()).toBe('unchanged');
  });

  it('emits paste file status from start through consumer progress to complete', async () => {
    const file = new File(['image'], 'demo.png', { type: 'image/png' });
    const statuses: GalleyFileStatus[] = [];
    const onFiles = vi.fn((input: GalleyFileInput) => {
      input.report({ phase: 'progress', progress: 0.5, message: 'Uploading...' });
      return '![upload](uploaded.png)';
    });
    const callbacks = {
      onFiles,
      onFileStatus: (status: (typeof statuses)[number]) => statuses.push(status),
    };
    const controller = createController('before ', callbacks);

    const event = pasteEvent(fileDataTransfer(file));
    controller.view.contentDOM.dispatchEvent(event);
    await nextMicrotask();

    expect(statuses.map((status) => status.phase)).toEqual(['start', 'progress', 'complete']);
    expect(new Set(statuses.map((status) => status.id)).size).toBe(1);
    expect(statuses).toEqual([
      expect.objectContaining({
        phase: 'start',
        files: [file],
        source: 'paste',
        progress: 0,
      }),
      expect.objectContaining({
        phase: 'progress',
        files: [file],
        source: 'paste',
        progress: 0.5,
        message: 'Uploading...',
      }),
      expect.objectContaining({
        phase: 'complete',
        files: [file],
        source: 'paste',
        progress: 1,
      }),
    ]);
  });

  it('shows paste upload placeholder and replaces it with returned markdown', async () => {
    const file = new File(['image'], 'demo.png', { type: 'image/png' });
    let resolveUpload!: (markdown: string) => void;
    const upload = new Promise<string>((resolve) => {
      resolveUpload = resolve;
    });
    const onFiles = vi.fn((input: GalleyFileInput) => {
      input.report({ phase: 'progress', progress: 0.5, message: 'Uploading...' });
      return upload;
    });
    const controller = createController('before ', { onFiles });
    controller.select(controller.getContent().length);

    const event = pasteEvent(fileDataTransfer(file));
    controller.view.contentDOM.dispatchEvent(event);
    await nextMicrotask();

    const placeholder = controller.view.dom.querySelector('.ge-upload-placeholder');
    expect(placeholder).toBeInstanceOf(HTMLElement);
    expect(placeholder?.textContent).toContain('Uploading...');

    resolveUpload('![upload](uploaded.png)');
    await upload;
    await nextMicrotask();

    expect(controller.getContent()).toBe('before ![upload](uploaded.png)');
    expect(controller.view.dom.querySelector('.ge-upload-placeholder')).toBeNull();
  });

  it('does not fail upload when file status callback throws', async () => {
    const file = new File(['image'], 'demo.png', { type: 'image/png' });
    const statusError = new Error('status failed');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const onFiles = vi.fn(() => '![upload](uploaded.png)');
    const onFileError = vi.fn();
    const callbacks = {
      onFiles,
      onFileError,
      onFileStatus: vi.fn(() => {
        throw statusError;
      }),
    };
    const controller = createController('before ', callbacks);

    try {
      const event = pasteEvent(fileDataTransfer(file));
      controller.view.contentDOM.dispatchEvent(event);
      await nextMicrotask();

      expect(onFiles).toHaveBeenCalledOnce();
      expect(onFileError).not.toHaveBeenCalled();
      expect(controller.getContent()).toContain('![upload](uploaded.png)');
      expect(consoleError).toHaveBeenCalledWith('Galley file status handler failed', statusError);
    } finally {
      consoleError.mockRestore();
    }
  });

  it('maps async paste insertion through document changes before handler resolution', async () => {
    const file = new File(['image'], 'demo.png', { type: 'image/png' });
    let resolveUpload!: (markdown: string) => void;
    const upload = new Promise<string>((resolve) => {
      resolveUpload = resolve;
    });
    const onFiles = vi.fn(() => upload);
    const callbacks = { onFiles };
    const controller = createController('before ', callbacks);
    controller.select(controller.getContent().length);

    const event = pasteEvent(fileDataTransfer(file));
    controller.view.contentDOM.dispatchEvent(event);
    controller.view.dispatch({
      changes: { from: 0, insert: 'prefix ' },
    });
    resolveUpload('![upload](uploaded.png)');
    await upload;
    await nextMicrotask();

    expect(onFiles).toHaveBeenCalledOnce();
    expect(controller.getContent()).toBe('prefix before ![upload](uploaded.png)');
  });

  it('leaves content unchanged when a paste file handler returns false', async () => {
    const file = new File(['image'], 'demo.png', { type: 'image/png' });
    const onFiles = vi.fn(() => false as const);
    const callbacks = { onFiles };
    const controller = createController('unchanged', callbacks);

    const event = pasteEvent(fileDataTransfer(file));
    controller.view.contentDOM.dispatchEvent(event);
    await nextMicrotask();

    expect(event.defaultPrevented).toBe(true);
    expect(onFiles).toHaveBeenCalledOnce();
    expect(controller.getContent()).toBe('unchanged');
  });

  it('reports paste file handler errors without changing content', async () => {
    const file = new File(['image'], 'demo.png', { type: 'image/png' });
    const error = new Error('upload failed');
    const onFiles = vi.fn(async () => {
      throw error;
    });
    const onFileError = vi.fn();
    const callbacks = { onFiles, onFileError };
    const controller = createController('unchanged', callbacks);

    const event = pasteEvent(fileDataTransfer(file));
    controller.view.contentDOM.dispatchEvent(event);
    await nextMicrotask();

    expect(event.defaultPrevented).toBe(true);
    expect(onFileError).toHaveBeenCalledOnce();
    expect(onFileError).toHaveBeenCalledWith(error, expect.objectContaining({
      files: [file],
      source: 'paste',
      event,
      view: controller.view,
    }));
    expect(controller.getContent()).toBe('unchanged');
  });

  it('emits paste file error status and calls onFileError when handler rejects', async () => {
    const file = new File(['image'], 'demo.png', { type: 'image/png' });
    const error = new Error('upload failed');
    const statuses: GalleyFileStatus[] = [];
    const onFiles = vi.fn(async () => {
      throw error;
    });
    const onFileError = vi.fn();
    const callbacks = {
      onFiles,
      onFileError,
      onFileStatus: (status: (typeof statuses)[number]) => statuses.push(status),
    };
    const controller = createController('unchanged', callbacks);

    const event = pasteEvent(fileDataTransfer(file));
    controller.view.contentDOM.dispatchEvent(event);
    await nextMicrotask();

    expect(statuses.map((status) => status.phase)).toEqual(['start', 'error']);
    expect(new Set(statuses.map((status) => status.id)).size).toBe(1);
    expect(statuses).toEqual([
      expect.objectContaining({
        phase: 'start',
        files: [file],
        source: 'paste',
      }),
      expect.objectContaining({
        phase: 'error',
        files: [file],
        source: 'paste',
        error,
      }),
    ]);
    expect(onFileError).toHaveBeenCalledOnce();
  });

  it('inserts markdown returned from a drop file handler', async () => {
    const file = new File(['image'], 'demo.png', { type: 'image/png' });
    const onFiles = vi.fn(() => '![upload](uploaded.png)');
    const callbacks = { onFiles };
    const controller = createController('before ', callbacks);

    const event = dropEvent(fileDataTransfer(file));
    controller.view.contentDOM.dispatchEvent(event);
    await nextMicrotask();

    expect(event.defaultPrevented).toBe(true);
    expect(onFiles).toHaveBeenCalledOnce();
    expect(controller.getContent()).toContain('![upload](uploaded.png)');
  });

  it('shows drop upload progress then inserts returned markdown and removes placeholder', async () => {
    const file = new File(['image'], 'demo.png', { type: 'image/png' });
    let resolveUpload!: (markdown: string) => void;
    const upload = new Promise<string>((resolve) => {
      resolveUpload = resolve;
    });
    const onFiles = vi.fn((input: GalleyFileInput) => {
      input.report({ phase: 'progress', progress: 0.25, message: 'Uploading...' });
      return upload;
    });
    const controller = createController('before ', { onFiles });
    vi.spyOn(controller.view, 'posAtCoords').mockReturnValue(null);
    controller.select(controller.getContent().length);

    const event = dropEvent(fileDataTransfer(file));
    controller.view.contentDOM.dispatchEvent(event);
    await nextMicrotask();

    const placeholder = controller.view.dom.querySelector('.ge-upload-placeholder');
    expect(event.defaultPrevented).toBe(true);
    expect(onFiles).toHaveBeenCalledOnce();
    expect(placeholder).toBeInstanceOf(HTMLElement);
    expect(placeholder?.textContent).toContain('Uploading...');

    resolveUpload('![upload](uploaded.png)');
    await upload;
    await nextMicrotask();

    expect(controller.getContent()).toBe('before ![upload](uploaded.png)');
    expect(controller.view.dom.querySelector('.ge-upload-placeholder')).toBeNull();
  });

  it('blocks ordinary edits in locked mode while upload is active and allows them after completion', async () => {
    const file = new File(['image'], 'demo.png', { type: 'image/png' });
    let resolveUpload!: (markdown: string) => void;
    const upload = new Promise<string>((resolve) => {
      resolveUpload = resolve;
    });
    const onFiles = vi.fn(() => upload);
    const controller = createController('before ', { onFiles }, { uploadInteraction: 'locked' });
    controller.select(controller.getContent().length);

    const event = pasteEvent(fileDataTransfer(file));
    controller.view.contentDOM.dispatchEvent(event);
    await nextMicrotask();

    controller.view.dispatch({ changes: { from: 0, insert: 'blocked ' } });
    expect(controller.getContent()).toBe('before ');

    resolveUpload('![upload](uploaded.png)');
    await upload;
    await nextMicrotask();

    expect(controller.getContent()).toBe('before ![upload](uploaded.png)');

    controller.view.dispatch({ changes: { from: 0, insert: 'allowed ' } });
    expect(controller.getContent()).toBe('allowed before ![upload](uploaded.png)');
  });

  it('does not process dropped files when editable=false', async () => {
    const file = new File(['image'], 'demo.png', { type: 'image/png' });
    const onFiles = vi.fn(() => '![upload](uploaded.png)');
    const callbacks = { onFiles };
    const controller = createController('unchanged', callbacks, { editable: false });

    const event = dropEvent(fileDataTransfer(file));
    controller.view.contentDOM.dispatchEvent(event);
    await nextMicrotask();

    expect(onFiles).not.toHaveBeenCalled();
    expect(controller.getContent()).toBe('unchanged');
  });

  it('does not process dropped files in preview mode', async () => {
    const file = new File(['image'], 'demo.png', { type: 'image/png' });
    const onFiles = vi.fn(() => '![upload](uploaded.png)');
    const callbacks = { onFiles };
    const controller = createController('unchanged', callbacks, { mode: 'preview' });

    const event = dropEvent(fileDataTransfer(file));
    controller.view.contentDOM.dispatchEvent(event);
    await nextMicrotask();

    expect(onFiles).not.toHaveBeenCalled();
    expect(controller.getContent()).toBe('unchanged');
  });

  it('allows file dragover when files are only advertised in data transfer types', () => {
    const onFiles = vi.fn(() => '![upload](uploaded.png)');
    const callbacks = { onFiles };
    const controller = createController('before ', callbacks);

    const event = dragoverEvent(fileIntentDataTransfer());
    controller.view.contentDOM.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(onFiles).not.toHaveBeenCalled();
  });

  it('shows a drop indicator on file dragover and clears it on dragleave and drop', async () => {
    const file = new File(['image'], 'demo.png', { type: 'image/png' });
    const onFiles = vi.fn(() => '![upload](uploaded.png)');
    const controller = createController('before ', { onFiles });

    const dragover = dragoverEvent(fileIntentDataTransfer());
    controller.view.contentDOM.dispatchEvent(dragover);

    expect(dragover.defaultPrevented).toBe(true);
    expect(controller.view.dom.querySelector('.ge-drop-indicator')).toBeInstanceOf(HTMLElement);

    controller.view.contentDOM.dispatchEvent(dragleaveEvent(fileIntentDataTransfer()));
    expect(controller.view.dom.querySelector('.ge-drop-indicator')).toBeNull();

    controller.view.contentDOM.dispatchEvent(dragoverEvent(fileIntentDataTransfer()));
    expect(controller.view.dom.querySelector('.ge-drop-indicator')).toBeInstanceOf(HTMLElement);

    const drop = dropEvent(fileDataTransfer(file));
    controller.view.contentDOM.dispatchEvent(drop);
    await nextMicrotask();

    expect(drop.defaultPrevented).toBe(true);
    expect(controller.view.dom.querySelector('.ge-drop-indicator')).toBeNull();
  });

  it('does not allow file dragover when editable=false', () => {
    const onFiles = vi.fn(() => '![upload](uploaded.png)');
    const callbacks = { onFiles };
    const controller = createController('before ', callbacks, { editable: false });

    const event = dragoverEvent(fileIntentDataTransfer());
    controller.view.contentDOM.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    expect(onFiles).not.toHaveBeenCalled();
  });

  it('does not allow file dragover in preview mode', () => {
    const onFiles = vi.fn(() => '![upload](uploaded.png)');
    const callbacks = { onFiles };
    const controller = createController('before ', callbacks, { mode: 'preview' });

    const event = dragoverEvent(fileIntentDataTransfer());
    controller.view.contentDOM.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    expect(onFiles).not.toHaveBeenCalled();
  });

  it('does not allow non-file dragover data', () => {
    const onFiles = vi.fn(() => '![upload](uploaded.png)');
    const callbacks = { onFiles };
    const controller = createController('before ', callbacks);

    const event = dragoverEvent(nonFileIntentDataTransfer());
    controller.view.contentDOM.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    expect(onFiles).not.toHaveBeenCalled();
  });

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

  it('activates runtime extensions until removal and treats double remove as idempotent', () => {
    const onDocChanged = vi.fn();
    const controller = createController('hello');
    const handle = controller.addExtension(docChangedListener(onDocChanged));

    controller.insertText('!');
    expect(onDocChanged).toHaveBeenCalledOnce();

    handle.remove();
    handle.remove();
    controller.insertText('?');

    expect(onDocChanged).toHaveBeenCalledOnce();
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

  it('does not call pending selection callbacks after destroy', () => {
    vi.useFakeTimers();
    const onSelectionChange = vi.fn();
    const controller = createController('0123456789', { onSelectionChange });

    controller.select(5);
    destroyController(controller);
    vi.advanceTimersByTime(16);

    expect(onSelectionChange).not.toHaveBeenCalled();
  });

  it('coalesces synchronous scroll events to one animation-frame callback', () => {
    vi.useFakeTimers();
    const onScroll = vi.fn();
    const controller = createController('hello', { onScroll });

    setScrollMetrics(controller.view, 100);
    dispatchScroll(controller.view);
    setScrollMetrics(controller.view, 300);
    dispatchScroll(controller.view);

    expect(onScroll).not.toHaveBeenCalled();

    vi.advanceTimersByTime(16);

    expect(onScroll).toHaveBeenCalledOnce();
    expect(onScroll).toHaveBeenCalledWith(0.75);
  });

  it('does not call pending scroll callbacks after destroy', () => {
    vi.useFakeTimers();
    const onScroll = vi.fn();
    const controller = createController('hello', { onScroll });

    setScrollMetrics(controller.view, 100);
    dispatchScroll(controller.view);
    destroyController(controller);
    vi.advanceTimersByTime(16);

    expect(onScroll).not.toHaveBeenCalled();
  });
});
