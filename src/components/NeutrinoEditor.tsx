import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import {
  EditorController,
  type ControllerSettings,
  type EditorCallbacks,
} from '../controller';
import { resolveColorScheme, watchColorScheme } from '../theme';
import { resolveClassNames, type NeutrinoEditorProps, type NeutrinoHandle } from '../types';
import { NEUTRINO_VERSION } from '../version';

export type { NeutrinoEditorProps, NeutrinoHandle };

function wordCount(value: string): number {
  const words = value.trim().match(/\S+/g);
  return words?.length ?? 0;
}

function plural(value: number, singular: string, pluralValue: string): string {
  return `${value} ${value === 1 ? singular : pluralValue}`;
}

function NeutrinoLogo() {
  return (
    <svg
      className="ne-footer-logo"
      width="18"
      height="18"
      viewBox="0 0 116 116"
      aria-hidden="true"
      focusable="false"
    >
      <g transform="translate(-44.034126,-72.285387)">
        <path
          fill="currentColor"
          d="m 89.608893,188.00206 c -7.164788,-1.60037 -11.339635,-5.8813 -12.901236,-13.22904 -0.463661,-2.18165 -0.555713,-3.51274 -0.547323,-7.91442 0.0139,-7.29082 0.692282,-12.74381 3.406793,-27.38438 1.349963,-7.28095 1.726911,-11.90433 1.166782,-14.31089 -1.068772,-4.5919 -3.95797,-6.52081 -8.751732,-5.84288 -2.707494,0.38289 -4.247564,0.51234 -7.789345,2.70841 -2.663004,1.65119 -11.737019,9.15909 -11.570077,8.81724 2.347716,-4.80743 6.785574,-9.87263 9.056535,-11.9707 5.841586,-5.39687 12.856035,-6.8478 19.42756,-6.56544 4.997675,0.21474 8.778384,2.67866 11.608253,5.70402 2.381394,2.5459 3.585012,5.81503 3.809794,10.34774 0.186684,3.76444 -0.09279,6.27173 -1.902187,17.06563 -1.835725,10.95093 -2.317784,14.98 -2.319812,20.16847 -0.0031,8.04665 2.4734,9.70269 6.919351,9.8767 5.988791,0.23439 9.081601,-0.76786 15.349561,-4.5106 10.03567,-5.99253 18.31492,-34.01158 18.93403,-68.81365 -0.3189,-0.18612 -4.24291,-0.41959 -7.48307,0.69893 5.3289,-7.542767 9.71734,-17.366585 13.83817,-30.152939 2.10661,11.605462 4.95215,21.650764 9.76655,30.889189 -1.15687,-0.0433 -5.44525,-0.97375 -6.64932,-0.98622 -2.09343,25.22552 -0.98913,56.64994 -17.96671,74.21112 -8.81034,9.07736 -22.87269,13.05767 -35.402567,11.19371 z"
        />
      </g>
    </svg>
  );
}

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
      tabIndents = true,
      keymap,
      codeHighlighter,
      toolbar = true,
      footer = true,
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
    const [resolvedTheme, setResolvedTheme] = useState(() => resolveColorScheme(theme));
    const footerOptions = typeof footer === 'object'
      ? footer
      : { wordCount: true, characterCount: true, logo: true };
    const showFooter = footer !== false;
    const runCommand = (command: string, ...args: unknown[]) => {
      controllerRef.current?.execCommand(command, ...args);
      controllerRef.current?.focus();
    };
    const toolbarButton = (
      label: string,
      ariaLabel: string,
      command: string,
      ...args: unknown[]
    ) => (
      <button
        type="button"
        className="ne-toolbar-button"
        aria-label={ariaLabel}
        title={ariaLabel}
        disabled={!editable}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => runCommand(command, ...args)}
      >
        {label}
      </button>
    );

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
      editorClassName,
      classNames: resolveClassNames(classNames),
      minRows,
      maxRows,
      tabIndents,
      keymap,
      codeHighlighter,
      plugins,
      disabledPlugins,
      extraExtensions: extensions,
    });
    const settingsRef = useRef<ControllerSettings | null>(null);
    settingsRef.current = buildSettings();

    // ── Create EditorView ONCE on mount ─────────────────────────────────
    useEffect(() => {
      if (!containerRef.current) return;
      const initialSettings = settingsRef.current;
      if (!initialSettings) return;

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
        initialSettings,
        callbackProxy,
      );

      controllerRef.current = controller;

      return () => {
        controller.destroy();
        controllerRef.current = null;
      };
    }, []); // Intentionally empty — view created once

    // ── Sync settings changes via Compartment reconfiguration ───────────
    useEffect(() => {
      if (!controllerRef.current || !settingsRef.current) return;

      controllerRef.current.updateSettings(settingsRef.current);
    }, [editable, placeholder, theme, editorClassName, classNames, minRows, maxRows, tabIndents, keymap, codeHighlighter, plugins, disabledPlugins, extensions]);

    // ── Resolve wrapper theme and watch system preference changes ────────
    useEffect(() => {
      setResolvedTheme(resolveColorScheme(theme));
      return watchColorScheme(theme, (nextTheme) => {
        setResolvedTheme(nextTheme);
        if (!controllerRef.current || !settingsRef.current) return;
        controllerRef.current.updateSettings(settingsRef.current);
      });
    }, [theme]);

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
        get view() { return controllerRef.current?.view ?? null; },
        getContent: () => controllerRef.current?.getContent() ?? '',
        setContent: (v: string) => controllerRef.current?.setContent(v),
        insertText: (t: string) => controllerRef.current?.insertText(t),
        focus: () => controllerRef.current?.focus(),
        blur: () => controllerRef.current?.blur(),
        select: (a: number, h?: number) => controllerRef.current?.select(a, h),
        getSelection: () => controllerRef.current?.getSelection() ?? { from: 0, to: 0, anchor: 0, head: 0 },
        execCommand: (name: string, ...args: unknown[]) => controllerRef.current?.execCommand(name, ...args),
        registerCommand: (name: string, fn: import('../types').CommandFn) => controllerRef.current?.registerCommand(name, fn),
        undo: () => controllerRef.current?.undo(),
        redo: () => controllerRef.current?.redo(),
        scrollTo: (f: number) => controllerRef.current?.scrollTo(f),
        scrollSelectionIntoView: () => controllerRef.current?.scrollSelectionIntoView(),
        addExtension: (ext: import('@codemirror/state').Extension) => controllerRef.current?.addExtension(ext) ?? { remove() {} },
      }),
      [],
    );

    return (
      <div className={className} data-theme={resolvedTheme}>
        <div className="ne-editor-shell">
          {toolbar && (
            <div className="ne-toolbar" aria-label="Editor toolbar">
              <select
                className="ne-toolbar-select"
                aria-label="Text style"
                defaultValue="normal"
                disabled={!editable}
                onMouseDown={(event) => event.preventDefault()}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  if (value.startsWith('h')) {
                    runCommand('toggleHeading', Number(value.slice(1)));
                    event.currentTarget.value = 'normal';
                  }
                }}
              >
                <option value="normal">Normal</option>
                <option value="h1">Heading 1</option>
                <option value="h2">Heading 2</option>
                <option value="h3">Heading 3</option>
                <option value="h4">Heading 4</option>
                <option value="h5">Heading 5</option>
                <option value="h6">Heading 6</option>
              </select>
              <span className="ne-toolbar-separator" />
              {toolbarButton('B', 'Bold', 'toggleBold')}
              {toolbarButton('I', 'Italic', 'toggleItalic')}
              {toolbarButton('S', 'Strikethrough', 'toggleStrikethrough')}
              {toolbarButton('`', 'Inline code', 'toggleCode')}
              <span className="ne-toolbar-separator" />
              {toolbarButton('UL', 'Bullet list', 'toggleBulletList')}
              {toolbarButton('1.', 'Ordered list', 'toggleOrderedList')}
              {toolbarButton('[ ]', 'Task list', 'toggleCheckList')}
              <span className="ne-toolbar-separator" />
              {toolbarButton('[]', 'Insert link', 'insertLink')}
              {toolbarButton('Img', 'Insert image', 'insertImage')}
              {toolbarButton('</>', 'Insert code block', 'insertCodeBlock')}
              {toolbarButton('Tbl', 'Insert table', 'insertTable')}
              {toolbarButton('HR', 'Insert divider', 'insertHr')}
              <span className="ne-toolbar-separator" />
              {toolbarButton('Undo', 'Undo', 'undo')}
              {toolbarButton('Redo', 'Redo', 'redo')}
            </div>
          )}
          <div ref={containerRef} />
          {showFooter && (
            <div className="ne-footer">
              <div className="ne-footer-stats">
                {footerOptions.wordCount !== false && (
                  <span>{plural(wordCount(value), 'word', 'words')}</span>
                )}
                {footerOptions.characterCount !== false && (
                  <span>{plural(value.length, 'character', 'characters')}</span>
                )}
              </div>
              {footerOptions.logo !== false && (
                <span
                  className="ne-footer-logo-wrap"
                  aria-label={`Neutrino Editor v.${NEUTRINO_VERSION}`}
                  tabIndex={0}
                >
                  <NeutrinoLogo />
                  <span className="ne-footer-tooltip" role="tooltip">
                    Neutrino Editor v.{NEUTRINO_VERSION}
                  </span>
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  },
);

export default NeutrinoEditor;
