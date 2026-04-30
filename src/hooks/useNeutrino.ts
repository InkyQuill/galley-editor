import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import type {
  BuiltinCommand,
  NeutrinoHandle,
  UseNeutrinoOptions,
  UseNeutrinoResult,
} from '../types';

export function useNeutrino(options: UseNeutrinoOptions = {}): UseNeutrinoResult {
  const ref = useRef<NeutrinoHandle | null>(null);
  const onChangeRef = useRef(options.onChange);

  const [content, setContentState] = useState(options.initialValue ?? '');

  useLayoutEffect(() => {
    onChangeRef.current = options.onChange;
  }, [options.onChange]);

  const setContent = useCallback((value: string) => {
    setContentState(value);
    onChangeRef.current?.(value);
    ref.current?.setContent(value);
  }, []);

  const insertText = useCallback((text: string) => {
    ref.current?.insertText(text);
  }, []);

  const focus = useCallback(() => {
    ref.current?.focus();
  }, []);

  const blur = useCallback(() => {
    ref.current?.blur();
  }, []);

  const select = useCallback((anchor: number, head?: number) => {
    ref.current?.select(anchor, head);
  }, []);

  const getSelection = useCallback(() => (
    ref.current?.getSelection() ?? { from: 0, to: 0, anchor: 0, head: 0 }
  ), []);

  const execCommand = useCallback((
    name: BuiltinCommand | string,
    ...args: unknown[]
  ) => ref.current?.execCommand(name, ...args), []);

  const undo = useCallback(() => {
    ref.current?.undo();
  }, []);

  const redo = useCallback(() => {
    ref.current?.redo();
  }, []);

  return {
    ref,
    content,
    setContent,
    insertText,
    focus,
    blur,
    select,
    getSelection,
    execCommand,
    undo,
    redo,
  };
}
