"use client";

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

const useSafeLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;
import {
  EditorController,
  type ControllerSettings,
  type EditorCallbacks,
} from '../controller';
import { DEFAULT_KEYMAP, type GalleyKeyBinding } from '../commands';
import {
  findCommandKey,
  formatKeybinding,
} from '../commands/keymapDisplay';
import { resolveColorScheme, watchColorScheme } from '../theme';
import {
  type BuiltinCommand,
  resolveClassNames,
  type GalleyEditorProps,
  type GalleyFooterContext,
  type GalleyFooterSlot,
  type GalleyHandle,
  type GalleyMode,
  type GalleyToolbarContext,
  type GalleyToolbarSlot,
  type ToolbarIconName,
  type ToolbarIconRenderer,
} from '../types';
import { GALLEY_VERSION } from '../version';

export type { GalleyEditorProps, GalleyHandle };

const MODE_ORDER: GalleyMode[] = ['live', 'markdown', 'preview'];

const MODE_LABELS: Record<GalleyMode, string> = {
  live: 'Live',
  markdown: 'Markdown',
  preview: 'HTML',
};

const FOOTER_TOOLTIP = `Galley Editor v.${GALLEY_VERSION} by Inky Quill`;

function wordCount(value: string): number {
  const words = value.trim().match(/\S+/g);
  return words?.length ?? 0;
}

function plural(value: number, singular: string, pluralValue: string): string {
  return `${value} ${value === 1 ? singular : pluralValue}`;
}

function GalleyLogo() {
  return (
    <svg
      className="ge-footer-logo"
      width="18"
      height="18"
      viewBox="0 0 250 250"
      aria-hidden="true"
      focusable="false"
    >
      <g transform="translate(18.547382,-47.712035)">
        <path fill="currentColor" d="m 81.702183,273.93601 c -3.95284,-0.78791 -9.727379,-4.17733 -10.865046,-6.37733 -0.437794,-0.8466 -0.493188,-2.27989 -0.125491,-3.24701 0.225194,-0.5923 7.174802,-9.36883 14.425166,-18.21727 l 2.54738,-3.10885 H 73.66399 59.643788 l 0.01984,2.44739 c 0.01362,1.68084 -0.111657,2.75776 -0.39999,3.4383 -0.403375,0.95205 -12.685206,19.4236 -14.982864,22.53383 -1.494374,2.02286 -2.383681,2.5345 -4.407482,2.53574 -1.944695,10e-4 -3.814678,-0.60901 -7.069632,-2.30694 -3.236575,-1.68835 -5.09949,-3.47397 -5.341507,-5.11989 -0.124777,-0.8486 -0.05305,-1.50902 0.240104,-2.21063 0.364521,-0.87242 5.92113,-7.94114 14.313759,-18.20895 l 2.541094,-3.10885 H 16.893707 c -15.2148704,0 -27.663401,-0.1015 -27.663401,-0.22555 0,-0.12406 0.74353,-0.80867 1.6522906,-1.52136 4.558226,-3.57477 8.42348495,-7.19187 11.563184,-10.8208 7.5877964,-8.77014 12.5582994,-19.1769 14.4479294,-30.24967 1.393672,-8.16658 0.507019,-13.65776 -2.640293,-16.35175 -2.82973,-2.42214 -8.5101004,-2.25149 -13.91061054,0.41792 -3.90861986,1.93198 -9.23109986,5.56027 -14.92219146,10.17233 -2.528995,2.0495 -3.334059,2.56492 -3.334059,2.13453 0,-0.85032 4.048297,-9.64331 6.00025,-13.03268 3.5411396,-6.14884 10.1513366,-14.02162 15.5632926,-18.53597 5.8007803,-4.83869 11.5217844,-7.7588 18.2562504,-9.31833 2.789297,-0.64594 12.832291,-1.0789 12.832291,-0.55322 0,0.15909 -0.420402,1.05408 -0.934227,1.98887 -1.180888,2.14836 -2.139433,4.58123 -2.67338,6.78526 -0.647793,2.67397 -0.76496,7.60775 -0.25079,10.56048 2.078095,11.93387 11.038974,21.21369 21.717772,22.49076 1.561077,0.18669 12.154989,0.28503 30.757813,0.28552 l 28.376562,7.4e-4 V 187.15846 177.1043 h 4.63022 4.63021 v 10.05416 10.05417 h 36.58558 c 23.76694,0 37.35519,-0.0965 38.78211,-0.27542 7.54178,-0.94566 13.91447,-5.6687 17.24863,-12.78361 1.58388,-3.37991 2.13949,-5.79138 2.29781,-9.9729 0.11636,-3.07318 0.0557,-3.90428 -0.42506,-5.82083 -1.05867,-4.22069 -3.01851,-7.0826 -5.72136,-8.3548 -0.72761,-0.34248 -1.70401,-0.62385 -2.16979,-0.62527 -1.8656,-0.006 -3.44526,-0.54645 -4.40767,-1.50886 -1.7058,-1.7058 -1.91079,-4.03057 -0.51656,-5.85849 1.05193,-1.37915 2.69201,-1.98249 5.37422,-1.97703 4.50086,0.009 8.62632,1.80933 12.03855,5.25308 5.1333,5.18071 8.70549,12.75757 10.34764,21.94809 0.66227,3.7065 0.66601,13.76504 0.007,18.25625 -1.88657,12.85288 -6.87106,23.48491 -14.99322,31.98083 -7.76379,8.12107 -18.12066,13.54421 -28.831,15.09671 -2.08874,0.30277 -5.73263,0.42025 -14.68437,0.47345 -6.54844,0.0389 -14.97211,0.10518 -18.71927,0.14724 l -6.81302,0.0765 v 2.10512 c 0,1.39846 -0.16236,2.53239 -0.48365,3.37796 -0.42231,1.11143 -10.75319,16.80456 -14.65142,22.25623 -1.7007,2.37844 -2.84287,3.07207 -4.97327,3.02023 -3.27067,-0.0796 -10.61202,-3.92377 -11.77009,-6.16321 -0.62974,-1.21779 -0.51718,-3.20166 0.24541,-4.3254 0.83125,-1.22491 14.52343,-18.31021 15.52707,-19.3749 0.41806,-0.44349 0.76011,-0.88998 0.76011,-0.99219 0,-0.10221 -6.38522,-0.18584 -14.18938,-0.18584 h -14.18961 l 0.18159,1.60502 c 0.33162,2.93118 -0.0693,3.96258 -3.638582,9.36127 -5.457907,8.25524 -11.109922,16.5885 -12.152545,17.91755 -1.47586,1.8813 -3.114502,2.51351 -5.35649,2.06662 z M 64.178324,231.40696 c 10.457171,-14.62097 15.560188,-21.99026 16.00715,-23.11601 0.340328,-0.85718 0.333393,-1.06107 -0.06462,-1.89981 -0.890535,-1.87666 -3.145479,-1.80124 -4.717945,0.15781 -0.492116,0.6131 -2.618221,3.49597 -4.724678,6.40639 -2.106457,2.91042 -7.304129,10.07651 -11.550383,15.92466 -4.246253,5.84815 -7.720461,10.74591 -7.720461,10.88392 0,0.38869 4.706994,2.49341 5.0719,2.26789 0.09853,-0.0609 3.563098,-4.84208 7.699034,-10.62485 z m 35.825506,10.18953 c 0.95473,-1.06334 17.24667,-23.90489 21.3331,-29.90934 2.44534,-3.59309 2.73621,-4.47603 1.87814,-5.7011 -0.61866,-0.88326 -1.55199,-1.15889 -2.79279,-0.82478 -1.17187,0.31555 -0.62034,-0.39291 -13.98155,17.95998 -2.25558,3.09824 -5.92631,8.13108 -8.157192,11.18408 -2.23088,3.053 -4.0036,5.60346 -3.939379,5.66768 0.151186,0.15119 4.772459,2.20931 4.972841,2.21469 0.08377,0.002 0.392845,-0.26379 0.68683,-0.59121 z m 47.49797,-5.15938 c 5.77338,-7.76752 8.78838,-11.94361 14.31802,-19.83204 5.48286,-7.82168 5.73738,-8.22175 5.73867,-9.02068 0.003,-1.78096 -1.67141,-2.97382 -3.38178,-2.40935 -0.74869,0.24709 -1.68366,1.35163 -5.54638,6.55229 -2.55524,3.4403 -6.9978,9.41025 -9.87234,13.26655 -2.87455,3.8563 -6.54317,8.7974 -8.15249,10.98021 l -2.92604,3.96875 1.90928,0.89171 c 1.76257,0.82319 2.93301,1.27805 3.43398,1.33451 0.11098,0.0125 2.12656,-2.56687 4.47908,-5.73195 z M 53.816852,173.831 c -0.231538,-0.27899 -0.124755,-0.75607 0.461871,-2.06355 5.181946,-11.54958 8.083376,-29.90833 7.233939,-45.77264 -0.429777,-8.02663 -1.488792,-15.51193 -3.102659,-21.93012 -0.882676,-3.51031 -2.876028,-9.623913 -3.975269,-12.19213 -0.708768,-1.655932 -0.850415,-2.231453 -0.618099,-2.511376 0.439363,-0.529401 128.505985,-0.545911 128.709105,-0.01659 0.0731,0.190603 -0.34142,1.530056 -0.92125,2.976563 -2.87944,7.18337 -5.25893,17.123883 -6.24441,26.086463 -0.59321,5.39502 -0.79715,16.06323 -0.41144,21.52272 0.87255,12.35075 3.27675,23.07422 7.28662,32.50072 0.81881,1.92489 6.71669,1.76282 -64.15286,1.76282 -53.87144,0 -64.011904,-0.0573 -64.265548,-0.36288 z M 111.90878,85.911234 c -0.097,-0.09701 -0.17639,-3.88856 -0.17639,-8.425659 0,-7.655741 0.0348,-8.280776 0.48386,-8.687153 0.69767,-0.631381 7.73292,-0.649984 8.36079,-0.02211 0.36062,0.360614 0.41578,1.536531 0.41578,8.863542 v 8.447768 H 116.539 c -2.44961,0 -4.5332,-0.07937 -4.63022,-0.176388 z" />
      </g>
    </svg>
  );
}

function isIconRenderer(icon: ReactNode | ToolbarIconRenderer): icon is ToolbarIconRenderer {
  return typeof icon === 'function';
}

function isToolbarSlotRenderer(
  slot: GalleyToolbarSlot,
): slot is (context: GalleyToolbarContext) => ReactNode {
  return typeof slot === 'function';
}

function isFooterSlotRenderer(
  slot: GalleyFooterSlot,
): slot is (context: GalleyFooterContext) => ReactNode {
  return typeof slot === 'function';
}

const GalleyEditor = forwardRef<GalleyHandle, GalleyEditorProps>(
  function GalleyEditor(props, ref) {
    const {
      value = '',
      onChange,
      editable = true,
      placeholder = '',
      ariaLabel,
      minRows = 3,
      maxRows,
      layout = 'autosize',
      horizontalScroll = false,
      className = '',
      editorClassName = '',
      classNames,
      theme = 'auto',
      tabIndents = true,
      keymap,
      codeHighlighter,
      imageRenderer,
      missingImageRenderer,
      imageControlsRenderer,
      tableControlIcons,
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
      onFiles,
      uploadInteraction = 'inline',
      uploadPlaceholderRenderer,
      dropIndicatorRenderer,
      uploadOverlayRenderer,
      onFileError,
      onFileStatus,
      onSubmit,
    } = props;

    const containerRef = useRef<HTMLDivElement>(null);
    const controllerRef = useRef<EditorController | null>(null);
    const handleProxy = useMemo<GalleyHandle>(
      () => ({
        get view() { return controllerRef.current?.view ?? null; },
        getContent: () => controllerRef.current?.getContent() ?? '',
        setContent: (v: string) => controllerRef.current?.setContent(v),
        insertText: (t: string) => controllerRef.current?.insertText(t),
        focus: () => controllerRef.current?.focus(),
        blur: () => controllerRef.current?.blur(),
        openSearch: () => controllerRef.current?.openSearch() ?? false,
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
    const [internalMode, setInternalMode] = useState<GalleyMode>('live');
    const requestedMode = mode ?? internalMode;
    const effectiveMode: GalleyMode = editable ? requestedMode : 'preview';
    const canEditDocument = editable && effectiveMode !== 'preview';
    const [displayKeymap, setDisplayKeymap] = useState<readonly GalleyKeyBinding[]>(
      () => Array.isArray(keymap) ? keymap : DEFAULT_KEYMAP,
    );
    const shortcutPlatform =
      typeof navigator !== 'undefined' &&
      /Mac|iPhone|iPad|iPod/.test(navigator.platform)
        ? 'mac'
        : 'other';
    const toolbarOptions = typeof toolbar === 'object' ? toolbar : {};
    const showToolbar = toolbar !== false && toolbarOptions.enabled !== false;
    const showModeToggle = toolbarOptions.showModeToggle !== false;
    const footerOptions = typeof footer === 'object'
      ? footer
      : { wordCount: true, characterCount: true, logo: true };
    const showFooter = footer !== false;
    const currentWordCount = wordCount(value);
    const currentCharacterCount = value.length;
    const shellClassName = [
      'ge-editor-shell',
      `ge-layout-${layout}`,
      surface?.className,
    ].filter(Boolean).join(' ');
    const shellStyle = {
      ...surface?.style,
      ...(surface?.contentPadding ? { '--ge-content-padding': surface.contentPadding } : {}),
      ...(surface?.toolbarPadding ? { '--ge-toolbar-padding': surface.toolbarPadding } : {}),
      ...(surface?.footerPadding ? { '--ge-footer-padding': surface.footerPadding } : {}),
    } as CSSProperties & Record<string, string | number | undefined>;

    const changeMode = (nextMode: GalleyMode) => {
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
    const toolbarContext: GalleyToolbarContext = {
      value,
      mode: effectiveMode,
      canEdit: canEditDocument,
      editor: handleProxy,
      execCommand: runCommand,
      setMode: changeMode,
      cycleMode,
    };
    const footerContext: GalleyFooterContext = {
      value,
      mode: effectiveMode,
      wordCount: currentWordCount,
      characterCount: currentCharacterCount,
      editor: handleProxy,
    };
    const renderToolbarSlot = (
      slot: GalleyToolbarSlot | undefined,
      position: 'before' | 'after',
    ) => {
      if (!slot) return null;
      return (
        <div className={`ge-toolbar-slot ge-toolbar-slot-${position}`}>
          {isToolbarSlotRenderer(slot) ? slot(toolbarContext) : slot}
        </div>
      );
    };
    const renderFooterSlot = (
      slot: GalleyFooterSlot | undefined,
      position: 'before' | 'after',
    ) => {
      if (!slot) return null;
      return (
        <div className={`ge-footer-slot ge-footer-slot-${position}`}>
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
      command: BuiltinCommand,
      ...args: unknown[]
    ) => {
      const key = findCommandKey(displayKeymap, command);
      const title = key
        ? `${ariaLabel} (${formatKeybinding(key, shortcutPlatform)})`
        : ariaLabel;

      return (
        <button
          type="button"
          className="ge-toolbar-button"
          aria-label={ariaLabel}
          title={title}
          disabled={!canEditDocument}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => runCommand(command, ...args)}
        >
          {renderIcon(name, label, ariaLabel)}
        </button>
      );
    };

    // Stable callback refs — updated every render, never cause re-init
    const callbacksRef = useRef<EditorCallbacks>({});
    useSafeLayoutEffect(() => {
      callbacksRef.current = {
        onChange,
        onSelectionChange,
        onFocus,
        onBlur,
        onScroll,
        onPaste,
        onFiles,
        onFileError,
        onFileStatus,
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
      ariaLabel,
      theme,
      editorClassName,
      classNames: resolveClassNames(classNames),
      minRows,
      maxRows,
      layout,
      horizontalScroll,
      tabIndents,
      keymap,
      codeHighlighter,
      imageRenderer,
      missingImageRenderer,
      imageControlsRenderer,
      tableControlIcons,
      onLinkClick,
      bidi,
      mode: effectiveMode,
      plugins,
      disabledPlugins,
      extraExtensions: extensions,
      uploadInteraction,
      uploadPlaceholderRenderer,
      dropIndicatorRenderer,
      uploadOverlayRenderer,
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
        get onFiles() { return callbacksRef.current.onFiles; },
        get onFileError() { return callbacksRef.current.onFileError; },
        get onFileStatus() { return callbacksRef.current.onFileStatus; },
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
      setDisplayKeymap(controller.getResolvedKeymap());

      return () => {
        controller.destroy();
        controllerRef.current = null;
      };
    }, []); // Intentionally empty — view created once

    // ── Sync settings changes via Compartment reconfiguration ───────────
    useEffect(() => {
      if (!controllerRef.current || !settingsRef.current) return;

      controllerRef.current.updateSettings(settingsRef.current);
      setDisplayKeymap(controllerRef.current.getResolvedKeymap());
    }, [editable, placeholder, ariaLabel, theme, editorClassName, classNames, minRows, maxRows, layout, horizontalScroll, tabIndents, keymap, codeHighlighter, imageRenderer, missingImageRenderer, imageControlsRenderer, tableControlIcons, onLinkClick, bidi, effectiveMode, plugins, disabledPlugins, extensions, uploadInteraction, uploadPlaceholderRenderer, dropIndicatorRenderer, uploadOverlayRenderer]);

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
            <div className="ge-toolbar" aria-label="Editor toolbar">
              {renderToolbarSlot(toolbarOptions.before, 'before')}
              <select
                className="ge-toolbar-select"
                aria-label="Text style"
                name="ge-text-style"
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
              <span className="ge-toolbar-separator" />
              {toolbarButton('bold', 'B', 'Bold', 'toggleBold')}
              {toolbarButton('italic', 'I', 'Italic', 'toggleItalic')}
              {toolbarButton('strikethrough', 'S', 'Strikethrough', 'toggleStrikethrough')}
              {toolbarButton('inlineCode', '`', 'Inline code', 'toggleCode')}
              <span className="ge-toolbar-separator" />
              {toolbarButton('bulletList', 'UL', 'Bullet list', 'toggleBulletList')}
              {toolbarButton('orderedList', '1.', 'Ordered list', 'toggleOrderedList')}
              {toolbarButton('taskList', '[ ]', 'Task list', 'toggleCheckList')}
              <span className="ge-toolbar-separator" />
              {toolbarButton('link', '[]', 'Insert link', 'insertLink')}
              {toolbarButton('image', 'Img', 'Insert image', 'insertImage')}
              {toolbarButton('codeBlock', '</>', 'Insert code block', 'insertCodeBlock')}
              {toolbarButton('table', 'Tbl', 'Insert table', 'insertTable')}
              {toolbarButton('divider', 'HR', 'Insert divider', 'insertHr')}
              <span className="ge-toolbar-separator" />
              {toolbarButton('undo', 'Undo', 'Undo', 'undo')}
              {toolbarButton('redo', 'Redo', 'Redo', 'redo')}
              {showModeToggle && (
                <>
                  <span className="ge-toolbar-separator" />
                  <button
                    type="button"
                    className="ge-toolbar-button ge-mode-toggle"
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
          <div ref={containerRef} className="ge-editor-body" />
          {showFooter && (
            <div className="ge-footer">
              {renderFooterSlot(footerOptions.before, 'before')}
              <div className="ge-footer-stats">
                {footerOptions.wordCount !== false && (
                  <span>{plural(currentWordCount, 'word', 'words')}</span>
                )}
                {footerOptions.characterCount !== false && (
                  <span>{plural(currentCharacterCount, 'character', 'characters')}</span>
                )}
              </div>
              <div className="ge-footer-end">
                {renderFooterSlot(footerOptions.after, 'after')}
                {footerOptions.logo !== false && (
                  <span
                    className="ge-footer-logo-wrap"
                    aria-label={FOOTER_TOOLTIP}
                    tabIndex={0}
                  >
                    <GalleyLogo />
                    <span className="ge-footer-tooltip" role="tooltip">
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

export default GalleyEditor;
