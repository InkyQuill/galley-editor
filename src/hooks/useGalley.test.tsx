import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import GalleyEditor from '../components/GalleyEditor';
import { useGalley } from './useGalley';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const roots: Root[] = [];
const containers: HTMLElement[] = [];

function mount(element: React.ReactNode): HTMLElement {
  const container = document.createElement('div');
  document.body.appendChild(container);
  containers.push(container);
  const root = createRoot(container);
  roots.push(root);
  act(() => {
    root.render(element);
  });
  return container;
}

afterEach(() => {
  for (const root of roots) {
    act(() => root.unmount());
  }
  roots.length = 0;
  for (const container of containers) container.remove();
  containers.length = 0;
});

describe('useGalley', () => {
  it('provides reactive content and stable imperative wrappers', () => {
    const onChange = vi.fn();
    const observedExecCommands: unknown[] = [];

    function Harness() {
      const {
        ref: editorRef,
        content,
        setContent,
        execCommand,
        focus,
      } = useGalley({ initialValue: '# Hello', onChange });
      observedExecCommands.push(execCommand);

      return (
        <>
          <GalleyEditor
            ref={editorRef}
            value={content}
            onChange={setContent}
            theme="light"
          />
          <button type="button" data-testid="set" onClick={() => setContent('next')}>
            set
          </button>
          <button type="button" data-testid="bold" onClick={() => execCommand('toggleBold')}>
            bold
          </button>
          <button type="button" data-testid="focus" onClick={() => focus()}>
            focus
          </button>
          <output>{content}</output>
        </>
      );
    }

    const container = mount(<Harness />);
    expect(container.querySelector('output')?.textContent).toBe('# Hello');

    act(() => {
      container.querySelector<HTMLButtonElement>('[data-testid="set"]')?.click();
    });
    expect(container.querySelector('output')?.textContent).toBe('next');
    expect(onChange).toHaveBeenLastCalledWith('next');

    act(() => {
      container.querySelector<HTMLButtonElement>('[data-testid="focus"]')?.click();
    });
    expect(() => {
      act(() => {
        container.querySelector<HTMLButtonElement>('[data-testid="bold"]')?.click();
      });
    }).not.toThrow();

    expect(new Set(observedExecCommands).size).toBe(1);
  });
});
