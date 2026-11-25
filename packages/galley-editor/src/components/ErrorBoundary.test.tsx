import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import ErrorBoundary from './ErrorBoundary';

it('announces a localized error and recovers on retry or document change', () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  const host = document.createElement('div');
  const root = createRoot(host, { onCaughtError: () => {} });
  const onError = vi.fn();
  const error = new Error('Document unavailable');
  let broken = true;
  function Document() {
    if (broken) throw error;
    return <p>Recovered text</p>;
  }
  function render(key: number) {
    act(() => root.render(
      <ErrorBoundary resetKey={key} onError={onError} labels={{ heading: 'Ошибка', retry: 'Повторить' }}>
        <Document />
      </ErrorBoundary>,
    ));
  }
  try {
    render(1);
    const alert = host.querySelector('[role="alert"]');
    expect(alert?.querySelector('h2')?.textContent).toBe('Ошибка');
    expect(onError).toHaveBeenCalledWith(error, expect.anything());
    expect(alert?.querySelector('button')?.textContent).toBe('Повторить');
    broken = false;
    act(() => alert?.querySelector('button')?.click());
    expect(host.textContent).toBe('Recovered text');

    broken = true;
    render(1);
    expect(host.querySelector('[role="alert"]')).not.toBeNull();
    broken = false;
    render(2);
    expect(host.textContent).toBe('Recovered text');
  } finally {
    act(() => root.unmount());
  }
});
