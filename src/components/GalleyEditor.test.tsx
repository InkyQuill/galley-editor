import { act, useLayoutEffect, useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import GalleyEditor, { type GalleyHandle } from './GalleyEditor';
import type { EditorView } from '@codemirror/view';
import type { Extension } from '@codemirror/state';
import { GALLEY_VERSION } from '../version';
import { EditorController } from '../controller';
import { DEFAULT_KEYMAP } from '../commands';
import type { GalleyClassNames, GalleyPlugin } from '../types';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const emptyDomRectList = {
  length: 0,
  item: () => null,
  [Symbol.iterator]: function* iterate() {},
} as DOMRectList;

if (!Range.prototype.getClientRects) {
  Range.prototype.getClientRects = () => emptyDomRectList;
}
if (!Range.prototype.getBoundingClientRect) {
  Range.prototype.getBoundingClientRect = () => new DOMRect();
}

const roots: Root[] = [];
const containers: HTMLElement[] = [];

function createContainer(): HTMLElement {
  const container = document.createElement('div');
  document.body.appendChild(container);
  containers.push(container);
  return container;
}

function mount(element: React.ReactNode): { container: HTMLElement; root: Root } {
  const container = createContainer();
  const root = createRoot(container);
  roots.push(root);
  act(() => {
    root.render(element);
  });
  return { container, root };
}

function rerender(root: Root, element: React.ReactNode): void {
  act(() => {
    root.render(element);
  });
}

function unmount(root: Root): void {
  act(() => {
    root.unmount();
  });
  const rootIndex = roots.indexOf(root);
  if (rootIndex >= 0) roots.splice(rootIndex, 1);
}

interface MockMediaQueryList {
  matches: boolean;
  media: string;
  addEventListener(eventName: string, listener: EventListener): void;
  removeEventListener(eventName: string, listener: EventListener): void;
  dispatch(matches: boolean): void;
}

function mockPrefersDark(initialMatches: boolean): MockMediaQueryList {
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const mediaList: MockMediaQueryList = {
    matches: initialMatches,
    media: '(prefers-color-scheme: dark)',
    addEventListener: vi.fn((eventName: string, listener: EventListener) => {
      if (eventName === 'change') {
        listeners.add(listener as (event: MediaQueryListEvent) => void);
      }
    }),
    removeEventListener: vi.fn((eventName: string, listener: EventListener) => {
      if (eventName === 'change') {
        listeners.delete(listener as (event: MediaQueryListEvent) => void);
      }
    }),
    dispatch(matches: boolean) {
      this.matches = matches;
      const event = { matches, media: this.media } as MediaQueryListEvent;
      for (const listener of listeners) listener(event);
    },
  };

  vi.stubGlobal('matchMedia', vi.fn(() => mediaList));
  return mediaList;
}

afterEach(() => {
  for (const root of roots) {
    act(() => {
      root.unmount();
    });
  }
  roots.length = 0;

  for (const container of containers) container.remove();
  containers.length = 0;

  vi.unstubAllGlobals();
});

describe('GalleyEditor React wrapper', () => {
  it('reconfigures horizontalScroll without replacing the CodeMirror view', () => {
    const { container, root } = mount(
      <GalleyEditor value="alpha" theme="light" horizontalScroll={false} />,
    );
    const editor = container.querySelector('.cm-editor');

    expect(editor?.classList.contains('ge-width-constrained')).toBe(true);

    rerender(
      root,
      <GalleyEditor value="alpha" theme="light" horizontalScroll />,
    );

    expect(container.querySelector('.cm-editor')).toBe(editor);
    expect(editor?.classList.contains('ge-width-constrained')).toBe(false);
    expect(editor?.classList.contains('ge-horizontal-scroll')).toBe(true);
  });

  it('updates editorClassName on the CodeMirror editor element', () => {
    const { container, root } = mount(<GalleyEditor value="hello" editorClassName="a" theme="light" />);
    const editor = container.querySelector('.cm-editor');

    expect(editor).toBeInstanceOf(HTMLElement);
    expect(Array.from(editor?.classList ?? [])).toContain('a');

    rerender(root, <GalleyEditor value="hello" editorClassName="b" theme="light" />);
    expect(editor?.classList.contains('a')).toBe(false);
    expect(editor?.classList.contains('b')).toBe(true);

    rerender(root, <GalleyEditor value="hello" editorClassName="" theme="light" />);
    expect(editor?.classList.contains('a')).toBe(false);
    expect(editor?.classList.contains('b')).toBe(false);
  });

  it('does not reconfigure settings when only file callbacks change', () => {
    const updateSettingsSpy = vi.spyOn(EditorController.prototype, 'updateSettings');
    const classNames: GalleyClassNames = {};
    const plugins: GalleyPlugin[] = [];
    const disabledPlugins: string[] = [];
    const extensions: Extension[] = [];
    const onFiles = () => 'upload';

    try {
      const { root } = mount(
        <GalleyEditor
          value="hello"
          theme="light"
          classNames={classNames}
          plugins={plugins}
          disabledPlugins={disabledPlugins}
          extensions={extensions}
          onFiles={onFiles}
          onFileStatus={() => undefined}
        />,
      );
      const callsAfterMount = updateSettingsSpy.mock.calls.length;

      rerender(
        root,
        <GalleyEditor
          value="hello"
          theme="light"
          classNames={classNames}
          plugins={plugins}
          disabledPlugins={disabledPlugins}
          extensions={extensions}
          onFiles={onFiles}
          onFileStatus={() => undefined}
        />,
      );

      expect(updateSettingsSpy).toHaveBeenCalledTimes(callsAfterMount);
    } finally {
      updateSettingsSpy.mockRestore();
    }
  });

  it('allows parent layout effects to call focus before the controller mounts', () => {
    const focusCalls: string[] = [];

    function Parent() {
      const editorRef = useRef<GalleyHandle>(null);
      useLayoutEffect(() => {
        editorRef.current?.focus();
        focusCalls.push('called');
      }, []);
      return <GalleyEditor ref={editorRef} value="hello" theme="light" />;
    }

    expect(() => mount(<Parent />)).not.toThrow();
    expect(focusCalls).toEqual(['called']);
  });

  it('returns false when openSearch is called before the controller mounts', () => {
    let observed: boolean | undefined;

    function Parent() {
      const editorRef = useRef<GalleyHandle>(null);
      useLayoutEffect(() => {
        observed = editorRef.current?.openSearch();
      }, []);
      return <GalleyEditor ref={editorRef} value="alpha" theme="light" />;
    }

    mount(<Parent />);

    expect(observed).toBe(false);
  });

  it('returns null from the view getter before the controller mounts', () => {
    let observedView: EditorView | null | undefined;

    function Parent() {
      const editorRef = useRef<GalleyHandle>(null);
      useLayoutEffect(() => {
        observedView = editorRef.current?.view;
      }, []);
      return <GalleyEditor ref={editorRef} value="hello" theme="light" />;
    }

    mount(<Parent />);

    expect(observedView).toBeNull();
  });

  it('renders the resolved dark theme on the wrapper', () => {
    const { container } = mount(<GalleyEditor value="hello" theme="dark" />);
    const wrapper = container.firstElementChild;

    expect(wrapper).toBeInstanceOf(HTMLElement);
    expect(wrapper?.getAttribute('data-theme')).toBe('dark');
  });

  it('applies ariaLabel to the editable content element', () => {
    const { container, root } = mount(
      <GalleyEditor value="hello" theme="light" ariaLabel="Release notes body" />,
    );
    const content = container.querySelector('.cm-content');

    expect(content).toBeInstanceOf(HTMLElement);
    expect(content?.getAttribute('aria-label')).toBe('Release notes body');

    rerender(
      root,
      <GalleyEditor value="hello" theme="light" ariaLabel="Archived note body" />,
    );

    expect(content?.getAttribute('aria-label')).toBe('Archived note body');
  });

  it('updates auto theme when the preferred color scheme changes', () => {
    const mediaList = mockPrefersDark(false);
    const { container, root } = mount(<GalleyEditor value="hello" theme="auto" />);
    const wrapper = container.firstElementChild;
    const editor = container.querySelector('.cm-editor');

    expect(wrapper).toBeInstanceOf(HTMLElement);
    expect(editor).toBeInstanceOf(HTMLElement);
    expect(wrapper?.getAttribute('data-theme')).toBe('light');
    expect(editor?.classList.contains('cm-light')).toBe(true);
    expect(editor?.classList.contains('cm-dark')).toBe(false);

    act(() => {
      mediaList.dispatch(true);
    });

    expect(wrapper?.getAttribute('data-theme')).toBe('dark');
    expect(editor?.classList.contains('cm-light')).toBe(false);
    expect(editor?.classList.contains('cm-dark')).toBe(true);

    const removeCallsBeforeUnmount = vi.mocked(mediaList.removeEventListener).mock.calls.length;
    unmount(root);

    expect(vi.mocked(mediaList.removeEventListener).mock.calls.length).toBeGreaterThan(
      removeCallsBeforeUnmount,
    );
    expect(mediaList.removeEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function),
    );
  });

  it('renders the default footer with word count, character count, and logo tooltip', () => {
    const { container } = mount(<GalleyEditor value="Hello world" theme="light" />);
    const footer = container.querySelector('.ge-footer');

    expect(footer).toBeInstanceOf(HTMLElement);
    expect(footer?.textContent).toContain('2 words');
    expect(footer?.textContent).toContain('11 characters');
    expect(footer?.querySelector('.ge-footer-logo-wrap')?.getAttribute('aria-label')).toBe(`Galley Editor v.${GALLEY_VERSION} by Inky Quill`);
    expect(footer?.querySelector('.ge-footer-tooltip')?.textContent).toBe(`Galley Editor v.${GALLEY_VERSION} by Inky Quill`);
    expect(footer?.querySelector('.ge-footer-logo path')?.getAttribute('fill')).toBe('currentColor');
  });

  it('updates footer counts when controlled value changes', () => {
    const { container, root } = mount(<GalleyEditor value="One" theme="light" />);

    expect(container.querySelector('.ge-footer')?.textContent).toContain('1 word');
    expect(container.querySelector('.ge-footer')?.textContent).toContain('3 characters');

    rerender(root, <GalleyEditor value="One two three" theme="light" />);

    expect(container.querySelector('.ge-footer')?.textContent).toContain('3 words');
    expect(container.querySelector('.ge-footer')?.textContent).toContain('13 characters');
  });

  it('does not render the footer when footer=false', () => {
    const { container } = mount(<GalleyEditor value="Hello world" theme="light" footer={false} />);

    expect(container.querySelector('.ge-footer')).toBeNull();
  });

  it('renders custom footer widgets with count context', () => {
    const { container } = mount(
      <GalleyEditor
        value="Hello world"
        theme="light"
        footer={{
          before: <span data-testid="footer-before">Draft</span>,
          after: ({ wordCount, characterCount, mode }) => (
            <span data-testid="footer-after">
              {mode}:{wordCount}:{characterCount}
            </span>
          ),
        }}
      />,
    );

    expect(container.querySelector('[data-testid="footer-before"]')?.textContent).toBe('Draft');
    expect(container.querySelector('[data-testid="footer-after"]')?.textContent).toBe('live:2:11');
  });

  it('renders the default toolbar', () => {
    const { container } = mount(<GalleyEditor value="Hello world" theme="light" />);

    expect(container.querySelector('.ge-toolbar')).toBeInstanceOf(HTMLElement);
    expect(container.querySelector('[aria-label="Bold"]')).toBeInstanceOf(HTMLButtonElement);
    expect(container.querySelector('[aria-label="Insert link"]')).toBeInstanceOf(HTMLButtonElement);
  });

  it('shows bound shortcuts in titles without changing accessible labels', () => {
    const { container } = mount(
      <GalleyEditor value="Hello" theme="light" />,
    );
    const bold = container.querySelector(
      '[aria-label="Bold"]',
    ) as HTMLButtonElement;
    const table = container.querySelector(
      '[aria-label="Insert table"]',
    ) as HTMLButtonElement;

    expect(bold.getAttribute('aria-label')).toBe('Bold');
    expect(bold.getAttribute('title')).toMatch(
      /^(Bold \(⌘B\)|Bold \(Ctrl\+B\))$/,
    );
    expect(table.getAttribute('aria-label')).toBe('Insert table');
    expect(table.getAttribute('title')).toBe('Insert table');
  });

  it('uses stable non-mac shortcut markup during server rendering', () => {
    const platform = vi
      .spyOn(window.navigator, 'platform', 'get')
      .mockReturnValue('MacIntel');

    const markup = renderToString(
      <GalleyEditor value="Hello" theme="light" />,
    );

    expect(markup).toContain('title="Bold (Ctrl+B)"');
    expect(markup).not.toContain('title="Bold (⌘B)"');
    platform.mockRestore();
  });

  it('removes a tooltip shortcut when array keymap replaces defaults', () => {
    const { container } = mount(
      <GalleyEditor value="Hello" theme="light" keymap={[]} />,
    );
    expect(
      container.querySelector('[aria-label="Bold"]')?.getAttribute('title'),
    ).toBe('Bold');
  });

  it('uses command metadata returned by a function keymap', () => {
    const bold = DEFAULT_KEYMAP.find(
      (binding) => binding.command === 'toggleBold',
    )!;
    const { container } = mount(
      <GalleyEditor
        value="Hello"
        theme="light"
        keymap={(defaults) => [
          ...defaults.filter(
            (binding) =>
              !('command' in binding) ||
              binding.command !== 'toggleBold',
          ),
          { ...bold, key: 'Alt-b' },
        ]}
      />,
    );
    expect(
      container.querySelector('[aria-label="Bold"]')?.getAttribute('title'),
    ).toMatch(/^(Bold \(⌥B\)|Bold \(Alt\+B\))$/);
  });

  it('resolves a function keymap only once', () => {
    const resolveKeymap = vi.fn((defaults) => defaults);

    mount(
      <GalleyEditor
        value="Hello"
        theme="light"
        keymap={resolveKeymap}
      />,
    );

    expect(resolveKeymap).toHaveBeenCalledOnce();
  });

  it('uses the same controller defaults for function keymap tooltips and execution', () => {
    const onChange = vi.fn();
    const { container } = mount(
      <GalleyEditor
        value="Hello"
        theme="light"
        onChange={onChange}
        keymap={(defaults) => {
          const hasSearchBinding = defaults.some(
            (binding) => binding.key === 'Mod-f',
          );
          return defaults.map((binding) =>
            'command' in binding &&
            binding.command === 'toggleBold' &&
            hasSearchBinding
              ? { ...binding, key: 'Alt-b' }
              : binding,
          );
        }}
      />,
    );
    const bold = container.querySelector(
      '[aria-label="Bold"]',
    ) as HTMLButtonElement;
    const content = container.querySelector('.cm-content') as HTMLElement;
    const event = new KeyboardEvent('keydown', {
      key: 'b',
      code: 'KeyB',
      keyCode: 66,
      which: 66,
      altKey: true,
      bubbles: true,
      cancelable: true,
    });

    expect(bold.getAttribute('title')).toMatch(
      /^(Bold \(⌥B\)|Bold \(Alt\+B\))$/,
    );
    act(() => {
      content.dispatchEvent(event);
    });
    expect(event.defaultPrevented).toBe(true);
    expect(onChange).toHaveBeenCalledWith('****Hello');
  });

  it('does not render the toolbar when toolbar=false', () => {
    const { container } = mount(<GalleyEditor value="Hello world" theme="light" toolbar={false} />);

    expect(container.querySelector('.ge-toolbar')).toBeNull();
  });

  it('accepts custom toolbar icons as React nodes', () => {
    const { container } = mount(
      <GalleyEditor
        value="Hello world"
        theme="light"
        toolbar={{
          icons: {
            bold: <svg data-testid="custom-bold" viewBox="0 0 16 16" />,
          },
        }}
      />,
    );

    expect(container.querySelector('[data-testid="custom-bold"]')).toBeInstanceOf(SVGElement);
    expect(container.querySelector('[aria-label="Bold"]')?.textContent).toBe('');
  });

  it('accepts custom toolbar icons as render functions', () => {
    const { container } = mount(
      <GalleyEditor
        value="Hello world"
        theme="light"
        toolbar={{
          icons: {
            italic: ({ label }) => <span data-testid="custom-italic">{label}</span>,
          },
        }}
      />,
    );

    expect(container.querySelector('[data-testid="custom-italic"]')?.textContent).toBe('Italic');
  });

  it('renders custom toolbar slots with command context', () => {
    const { container } = mount(
      <GalleyEditor
        value="Hello world"
        theme="light"
        toolbar={{
          before: <button type="button" data-testid="toolbar-before">Before</button>,
          after: ({ canEdit, mode }) => (
            <button type="button" data-testid="toolbar-after">
              {mode}:{String(canEdit)}
            </button>
          ),
        }}
      />,
    );

    expect(container.querySelector('[data-testid="toolbar-before"]')?.textContent).toBe('Before');
    expect(container.querySelector('[data-testid="toolbar-after"]')?.textContent).toBe('live:true');
  });

  it('applies surface class names, styles, and padding variables to the shell', () => {
    const { container } = mount(
      <GalleyEditor
        value="Hello world"
        theme="light"
        surface={{
          className: 'glass-editor',
          contentPadding: '24px',
          toolbarPadding: '8px',
          footerPadding: '6px',
          style: {
            background: 'linear-gradient(135deg, red, blue)',
            backdropFilter: 'blur(18px)',
          },
        }}
      />,
    );
    const shell = container.querySelector('.ge-editor-shell') as HTMLElement | null;

    expect(shell).toBeInstanceOf(HTMLElement);
    expect(shell?.classList.contains('glass-editor')).toBe(true);
    expect(shell?.style.getPropertyValue('--ge-content-padding')).toBe('24px');
    expect(shell?.style.getPropertyValue('--ge-toolbar-padding')).toBe('8px');
    expect(shell?.style.getPropertyValue('--ge-footer-padding')).toBe('6px');
    expect(shell?.style.background).toContain('linear-gradient');
    expect(shell?.style.backdropFilter).toBe('blur(18px)');
  });

  it('exposes fill-container layout classes', () => {
    const { container } = mount(
      <GalleyEditor value="# Untitled" theme="light" layout="fill" />,
    );
    const shell = container.querySelector('.ge-editor-shell');
    const body = container.querySelector('.ge-editor-body');

    expect(shell?.classList.contains('ge-layout-fill')).toBe(true);
    expect(body).toBeInstanceOf(HTMLElement);
    expect(body?.querySelector('.cm-editor')).toBeInstanceOf(HTMLElement);
  });

  it('uses autosize layout by default', () => {
    const { container } = mount(<GalleyEditor value="# Untitled" theme="light" />);
    const shell = container.querySelector('.ge-editor-shell');

    expect(shell?.classList.contains('ge-layout-autosize')).toBe(true);
    expect(shell?.classList.contains('ge-layout-fill')).toBe(false);
  });

  it('renders raw markdown in markdown mode', () => {
    const { container } = mount(<GalleyEditor value="# Title\n\n**Bold**" theme="light" mode="markdown" />);

    expect(container.firstElementChild?.getAttribute('data-mode')).toBe('markdown');
    expect(container.querySelector('.ge-h1')).toBeNull();
    expect(container.querySelector('.ge-bold')).toBeNull();
    expect(container.querySelector('.cm-content')?.textContent).toContain('# Title');
    expect(container.querySelector('.cm-content')?.textContent).toContain('**Bold**');
  });

  it('renders preview mode without revealing markdown syntax at the cursor', () => {
    const { container } = mount(<GalleyEditor value="# Title\n\n**Bold**" theme="light" mode="preview" />);

    expect(container.firstElementChild?.getAttribute('data-mode')).toBe('preview');
    expect(container.querySelector('.ge-h1')).toBeInstanceOf(HTMLElement);
    expect(container.querySelector('.ge-bold')).toBeInstanceOf(HTMLElement);
    expect(container.querySelector('.cm-content')?.textContent).toContain('Title');
    expect(container.querySelector('.cm-content')?.textContent).toContain('Bold');
    expect(container.querySelector('.cm-content')?.textContent).not.toContain('#');
    expect(container.querySelector('.cm-content')?.textContent).not.toContain('**');
  });

  it('forces preview mode when editable=false', () => {
    const { container } = mount(
      <GalleyEditor value="# Title" theme="light" editable={false} mode="markdown" />,
    );

    expect(container.firstElementChild?.getAttribute('data-mode')).toBe('preview');
    expect(container.querySelector('.cm-content')?.textContent).toContain('Title');
    expect(container.querySelector('.cm-content')?.textContent).not.toContain('#');
  });

  it('cycles editor modes from the toolbar button', () => {
    const changes: string[] = [];
    const { container } = mount(
      <GalleyEditor
        value="# Title"
        theme="light"
        onModeChange={(mode) => changes.push(mode)}
      />,
    );
    const modeButton = container.querySelector('.ge-mode-toggle') as HTMLButtonElement | null;

    expect(container.firstElementChild?.getAttribute('data-mode')).toBe('live');
    expect(modeButton).toBeInstanceOf(HTMLButtonElement);

    act(() => {
      modeButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(container.firstElementChild?.getAttribute('data-mode')).toBe('markdown');

    act(() => {
      modeButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(container.firstElementChild?.getAttribute('data-mode')).toBe('preview');
    expect(changes).toEqual(['markdown', 'preview']);
  });
});
