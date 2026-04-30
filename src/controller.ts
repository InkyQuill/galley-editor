/**
 * EditorController: owns the CodeMirror EditorView and provides the imperative API.
 *
 * Uses three Compartments for hot-reloading:
 * - dynamicCompartment: settings, plugins, theme
 * - autosizeCompartment: minRows/maxRows
 * - historyCompartment: undo/redo history
 */

import {
  EditorView,
  ViewPlugin,
  keymap,
  placeholder as cmPlaceholder,
  type KeyBinding,
} from '@codemirror/view';
import {
  Compartment,
  EditorSelection,
  EditorState,
  StateEffect,
  type Extension,
} from '@codemirror/state';
import { markdown } from '@codemirror/lang-markdown';
import { GFM } from '@lezer/markdown';
import {
  history,
  standardKeymap,
  historyKeymap,
} from '@codemirror/commands';
import { indentOnInput, bracketMatching } from '@codemirror/language';
import { drawSelection, dropCursor, highlightSpecialChars } from '@codemirror/view';

import { buildCmTheme, type ColorScheme } from './theme';
import { autosizeExtension } from './autosize';
import { BUILT_IN_PLUGINS } from './plugins';
import { biDirectionalTextExtension } from './plugins/bidi';
import {
  BUILTIN_COMMANDS,
  DEFAULT_KEYMAP,
  makeSmartBackspaceTransaction,
  makeSmartEnterTransaction,
  makeSmartTabTransaction,
} from './commands';
import { parseListLine } from './commands/list-syntax';
import {
  resolveClassNames,
  type CommandFn,
  type CodeHighlighter,
  type ImageRenderer,
  type LinkClickHandler,
  type NeutrinoClassNames,
  type NeutrinoHandle,
  type NeutrinoMode,
  type NeutrinoPlugin,
} from './types';

// ── Callback refs (stable references that the static extensions call into) ──

export interface EditorCallbacks {
  onChange?: (value: string) => void;
  onSelectionChange?: (sel: {
    from: number;
    to: number;
    anchor: number;
    head: number;
  }) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onScroll?: (fraction: number) => void;
  onPaste?: (event: ClipboardEvent, view: EditorView) => void;
  onEnter?: (mod: boolean, shift: boolean) => boolean;
  onEscape?: () => boolean | void;
  onSubmit?: () => void;
}

// ── Settings used for Compartment reconfiguration ───────────────────────────

export interface ControllerSettings {
  editable: boolean;
  placeholder: string;
  theme: ColorScheme;
  editorClassName: string;
  classNames: NeutrinoClassNames;
  minRows: number;
  maxRows?: number;
  tabIndents: boolean;
  keymap?: KeyBinding[] | ((defaults: KeyBinding[]) => KeyBinding[]);
  codeHighlighter?: CodeHighlighter;
  imageRenderer?: ImageRenderer;
  onLinkClick?: LinkClickHandler;
  bidi: boolean;
  mode: NeutrinoMode;
  plugins: NeutrinoPlugin[];
  disabledPlugins: string[];
  extraExtensions: Extension[];
}

function getScrollFraction(view: EditorView): number {
  const { scrollTop, scrollHeight, clientHeight } = view.scrollDOM;
  const max = scrollHeight - clientHeight;
  return max > 0 ? scrollTop / max : 0;
}

interface CoalescedCallback<T extends unknown[]> {
  (...args: T): void;
  cancel(): void;
}

function rafCoalesce<T extends unknown[]>(fn: (...args: T) => void): CoalescedCallback<T> {
  let frame: number | null = null;
  let latest: T | null = null;

  const coalesced = ((...args: T) => {
    latest = args;
    if (frame !== null) return;
    frame = requestAnimationFrame(() => {
      frame = null;
      const value = latest;
      latest = null;
      if (value) fn(...value);
    });
  }) as CoalescedCallback<T>;

  coalesced.cancel = () => {
    if (frame !== null) {
      cancelAnimationFrame(frame);
      frame = null;
    }
    latest = null;
  };

  return coalesced;
}

function classTokens(className: string): Set<string> {
  return new Set(className.split(/\s+/).filter(Boolean));
}

function syncClassTokens(view: EditorView, previous: Set<string>, next: Set<string>): void {
  for (const token of previous) {
    if (!next.has(token)) view.dom.classList.remove(token);
  }
  for (const token of next) {
    if (!previous.has(token)) view.dom.classList.add(token);
  }
}

function editorClassNameExtension(className: string): Extension {
  const desiredTokens = classTokens(className);

  return [
    EditorView.editorAttributes.of(className ? { class: className } : {}),
    ViewPlugin.define((view) => {
      let previousTokens = new Set<string>();
      const sync = () => {
        syncClassTokens(view, previousTokens, desiredTokens);
        previousTokens = new Set(desiredTokens);
      };

      sync();

      return {
        update: sync,
        destroy() {
          syncClassTokens(view, previousTokens, new Set());
        },
      };
    }),
  ];
}

// ── EditorController ────────────────────────────────────────────────────────

export class EditorController implements NeutrinoHandle {
  readonly view: EditorView;

  private readonly dynamicCompartment = new Compartment();
  private readonly autosizeCompartment = new Compartment();
  private readonly historyCompartment = new Compartment();
  private readonly keymapCompartment = new Compartment();
  private readonly runtimeExtensionsCompartment = new Compartment();
  private readonly editorClassNameCompartment = new Compartment();
  private readonly runtimeExtensions = new Map<symbol, Extension>();

  private readonly customCommands = new Map<string, CommandFn>();
  private settings: ControllerSettings;
  private callbacks: EditorCallbacks;
  private readonly dispatchSelectionChange: CoalescedCallback<[{
    from: number;
    to: number;
    anchor: number;
    head: number;
  }]>;
  private readonly dispatchScroll: CoalescedCallback<[number]>;

  constructor(
    parent: HTMLElement,
    initialValue: string,
    settings: ControllerSettings,
    callbacks: EditorCallbacks,
  ) {
    this.settings = settings;
    this.callbacks = callbacks;
    this.dispatchSelectionChange = rafCoalesce((sel) => {
      this.callbacks.onSelectionChange?.(sel);
    });
    this.dispatchScroll = rafCoalesce((fraction) => {
      this.callbacks.onScroll?.(fraction);
    });

    const state = EditorState.create({
      doc: initialValue,
      extensions: [
        // Static extensions (never change)
        ...this.buildStaticExtensions(),
        // Dynamic (reconfigured on settings change)
        this.dynamicCompartment.of(this.buildDynamicExtensions()),
        // Autosize (reconfigured on minRows/maxRows change)
        this.autosizeCompartment.of(
          autosizeExtension(settings.minRows, settings.maxRows),
        ),
        // History (separate so it can be cleared independently)
        this.historyCompartment.of(history()),
        // Configured keymap
        this.keymapCompartment.of(this.buildKeymap(this.settings)),
        // Runtime extensions added through the imperative handle
        this.runtimeExtensionsCompartment.of([]),
        // Classes applied to the .cm-editor root
        this.editorClassNameCompartment.of(
          editorClassNameExtension(settings.editorClassName),
        ),
      ],
    });

    this.view = new EditorView({ state, parent });
  }

  // ── Static extensions (created once) ──────────────────────────────────

  private buildStaticExtensions(): Extension[] {
    return [
      markdown({ extensions: [GFM] }),
      highlightSpecialChars(),
      drawSelection(),
      dropCursor(),
      indentOnInput(),
      bracketMatching(),
      EditorState.allowMultipleSelections.of(true),
      EditorView.lineWrapping,
      EditorState.tabSize.of(2),

      // Event listeners (use callback refs so they never go stale)
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          this.callbacks.onChange?.(update.state.doc.toString());
        }
        if (update.selectionSet) {
          const sel = update.state.selection.main;
          this.dispatchSelectionChange({
            from: sel.from,
            to: sel.to,
            anchor: sel.anchor,
            head: sel.head,
          });
        }
        if (update.focusChanged) {
          if (update.view.hasFocus) {
            this.callbacks.onFocus?.();
          } else {
            this.callbacks.onBlur?.();
          }
        }
      }),

      EditorView.domEventHandlers({
        scroll: (_e, view) => {
          this.dispatchScroll(getScrollFraction(view));
        },
        paste: (e, view) => {
          this.callbacks.onPaste?.(e, view);
        },
      }),
    ];
  }

  private handleEnter(cm: EditorView, mod: boolean, shift: boolean): boolean {
    // Mod+Enter triggers submit (Cmd/Ctrl+Enter)
    if (mod && !shift && this.callbacks.onSubmit) {
      this.callbacks.onSubmit();
      return true;
    }
    if (this.callbacks.onEnter) {
      const handled = this.callbacks.onEnter(mod, shift);
      if (handled) return true;
    }

    cm.dispatch({
      ...makeSmartEnterTransaction(cm.state),
      scrollIntoView: true,
    });
    return true;
  }

  private handleDefaultEnter(cm: EditorView): boolean {
    cm.dispatch({
      ...cm.state.changeByRange((range) => ({
        changes: { from: range.from, to: range.to, insert: '\n' },
        range: EditorSelection.cursor(range.from + 1),
      })),
      scrollIntoView: true,
    });
    return true;
  }

  private handleTab(cm: EditorView, shift: boolean): boolean {
    const ranges = cm.state.selection.ranges;
    const hasListSelection = ranges.some((range) => {
      const line = cm.state.doc.lineAt(range.from);
      return parseListLine(line.text) !== null;
    });

    if (hasListSelection) {
      cm.dispatch({
        ...makeSmartTabTransaction(cm.state, shift),
        scrollIntoView: true,
      });
      return true;
    }

    if (!this.settings.tabIndents) {
      return false;
    }

    if (shift) {
      this.execCommand('outdent');
      return true;
    }

    this.execCommand('indent');
    return true;
  }

  private handleBackspace(cm: EditorView): boolean {
    cm.dispatch({
      ...makeSmartBackspaceTransaction(cm.state),
      scrollIntoView: true,
    });
    return true;
  }

  private buildCommandKeymap(): KeyBinding[] {
    return DEFAULT_KEYMAP.map((binding) => {
      if (!binding.command) return binding;
      const { command, args = [] } = binding;
      return {
        key: binding.key,
        shift: binding.shift,
        preventDefault: binding.preventDefault,
        stopPropagation: binding.stopPropagation,
        scope: binding.scope,
        run: () => this.execCommand(command, ...args) !== false,
      } satisfies KeyBinding;
    });
  }

  private buildKeymap(settings: ControllerSettings): Extension {
    const controllerDefaults: KeyBinding[] = [
      { key: 'Enter', run: (cm) => this.handleEnter(cm, false, false) },
      { key: 'Shift-Enter', run: (cm) => this.handleDefaultEnter(cm) },
      { key: 'Mod-Enter', run: (cm) => this.handleEnter(cm, true, false) },
      { key: 'Mod-Shift-Enter', run: () => false },
      { key: 'Tab', run: (cm) => this.handleTab(cm, false) },
      { key: 'Shift-Tab', run: (cm) => this.handleTab(cm, true) },
      { key: 'Backspace', run: (cm) => this.handleBackspace(cm) },
      {
        key: 'Escape',
        run: () => {
          const handled = this.callbacks.onEscape?.();
          return handled === true;
        },
      },
    ];

    const combinedKeymap = [
      ...controllerDefaults,
      ...this.buildCommandKeymap(),
      ...standardKeymap,
      ...historyKeymap,
    ];
    if (typeof settings.keymap === 'function') {
      return keymap.of(settings.keymap(combinedKeymap));
    }
    if (settings.keymap) {
      return keymap.of(settings.keymap);
    }
    return keymap.of(combinedKeymap);
  }

  // ── Dynamic extensions (reconfigured on settings change) ──────────────

  private buildDynamicExtensions(): Extension[] {
    const { settings } = this;
    const resolved = resolveClassNames(settings.classNames);
    const disabledSet = new Set(settings.disabledPlugins);
    const canEditDocument = settings.editable && settings.mode !== 'preview';

    const allPlugins = [...BUILT_IN_PLUGINS, ...settings.plugins];
    const renderContext = {
      theme: settings.theme === 'dark' ? 'dark' as const : 'light' as const,
      mode: settings.mode,
      codeHighlighter: settings.codeHighlighter,
      imageRenderer: settings.imageRenderer,
      onLinkClick: settings.onLinkClick,
    };
    const pluginExtensions = settings.mode === 'markdown'
      ? []
      : allPlugins
        .filter((p) => !disabledSet.has(p.id))
        .flatMap((p) => p.extensions(resolved, renderContext));

    return [
      // Theme
      ...buildCmTheme(settings.theme),
      // Editability
      EditorView.editable.of(canEditDocument),
      EditorState.readOnly.of(!canEditDocument),
      // Placeholder
      ...(settings.placeholder ? [cmPlaceholder(settings.placeholder)] : []),
      // All plugin extensions
      ...pluginExtensions,
      ...(settings.bidi ? [biDirectionalTextExtension] : []),
      // Consumer's extra extensions (last, so they can override)
      ...settings.extraExtensions,
    ];
  }

  // ── Public: update settings without destroying the view ───────────────

  updateSettings(newSettings: ControllerSettings) {
    const effects: StateEffect<unknown>[] = [];

    const keymapChanged =
      newSettings.tabIndents !== this.settings.tabIndents ||
      newSettings.keymap !== this.settings.keymap;

    // Check if autosize needs reconfiguring
    if (
      newSettings.minRows !== this.settings.minRows ||
      newSettings.maxRows !== this.settings.maxRows
    ) {
      effects.push(
        this.autosizeCompartment.reconfigure(
          autosizeExtension(newSettings.minRows, newSettings.maxRows),
        ),
      );
    }

    if (newSettings.editorClassName !== this.settings.editorClassName) {
      effects.push(
        this.editorClassNameCompartment.reconfigure(
          editorClassNameExtension(newSettings.editorClassName),
        ),
      );
    }

    if (keymapChanged) {
      effects.push(
        this.keymapCompartment.reconfigure(this.buildKeymap(newSettings)),
      );
    }

    this.settings = newSettings;

    // Always reconfigure dynamic compartment (cheap if nothing changed)
    effects.push(
      this.dynamicCompartment.reconfigure(this.buildDynamicExtensions()),
    );

    if (effects.length > 0) {
      this.view.dispatch({ effects });
    }
  }

  // ── NeutrinoHandle implementation ─────────────────────────────────────

  getContent(): string {
    return this.view.state.doc.toString();
  }

  setContent(value: string): void {
    const current = this.view.state.doc.toString();
    if (value === current) return;

    const { state } = this.view;
    const clamp = (pos: number) => Math.max(0, Math.min(pos, value.length));
    const nextRanges = state.selection.ranges.map((range) =>
      EditorSelection.range(clamp(range.anchor), clamp(range.head)),
    );
    this.view.dispatch({
      changes: { from: 0, to: state.doc.length, insert: value },
      selection: EditorSelection.create(nextRanges, state.selection.mainIndex),
    });
  }

  insertText(text: string): void {
    this.view.dispatch(this.view.state.replaceSelection(text));
  }

  focus(): void {
    this.view.focus();
  }

  blur(): void {
    this.view.contentDOM.blur();
  }

  select(anchor: number, head?: number): void {
    const len = this.view.state.doc.length;
    const a = Math.max(0, Math.min(anchor, len));
    const h = Math.max(0, Math.min(head ?? anchor, len));
    this.view.dispatch({
      selection: EditorSelection.range(a, h),
    });
  }

  getSelection() {
    const sel = this.view.state.selection.main;
    return { from: sel.from, to: sel.to, anchor: sel.anchor, head: sel.head };
  }

  execCommand(name: string, ...args: unknown[]): unknown {
    if (this.customCommands.has(name)) {
      return this.customCommands.get(name)!(this.view, ...args);
    }
    const builtin = BUILTIN_COMMANDS[name as keyof typeof BUILTIN_COMMANDS];
    if (builtin) {
      return builtin(this.view, ...args);
    }
    console.warn(`[NeutrinoEditor] Unknown command: ${name}`);
    return undefined;
  }

  registerCommand(name: string, fn: CommandFn): void {
    this.customCommands.set(name, fn);
  }

  undo(): void {
    this.execCommand('undo');
  }

  redo(): void {
    this.execCommand('redo');
  }

  scrollTo(fraction: number): void {
    const { scrollHeight, clientHeight } = this.view.scrollDOM;
    const max = scrollHeight - clientHeight;
    this.view.scrollDOM.scrollTop = fraction * max;
  }

  scrollSelectionIntoView(): void {
    this.view.dispatch({ scrollIntoView: true });
  }

  addExtension(ext: Extension): { remove: () => void } {
    const id = Symbol('runtimeExtension');
    this.runtimeExtensions.set(id, ext);
    this.reconfigureRuntimeExtensions();
    return {
      remove: () => {
        if (!this.runtimeExtensions.delete(id)) return;
        this.reconfigureRuntimeExtensions();
      },
    };
  }

  private reconfigureRuntimeExtensions(): void {
    this.view.dispatch({
      effects: this.runtimeExtensionsCompartment.reconfigure(
        Array.from(this.runtimeExtensions.values()),
      ),
    });
  }

  /** Clean up the editor view. */
  destroy(): void {
    this.dispatchSelectionChange.cancel();
    this.dispatchScroll.cancel();
    this.view.destroy();
  }
}
