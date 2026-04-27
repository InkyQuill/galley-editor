import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
} from 'react';
import {
  EditorController,
  type ControllerSettings,
  type EditorCallbacks,
} from '../controller';
import { resolveClassNames, type NeutrinoEditorProps, type NeutrinoHandle } from '../types';

export type { NeutrinoEditorProps, NeutrinoHandle };

const NeutrinoEditor = forwardRef<NeutrinoHandle, NeutrinoEditorProps>(
  function NeutrinoEditor(props, ref) {
    const {
      value = '',
      onChange,
      editable = true,
      placeholder = '',
      minRows = 3,
      maxRows,
      className = '',
      editorClassName = '',
      classNames,
      theme = 'auto',
      plugins = [],
      disabledPlugins = [],
      extensions = [],
      onFocus,
      onBlur,
      onSelectionChange,
      onScroll,
      onEnter,
      onEscape,
      onPaste,
      onSubmit,
    } = props;

    const containerRef = useRef<HTMLDivElement>(null);
    const controllerRef = useRef<EditorController | null>(null);

    // Stable callback refs — updated every render, never cause re-init
    const callbacksRef = useRef<EditorCallbacks>({});
    useLayoutEffect(() => {
      callbacksRef.current = {
        onChange,
        onSelectionChange,
        onFocus,
        onBlur,
        onScroll,
        onPaste,
        onEnter,
        onEscape,
        onSubmit,
      };
    });

    // Store initial value to avoid capturing it in the effect closure
    const initialValueRef = useRef(value);

    const buildSettings = (): ControllerSettings => ({
      editable,
      placeholder,
      theme,
      classNames: resolveClassNames(classNames),
      minRows,
      maxRows,
      plugins,
      disabledPlugins,
      extraExtensions: extensions,
    });

    // ── Create EditorView ONCE on mount ─────────────────────────────────
    useEffect(() => {
      if (!containerRef.current) return;

      // Proxy callbacks through the ref so they're always fresh
      const callbackProxy: EditorCallbacks = {
        get onChange() { return callbacksRef.current.onChange; },
        get onSelectionChange() { return callbacksRef.current.onSelectionChange; },
        get onFocus() { return callbacksRef.current.onFocus; },
        get onBlur() { return callbacksRef.current.onBlur; },
        get onScroll() { return callbacksRef.current.onScroll; },
        get onPaste() { return callbacksRef.current.onPaste; },
        get onEnter() { return callbacksRef.current.onEnter; },
        get onEscape() { return callbacksRef.current.onEscape; },
        get onSubmit() { return callbacksRef.current.onSubmit; },
      };

      const controller = new EditorController(
        containerRef.current,
        initialValueRef.current,
        buildSettings(),
        callbackProxy,
      );

      // Apply editor class name if provided
      if (editorClassName) {
        controller.view.dom.classList.add(...editorClassName.split(/\s+/).filter(Boolean));
      }

      controllerRef.current = controller;

      return () => {
        controller.destroy();
        controllerRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Intentionally empty — view created once

    // ── Sync settings changes via Compartment reconfiguration ───────────
    useEffect(() => {
      if (!controllerRef.current) return;

      controllerRef.current.updateSettings(buildSettings());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps are the individual settings props, not the builder function
    }, [editable, placeholder, theme, classNames, minRows, maxRows, plugins, disabledPlugins, extensions]);

    // ── Sync controlled value ───────────────────────────────────────────
    useEffect(() => {
      if (!controllerRef.current) return;
      const current = controllerRef.current.getContent();
      if (value !== current) {
        controllerRef.current.setContent(value);
      }
    }, [value]);

    // ── Expose imperative handle via proxy ─────────────────────────────
    // Proxy through controllerRef so the handle works even before the
    // useEffect that creates the controller has run.
    useImperativeHandle(
      ref,
      () => ({
        get view() { return controllerRef.current!.view; },
        getContent: () => controllerRef.current!.getContent(),
        setContent: (v: string) => controllerRef.current!.setContent(v),
        insertText: (t: string) => controllerRef.current!.insertText(t),
        focus: () => controllerRef.current!.focus(),
        blur: () => controllerRef.current!.blur(),
        select: (a: number, h?: number) => controllerRef.current!.select(a, h),
        getSelection: () => controllerRef.current!.getSelection(),
        execCommand: (name: string, ...args: unknown[]) => controllerRef.current!.execCommand(name, ...args),
        registerCommand: (name: string, fn: import('../types').CommandFn) => controllerRef.current!.registerCommand(name, fn),
        undo: () => controllerRef.current!.undo(),
        redo: () => controllerRef.current!.redo(),
        scrollTo: (f: number) => controllerRef.current!.scrollTo(f),
        scrollSelectionIntoView: () => controllerRef.current!.scrollSelectionIntoView(),
        addExtension: (ext: import('@codemirror/state').Extension) => controllerRef.current!.addExtension(ext),
      }),
      [],
    );

    return (
      <div className={className}>
        <div ref={containerRef} />
      </div>
    );
  },
);

export default NeutrinoEditor;
