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

  it('opens search from a parent layout effect', () => {
    let observed: boolean | undefined;

    function Parent() {
      const editorRef = useRef<GalleyHandle>(null);
      useLayoutEffect(() => {
        observed = editorRef.current?.openSearch();
      }, []);
      return <GalleyEditor ref={editorRef} value="alpha" theme="light" />;
    }

    mount(<Parent />);

    expect(observed).toBe(true);
  });

  it('exposes the editor view to the parent layout effect', () => {
    let observedView: EditorView | null | undefined;

    function Parent() {
      const editorRef = useRef<GalleyHandle>(null);
      useLayoutEffect(() => {
        observedView = editorRef.current?.view;
      }, []);
      return <GalleyEditor ref={editorRef} value="hello" theme="light" />;
    }

    mount(<Parent />);

    expect(observedView?.contentDOM).toBeInstanceOf(HTMLElement);
  });

  it('renders the resolved dark theme on the wrapper', () => {
    const { container } = mount(<GalleyEditor value="hello" theme="dark" />);
    const wrapper = container.firstElementChild;

    expect(wrapper).toBeInstanceOf(HTMLElement);
    expect(wrapper?.getAttribute('data-theme')).toBe('dark');
  });

  it('inherits the host palette without setting a local data-theme', () => {
    const { container } = mount(<GalleyEditor value="hello" theme="inherit" />);
    expect(container.firstElementChild?.hasAttribute('data-theme')).toBe(false);
  });

  it('updates inherited CodeMirror mode when the host theme changes', async () => {
    const { container } = mount(<GalleyEditor value="hello" theme="inherit" />);
    const editor = container.querySelector('.cm-editor');
    try {
      await act(async () => {
        document.documentElement.classList.add('dark');
        await Promise.resolve();
      });
      expect(editor?.classList.contains('cm-dark')).toBe(true);
    } finally {
      document.documentElement.classList.remove('dark');
    }
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
    const logo = footer?.querySelector('[role="img"][aria-label="Galley Editor"]');
    const tooltip = footer?.querySelector('[role="tooltip"]');
    expect(logo?.getAttribute('aria-describedby')).toBe(tooltip?.id);
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
    expect(container.querySelector('.ge-toolbar')).toBeInstanceOf(HTMLElement);
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

  it('keeps the existing visible toolbar default', () => {
    const { container } = mount(<GalleyEditor value="Hello world" theme="light" />);
    expect(container.querySelector('.ge-toolbar')).toBeInstanceOf(HTMLElement);
  });

  it('reveals a deliberately collapsed toolbar from the footer', () => {
    const { container } = mount(<GalleyEditor value="Hello world" theme="light" toolbar={{ defaultOpen: false }} />);
    expect(container.querySelector('.ge-toolbar')?.hasAttribute('hidden')).toBe(true);
    const toggle = container.querySelector<HTMLButtonElement>('[aria-label="Show formatting toolbar"]');
    expect(toggle?.getAttribute('aria-expanded')).toBe('false');
    act(() => toggle?.click());
    expect(toggle?.getAttribute('aria-expanded')).toBe('true');
    expect(container.querySelector('.ge-toolbar')).toBeInstanceOf(HTMLElement);
    expect(container.querySelector('[aria-label="Bold"]')).toBeInstanceOf(HTMLButtonElement);
    expect(container.querySelector('[aria-label="Insert link"]')).toBeInstanceOf(HTMLButtonElement);
    const buttons = container.querySelectorAll('.ge-toolbar-button');
    expect(buttons).toHaveLength(15);
    for (const button of buttons) {
      expect(button.querySelector('svg[aria-hidden="true"]')).toBeInstanceOf(SVGElement);
    }
    expect(container.querySelector('[aria-label="Bullet list"]')?.textContent).toBe('');
    act(() => toggle?.click());
    expect(container.querySelector('.ge-toolbar')?.hasAttribute('hidden')).toBe(true);
  });

  it('shows bound shortcuts in titles without changing accessible labels', () => {
    const { container } = mount(
      <GalleyEditor value="Hello" theme="light" toolbar={{ defaultOpen: true }} />,
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
      <GalleyEditor value="Hello" theme="light" toolbar={{ defaultOpen: true }} />,
    );

    expect(markup).toContain('title="Bold (Ctrl+B)"');
    expect(markup).not.toContain('title="Bold (⌘B)"');
    platform.mockRestore();
  });

  it('removes a tooltip shortcut when array keymap replaces defaults', () => {
    const { container } = mount(
      <GalleyEditor value="Hello" theme="light" keymap={[]} toolbar={{ defaultOpen: true }} />,
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
        toolbar={{ defaultOpen: true }}
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
        toolbar={{ defaultOpen: true }}
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
    expect(container.querySelector('.ge-toolbar-toggle')).toBeNull();
  });

  it('accepts custom toolbar icons as React nodes', () => {
    const { container } = mount(
      <GalleyEditor
        value="Hello world"
        theme="light"
        toolbar={{
          defaultOpen: true,
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
          defaultOpen: true,
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
          defaultOpen: true,
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
        toolbar={{ defaultOpen: true }}
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

describe('GalleyEditor document switching via docKey', () => {
  it('resets selection and history when docKey changes with the value', () => {
    const ref = { current: null as GalleyHandle | null };
    const { root } = mount(
      <GalleyEditor ref={ref} value="first document" docKey="a" theme="light" />,
    );
    act(() => {
      ref.current?.select(5, 8);
    });

    rerender(
      root,
      <GalleyEditor ref={ref} value="second document" docKey="b" theme="light" />,
    );

    expect(ref.current?.getContent()).toBe('second document');
    expect(ref.current?.getSelection()).toEqual({ from: 0, to: 0, anchor: 0, head: 0 });

    act(() => {
      ref.current?.undo();
    });
    expect(ref.current?.getContent()).toBe('second document');
  });

  it('resets selection when docKey changes but content is identical', () => {
    const ref = { current: null as GalleyHandle | null };
    const { root } = mount(
      <GalleyEditor ref={ref} value="same content" docKey="a" theme="light" />,
    );
    act(() => {
      ref.current?.select(4);
    });

    rerender(
      root,
      <GalleyEditor ref={ref} value="same content" docKey="b" theme="light" />,
    );

    expect(ref.current?.getSelection()).toEqual({ from: 0, to: 0, anchor: 0, head: 0 });
  });

  it('preserves selection for value updates within the same docKey', () => {
    const ref = { current: null as GalleyHandle | null };
    const { root } = mount(
      <GalleyEditor ref={ref} value="hello world" docKey="a" theme="light" />,
    );
    act(() => {
      ref.current?.select(5);
    });

    rerender(
      root,
      <GalleyEditor ref={ref} value="hello there world" docKey="a" theme="light" />,
    );

    expect(ref.current?.getSelection()).toEqual({ from: 5, to: 5, anchor: 5, head: 5 });
  });
});

describe('GalleyEditor text style selector', () => {
  async function flushSelectionFrame(): Promise<void> {
    await act(async () => {
      await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
    });
  }

  function styleSelect(container: HTMLElement): HTMLSelectElement {
    if (!container.querySelector('.ge-toolbar-select')) {
      const toggle = container.querySelector<HTMLButtonElement>('[aria-label="Show formatting toolbar"]');
      act(() => toggle?.click());
    }
    const select = container.querySelector<HTMLSelectElement>('.ge-toolbar-select');
    if (!select) throw new Error('style select not rendered');
    return select;
  }

  it('does not suppress mousedown on the style select so the dropdown can open', () => {
    const { container } = mount(<GalleyEditor value="hello" theme="light" />);
    const select = styleSelect(container);

    let notPrevented = true;
    act(() => {
      notPrevented = select.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, cancelable: true }),
      );
    });

    expect(notPrevented).toBe(true);
  });

  it('reflects the heading level at the cursor', async () => {
    const ref = { current: null as GalleyHandle | null };
    const { container } = mount(
      <GalleyEditor ref={ref} value={'# Title\n\nbody text'} theme="light" />,
    );
    const select = styleSelect(container);

    act(() => {
      ref.current?.select(2);
    });
    await flushSelectionFrame();
    expect(select.value).toBe('h1');

    act(() => {
      ref.current?.select(10);
    });
    await flushSelectionFrame();
    expect(select.value).toBe('normal');
  });

  it('reflects the heading level for an indented ATX heading (up to 3 spaces)', async () => {
    const ref = { current: null as GalleyHandle | null };
    const { container } = mount(
      <GalleyEditor ref={ref} value={'   ## Indented title\n\nbody'} theme="light" />,
    );
    const select = styleSelect(container);

    act(() => {
      ref.current?.select(6);
    });
    await flushSelectionFrame();
    expect(select.value).toBe('h2');
  });

  it('reflects the heading level for marker-only headings', async () => {
    const ref = { current: null as GalleyHandle | null };
    const { container } = mount(
      <GalleyEditor ref={ref} value={'###\n\nbody'} theme="light" />,
    );
    const select = styleSelect(container);

    act(() => {
      ref.current?.select(2);
    });
    await flushSelectionFrame();
    expect(select.value).toBe('h3');
  });

  it('choosing Normal removes the heading at the cursor', async () => {
    const ref = { current: null as GalleyHandle | null };
    const { container } = mount(
      <GalleyEditor ref={ref} value={'## Title'} theme="light" />,
    );
    const select = styleSelect(container);

    act(() => {
      ref.current?.select(4);
    });
    await flushSelectionFrame();
    expect(select.value).toBe('h2');

    act(() => {
      select.value = 'normal';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(ref.current?.getContent()).toBe('Title');
  });
});

describe('Galley shell regression coverage', () => {
  it('builds plugins once through toolbar toggles and cursor-only or unrelated renders', () => {
    const ref = { current: null as GalleyHandle | null };
    const makeExtensions = vi.fn(() => []);
    const toolbarSlot = vi.fn(() => null);
    const plugins = [{ id: 'probe', extensions: makeExtensions }];
    const toolbar = { before: toolbarSlot };
    const { container, root } = mount(
      <GalleyEditor ref={ref} defaultValue="a **b** c" plugins={plugins} toolbar={toolbar} />,
    );
    const originalSlotRenders = toolbarSlot.mock.calls.length;
    act(() => ref.current?.select(5));
    expect(toolbarSlot).toHaveBeenCalledTimes(originalSlotRenders);
    expect(container.querySelector('[aria-label="Bold"]')?.getAttribute('aria-pressed')).toBe('true');
    rerender(root, <GalleyEditor ref={ref} defaultValue="a **b** c" plugins={plugins} toolbar={toolbar} id="updated" />);
    act(() => container.querySelector<HTMLButtonElement>('.ge-toolbar-toggle')?.click());
    expect(makeExtensions).toHaveBeenCalledTimes(1);
  });

  it('keeps live footer statistics, parses headings in quotes, and protects fenced code', () => {
    const ref = { current: null as GalleyHandle | null };
    const { container } = mount(<GalleyEditor ref={ref} defaultValue={'> ## Quoted\n\n```\n## code\n```'} />);
    const select = container.querySelector<HTMLSelectElement>('.ge-toolbar-select')!;
    act(() => ref.current?.select(8));
    expect(select.value).toBe('h2');
    act(() => {
      select.value = 'normal';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(ref.current?.getContent()).toContain('> Quoted');
    act(() => ref.current?.select(ref.current.getContent().indexOf('code')));
    expect(select.value).toBe('normal');
    expect(select.disabled).toBe(true);
    act(() => {
      ref.current?.select(ref.current.getContent().length);
      ref.current?.insertText('\n\nnew words');
    });
    expect(container.querySelector('.ge-footer-stats')?.textContent).toContain('8 words');
  });

  it('applies external value changes without callbacks or a new undo step', () => {
    const ref = { current: null as GalleyHandle | null };
    const onChange = vi.fn();
    const { root } = mount(<GalleyEditor ref={ref} value="initial" onChange={onChange} />);
    rerender(root, <GalleyEditor ref={ref} value="external" onChange={onChange} />);
    act(() => ref.current?.undo());
    expect(ref.current?.getContent()).toBe('external');
    expect(onChange).not.toHaveBeenCalled();
    act(() => ref.current?.insertText('edit '));
    expect(onChange).toHaveBeenCalledWith('edit external');
  });

  it('keeps undo for edits outside the changed external range', () => {
    const ref = { current: null as GalleyHandle | null };
    const { root } = mount(<GalleyEditor ref={ref} value="first last" />);
    act(() => ref.current?.insertText('editable '));
    rerender(root, <GalleyEditor ref={ref} value="editable first updated" />);
    act(() => ref.current?.undo());
    expect(ref.current?.getContent()).toBe('first updated');
  });

  it('uses a stable server theme and gives plugins the client preference after mount', () => {
    mockPrefersDark(true);
    const extensions = vi.fn(() => []);
    const plugins: GalleyPlugin[] = [{ id: 'probe', extensions }];
    expect(renderToString(<GalleyEditor theme="auto" plugins={plugins} />)).toContain('data-theme="light"');
    const { container } = mount(<GalleyEditor theme="auto" plugins={plugins} />);
    expect(container.firstElementChild?.getAttribute('data-theme')).toBe('dark');
    expect(extensions).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ theme: 'dark' }));
  });

  it('gives plugins the resolved theme and ignores host mutations with no color change', async () => {
    const extensions = vi.fn(() => []);
    const plugins: GalleyPlugin[] = [{ id: 'probe', extensions }];
    document.documentElement.classList.add('dark');
    try {
      mount(<GalleyEditor theme="inherit" plugins={plugins} />);
      expect(extensions).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ theme: 'dark' }));
      await act(async () => { document.documentElement.style.setProperty('--probe', '1'); });
      expect(extensions).toHaveBeenCalledTimes(1);
      await act(async () => { document.documentElement.classList.replace('dark', 'light'); });
      expect(extensions).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ theme: 'light' }));
    } finally {
      document.documentElement.classList.remove('dark', 'light');
      document.documentElement.style.removeProperty('--probe');
    }
  });

  it('supports a localized, ordered toolbar, wrapper attributes, onReady, and native spellchecking', () => {
    const ref = { current: null as GalleyHandle | null };
    const onReady = vi.fn(() => expect(ref.current?.view).toBeDefined());
    const { container } = mount(
      <GalleyEditor
        ref={ref}
        id="draft"
        data-document="scene"
        style={{ width: 300 }}
        onReady={onReady}
        spellcheck
        labels={{ toolbar: 'Форматирование', command: { undo: 'Отменить', bold: 'Жирный' } }}
        toolbar={{ commands: ['undo', 'separator', 'toggleBold'], textStyle: false, showModeToggle: false }}
      />,
    );
    const wrapper = container.querySelector<HTMLElement>('#draft')!;
    expect(wrapper.dataset.document).toBe('scene');
    expect(wrapper.style.width).toBe('300px');
    expect(onReady).toHaveBeenCalledWith(ref.current?.view);
    const toolbar = wrapper.querySelector('[role="toolbar"][aria-label="Форматирование"]')!;
    expect([...toolbar.querySelectorAll('button')].map((button) => button.ariaLabel)).toEqual(['Отменить', 'Жирный']);
    expect(toolbar.querySelector('select')).toBeNull();
    expect(ref.current?.view?.contentDOM.getAttribute('spellcheck')).toBe('true');
  });

  it('resolves a local image source without changing the Markdown URL', () => {
    const ref = { current: null as GalleyHandle | null };
    const markdown = 'Text\n\n![Flower](assets/flower.png)';
    const { container } = mount(
      <GalleyEditor ref={ref} defaultValue={markdown} resolveImageSource={() => '/safe/flower.png'} />,
    );
    expect(container.querySelector('img.ge-image')?.getAttribute('src')).toBe('/safe/flower.png');
    expect(ref.current?.getContent()).toBe(markdown);
  });
});
