import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import {
  EditorController,
  type ControllerSettings,
  type EditorCallbacks,
} from '../controller';
import { resolveColorScheme, watchColorScheme } from '../theme';
import {
  resolveClassNames,
  type NeutrinoEditorProps,
  type NeutrinoFooterContext,
  type NeutrinoFooterSlot,
  type NeutrinoHandle,
  type NeutrinoMode,
  type NeutrinoToolbarContext,
  type NeutrinoToolbarSlot,
  type ToolbarIconName,
  type ToolbarIconRenderer,
} from '../types';
import { NEUTRINO_VERSION } from '../version';

export type { NeutrinoEditorProps, NeutrinoHandle };

const MODE_ORDER: NeutrinoMode[] = ['live', 'markdown', 'preview'];

const MODE_LABELS: Record<NeutrinoMode, string> = {
  live: 'Live',
  markdown: 'Markdown',
  preview: 'HTML',
};

const FOOTER_TOOLTIP = `Neutrino Editor v.${NEUTRINO_VERSION} by Inky Quill`;

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

function isIconRenderer(icon: ReactNode | ToolbarIconRenderer): icon is ToolbarIconRenderer {
  return typeof icon === 'function';
}

function isToolbarSlotRenderer(
  slot: NeutrinoToolbarSlot,
): slot is (context: NeutrinoToolbarContext) => ReactNode {
  return typeof slot === 'function';
}

function isFooterSlotRenderer(
  slot: NeutrinoFooterSlot,
): slot is (context: NeutrinoFooterContext) => ReactNode {
  return typeof slot === 'function';
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
      imageRenderer,
      onLinkClick,
      bidi = false,
      toolbar = true,
      footer = true,
      mode,
      onModeChange,
      surface,
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
    const handleProxy = useMemo<NeutrinoHandle>(
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
    const [resolvedTheme, setResolvedTheme] = useState(() => resolveColorScheme(theme));
    const [internalMode, setInternalMode] = useState<NeutrinoMode>('live');
    const requestedMode = mode ?? internalMode;
    const effectiveMode: NeutrinoMode = editable ? requestedMode : 'preview';
    const canEditDocument = editable && effectiveMode !== 'preview';
    const toolbarOptions = typeof toolbar === 'object' ? toolbar : {};
    const showToolbar = toolbar !== false && toolbarOptions.enabled !== false;
    const showModeToggle = toolbarOptions.showModeToggle !== false;
    const footerOptions = typeof footer === 'object'
      ? footer
      : { wordCount: true, characterCount: true, logo: true };
    const showFooter = footer !== false;
    const currentWordCount = wordCount(value);
    const currentCharacterCount = value.length;
    const shellClassName = ['ne-editor-shell', surface?.className].filter(Boolean).join(' ');
    const shellStyle = {
      ...surface?.style,
      ...(surface?.contentPadding ? { '--ne-content-padding': surface.contentPadding } : {}),
      ...(surface?.toolbarPadding ? { '--ne-toolbar-padding': surface.toolbarPadding } : {}),
      ...(surface?.footerPadding ? { '--ne-footer-padding': surface.footerPadding } : {}),
    } as CSSProperties & Record<string, string | number | undefined>;

    const changeMode = (nextMode: NeutrinoMode) => {
      if (!mode) setInternalMode(nextMode);
      onModeChange?.(nextMode);
    };
    const cycleMode = () => {
      const currentIndex = MODE_ORDER.indexOf(effectiveMode);
      const nextMode = MODE_ORDER[(currentIndex + 1) % MODE_ORDER.length];
      changeMode(nextMode);
    };
    const runCommand = (command: string, ...args: unknown[]) => {
      if (!canEditDocument) return;
      controllerRef.current?.execCommand(command, ...args);
      controllerRef.current?.focus();
    };
    const toolbarContext: NeutrinoToolbarContext = {
      value,
      mode: effectiveMode,
      canEdit: canEditDocument,
      editor: handleProxy,
      execCommand: runCommand,
      setMode: changeMode,
      cycleMode,
    };
    const footerContext: NeutrinoFooterContext = {
      value,
      mode: effectiveMode,
      wordCount: currentWordCount,
      characterCount: currentCharacterCount,
      editor: handleProxy,
    };
    const renderToolbarSlot = (
      slot: NeutrinoToolbarSlot | undefined,
      position: 'before' | 'after',
    ) => {
      if (!slot) return null;
      return (
        <div className={`ne-toolbar-slot ne-toolbar-slot-${position}`}>
          {isToolbarSlotRenderer(slot) ? slot(toolbarContext) : slot}
        </div>
      );
    };
    const renderFooterSlot = (
      slot: NeutrinoFooterSlot | undefined,
      position: 'before' | 'after',
    ) => {
      if (!slot) return null;
      return (
        <div className={`ne-footer-slot ne-footer-slot-${position}`}>
          {isFooterSlotRenderer(slot) ? slot(footerContext) : slot}
        </div>
      );
    };
    const renderIcon = (name: ToolbarIconName, fallback: ReactNode, label: string) => {
      const configured = toolbarOptions.icons?.[name];
      if (!configured) return fallback;
      if (isIconRenderer(configured)) {
        return configured({ name, label, mode: effectiveMode });
      }
      return configured;
    };
    const toolbarButton = (
      name: ToolbarIconName,
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
        disabled={!canEditDocument}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => runCommand(command, ...args)}
      >
        {renderIcon(name, label, ariaLabel)}
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
      imageRenderer,
      onLinkClick,
      bidi,
      mode: effectiveMode,
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
    }, [editable, placeholder, theme, editorClassName, classNames, minRows, maxRows, tabIndents, keymap, codeHighlighter, imageRenderer, onLinkClick, bidi, effectiveMode, plugins, disabledPlugins, extensions]);

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
      () => handleProxy,
      [handleProxy],
    );

    return (
      <div className={className} data-theme={resolvedTheme} data-mode={effectiveMode}>
        <div className={shellClassName} style={shellStyle}>
          {showToolbar && (
            <div className="ne-toolbar" aria-label="Editor toolbar">
              {renderToolbarSlot(toolbarOptions.before, 'before')}
              <select
                className="ne-toolbar-select"
                aria-label="Text style"
                name="ne-text-style"
                defaultValue="normal"
                disabled={!canEditDocument}
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
              {toolbarButton('bold', 'B', 'Bold', 'toggleBold')}
              {toolbarButton('italic', 'I', 'Italic', 'toggleItalic')}
              {toolbarButton('strikethrough', 'S', 'Strikethrough', 'toggleStrikethrough')}
              {toolbarButton('inlineCode', '`', 'Inline code', 'toggleCode')}
              <span className="ne-toolbar-separator" />
              {toolbarButton('bulletList', 'UL', 'Bullet list', 'toggleBulletList')}
              {toolbarButton('orderedList', '1.', 'Ordered list', 'toggleOrderedList')}
              {toolbarButton('taskList', '[ ]', 'Task list', 'toggleCheckList')}
              <span className="ne-toolbar-separator" />
              {toolbarButton('link', '[]', 'Insert link', 'insertLink')}
              {toolbarButton('image', 'Img', 'Insert image', 'insertImage')}
              {toolbarButton('codeBlock', '</>', 'Insert code block', 'insertCodeBlock')}
              {toolbarButton('table', 'Tbl', 'Insert table', 'insertTable')}
              {toolbarButton('divider', 'HR', 'Insert divider', 'insertHr')}
              <span className="ne-toolbar-separator" />
              {toolbarButton('undo', 'Undo', 'Undo', 'undo')}
              {toolbarButton('redo', 'Redo', 'Redo', 'redo')}
              {showModeToggle && (
                <>
                  <span className="ne-toolbar-separator" />
                  <button
                    type="button"
                    className="ne-toolbar-button ne-mode-toggle"
                    aria-label="Switch editor mode"
                    title="Switch editor mode"
                    disabled={!editable}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={cycleMode}
                  >
                    {renderIcon('mode', MODE_LABELS[effectiveMode], 'Switch editor mode')}
                  </button>
                </>
              )}
              {renderToolbarSlot(toolbarOptions.after, 'after')}
            </div>
          )}
          <div ref={containerRef} />
          {showFooter && (
            <div className="ne-footer">
              {renderFooterSlot(footerOptions.before, 'before')}
              <div className="ne-footer-stats">
                {footerOptions.wordCount !== false && (
                  <span>{plural(currentWordCount, 'word', 'words')}</span>
                )}
                {footerOptions.characterCount !== false && (
                  <span>{plural(currentCharacterCount, 'character', 'characters')}</span>
                )}
              </div>
              <div className="ne-footer-end">
                {renderFooterSlot(footerOptions.after, 'after')}
                {footerOptions.logo !== false && (
                  <span
                    className="ne-footer-logo-wrap"
                    aria-label={FOOTER_TOOLTIP}
                    tabIndex={0}
                  >
                    <NeutrinoLogo />
                    <span className="ne-footer-tooltip" role="tooltip">
                      {FOOTER_TOOLTIP}
                    </span>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  },
);

export default NeutrinoEditor;
