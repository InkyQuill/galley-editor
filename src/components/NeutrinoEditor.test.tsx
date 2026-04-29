import { act, useLayoutEffect, useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import NeutrinoEditor, { type NeutrinoHandle } from './NeutrinoEditor';
import type { EditorView } from '@codemirror/view';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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

describe('NeutrinoEditor React wrapper', () => {
  it('updates editorClassName on the CodeMirror editor element', () => {
    const { container, root } = mount(<NeutrinoEditor value="hello" editorClassName="a" theme="light" />);
    const editor = container.querySelector('.cm-editor');

    expect(editor).toBeInstanceOf(HTMLElement);
    expect(Array.from(editor?.classList ?? [])).toContain('a');

    rerender(root, <NeutrinoEditor value="hello" editorClassName="b" theme="light" />);
    expect(editor?.classList.contains('a')).toBe(false);
    expect(editor?.classList.contains('b')).toBe(true);

    rerender(root, <NeutrinoEditor value="hello" editorClassName="" theme="light" />);
    expect(editor?.classList.contains('a')).toBe(false);
    expect(editor?.classList.contains('b')).toBe(false);
  });

  it('allows parent layout effects to call focus before the controller mounts', () => {
    const focusCalls: string[] = [];

    function Parent() {
      const editorRef = useRef<NeutrinoHandle>(null);
      useLayoutEffect(() => {
        editorRef.current?.focus();
        focusCalls.push('called');
      }, []);
      return <NeutrinoEditor ref={editorRef} value="hello" theme="light" />;
    }

    expect(() => mount(<Parent />)).not.toThrow();
    expect(focusCalls).toEqual(['called']);
  });

  it('returns null from the view getter before the controller mounts', () => {
    let observedView: EditorView | null | undefined;

    function Parent() {
      const editorRef = useRef<NeutrinoHandle>(null);
      useLayoutEffect(() => {
        observedView = editorRef.current?.view;
      }, []);
      return <NeutrinoEditor ref={editorRef} value="hello" theme="light" />;
    }

    mount(<Parent />);

    expect(observedView).toBeNull();
  });

  it('renders the resolved dark theme on the wrapper', () => {
    const { container } = mount(<NeutrinoEditor value="hello" theme="dark" />);
    const wrapper = container.firstElementChild;

    expect(wrapper).toBeInstanceOf(HTMLElement);
    expect(wrapper?.getAttribute('data-theme')).toBe('dark');
  });

  it('updates auto theme when the preferred color scheme changes', () => {
    const mediaList = mockPrefersDark(false);
    const { container } = mount(<NeutrinoEditor value="hello" theme="auto" />);
    const wrapper = container.firstElementChild;

    expect(wrapper).toBeInstanceOf(HTMLElement);
    expect(wrapper?.getAttribute('data-theme')).toBe('light');

    act(() => {
      mediaList.dispatch(true);
    });

    expect(wrapper?.getAttribute('data-theme')).toBe('dark');
  });
});
