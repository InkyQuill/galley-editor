import { afterEach, describe, expect, it } from 'vitest';
import type { EditorView } from '@codemirror/view';
import { createEditorView, destroyViews } from './test-utils/editor';
import type { GalleyUploadInfo } from './types';
import {
  activeUploads,
  addUpload,
  clearDropIndicator,
  removeUpload,
  setDropIndicator,
  updateUpload,
  uploadRangeById,
  uploadUiExtension,
} from './upload-ui';

const views: EditorView[] = [];

afterEach(() => {
  destroyViews(views);
});

function upload(overrides: Partial<GalleyUploadInfo> = {}): GalleyUploadInfo {
  return {
    id: 'galley-file-1',
    files: [new File(['x'], 'diagram.png', { type: 'image/png' })],
    source: 'drop',
    selection: { from: 6, to: 6, anchor: 6, head: 6 },
    phase: 'start',
    progress: 0,
    ...overrides,
  };
}

describe('uploadUiExtension', () => {
  it('renders inline upload placeholder with progress and correct aria percent', () => {
    const view = createEditorView({
      doc: 'hello world',
      extensions: [uploadUiExtension({ interaction: 'inline' })],
    });
    views.push(view);

    view.dispatch({
      effects: addUpload.of({
        upload: upload({ phase: 'progress', progress: 0.426, message: 'Uploading' }),
        from: 6,
        to: 11,
      }),
    });

    const placeholder = view.dom.querySelector('.ge-upload-placeholder');
    const progress = view.dom.querySelector('.ge-upload-progress');
    expect(placeholder).toBeInstanceOf(HTMLElement);
    expect(placeholder?.getAttribute('role')).toBe('status');
    expect(placeholder?.getAttribute('aria-live')).toBe('polite');
    expect(placeholder?.textContent).toContain('diagram.png');
    expect(placeholder?.textContent).toContain('Uploading');
    expect(progress).toBeInstanceOf(HTMLElement);
    expect(progress?.getAttribute('role')).toBe('progressbar');
    expect(progress?.getAttribute('aria-valuemin')).toBe('0');
    expect(progress?.getAttribute('aria-valuemax')).toBe('100');
    expect(progress?.getAttribute('aria-valuenow')).toBe('43');
    expect(progress?.textContent).toBe('43%');
  });

  it('updates visible placeholder progress when upload reports progress', () => {
    const view = createEditorView({
      doc: 'hello world',
      extensions: [uploadUiExtension({ interaction: 'inline' })],
    });
    views.push(view);

    view.dispatch({
      effects: addUpload.of({
        upload: upload({ phase: 'progress', progress: 0.125, message: 'Uploading 13%' }),
        from: 6,
        to: 11,
      }),
    });
    expect(view.dom.querySelector('.ge-upload-progress')?.textContent).toBe('13%');
    expect(view.dom.querySelector('.ge-upload-label')?.textContent).toContain('Uploading 13%');

    view.dispatch({
      effects: updateUpload.of(upload({ phase: 'progress', progress: 0.75, message: 'Uploading 75%' })),
    });

    expect(view.dom.querySelector('.ge-upload-progress')?.textContent).toBe('75%');
    expect(view.dom.querySelector('.ge-upload-progress')?.getAttribute('aria-valuenow')).toBe('75');
    expect(view.dom.querySelector('.ge-upload-label')?.textContent).toContain('Uploading 75%');
  });

  it('maps an upload placeholder range through document edits', () => {
    const view = createEditorView({
      doc: 'hello world',
      extensions: [uploadUiExtension({ interaction: 'inline' })],
    });
    views.push(view);

    view.dispatch({
      effects: addUpload.of({ upload: upload(), from: 6, to: 11 }),
    });
    view.dispatch({ changes: { from: 0, insert: 'say ' } });

    expect(uploadRangeById(view.state, 'galley-file-1')).toEqual({ from: 10, to: 15 });
  });

  it('renders and clears drop indicator', () => {
    const view = createEditorView({
      doc: 'alpha\nbeta',
      extensions: [uploadUiExtension({ interaction: 'inline' })],
    });
    views.push(view);

    view.dispatch({
      effects: setDropIndicator.of({ pos: 6, lineFrom: 6, lineTo: 10 }),
    });

    expect(view.dom.querySelector('.ge-drop-indicator')).toBeInstanceOf(HTMLElement);

    view.dispatch({ effects: clearDropIndicator.of(undefined) });

    expect(view.dom.querySelector('.ge-drop-indicator')).toBeNull();
  });

  it('returns current active uploads and becomes empty after removal', () => {
    const view = createEditorView({
      doc: 'hello world',
      extensions: [uploadUiExtension({ interaction: 'inline' })],
    });
    views.push(view);

    view.dispatch({
      effects: addUpload.of({ upload: upload({ message: 'Uploading' }), from: 6, to: 11 }),
    });

    expect(activeUploads(view.state)).toEqual([
      expect.objectContaining({ id: 'galley-file-1', message: 'Uploading' }),
    ]);

    view.dispatch({ effects: removeUpload.of('galley-file-1') });

    expect(activeUploads(view.state)).toEqual([]);
  });

  it('blocks ordinary document edits while locked upload is active and allows edits after removal', () => {
    const view = createEditorView({
      doc: 'hello world',
      extensions: [uploadUiExtension({ interaction: 'locked' })],
    });
    views.push(view);

    view.dispatch({
      effects: addUpload.of({ upload: upload(), from: 6, to: 11 }),
    });
    view.dispatch({ changes: { from: 0, insert: 'blocked ' } });

    expect(view.state.doc.toString()).toBe('hello world');

    view.dispatch({ effects: removeUpload.of('galley-file-1') });
    view.dispatch({ changes: { from: 0, insert: 'allowed ' } });

    expect(view.state.doc.toString()).toBe('allowed hello world');
  });

  it('renders upload overlay while overlay or locked interaction has an active upload', () => {
    const overlayView = createEditorView({
      doc: 'hello world',
      extensions: [uploadUiExtension({ interaction: 'overlay' })],
    });
    const lockedView = createEditorView({
      doc: 'hello world',
      extensions: [uploadUiExtension({ interaction: 'locked' })],
    });
    views.push(overlayView, lockedView);

    overlayView.dispatch({
      effects: addUpload.of({ upload: upload(), from: 6, to: 11 }),
    });
    lockedView.dispatch({
      effects: addUpload.of({ upload: upload(), from: 6, to: 11 }),
    });

    expect(overlayView.dom.querySelector('.ge-upload-overlay')).toBeInstanceOf(HTMLElement);
    expect(lockedView.dom.querySelector('.ge-upload-overlay')).toBeInstanceOf(HTMLElement);
  });
});
