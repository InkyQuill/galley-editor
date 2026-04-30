// Component exports
export { default as NeutrinoEditor } from './NeutrinoEditor';
export { default as ErrorBoundary } from './ErrorBoundary';
export { useNeutrino } from '../hooks/useNeutrino';

// Types
export type {
  NeutrinoEditorProps,
  NeutrinoHandle,
  NeutrinoPlugin,
  NeutrinoPluginSpec,
  NeutrinoClassNames,
  NeutrinoMode,
  NeutrinoToolbarOptions,
  NeutrinoToolbarContext,
  NeutrinoToolbarSlot,
  NeutrinoFooterOptions,
  NeutrinoFooterContext,
  NeutrinoFooterSlot,
  NeutrinoSurfaceOptions,
  ToolbarIconName,
  ToolbarIconRenderer,
  CodeHighlighter,
  BuiltinCommand,
  CommandFn,
  FindOpts,
  FindResult,
  RevealStrategy,
  ImageRenderer,
  LinkClickHandler,
  UseNeutrinoOptions,
  UseNeutrinoResult,
} from '../types';

// Rendering engine (for building custom plugins)
export { makeInlinePlugin, makeBlockPlugin, nodeIntersectsSelection, HIDE_DECORATION, BLOCK_CURSOR_LINE_PROXIMITY } from '../rendering';

// Built-in plugins (for selective inclusion)
export { BUILT_IN_PLUGINS } from '../plugins';
export {
  headingsPlugin,
  emphasisPlugin,
  codeInlinePlugin,
  codeFencePlugin,
  blockquotePlugin,
  linksPlugin,
  imagesPlugin,
  listsPlugin,
  checkboxesPlugin,
  dividersPlugin,
  tablesPlugin,
} from '../plugins';

// Built-in commands
export {
  BUILTIN_COMMANDS,
  BUILTIN_COMMAND_NAMES,
  DEFAULT_KEYMAP,
  duplicateLine,
  sortSelectedLines,
  swapLineUp,
  swapLineDown,
  insertLineAfter,
  insertLineBefore,
  jumpToHash,
  slugifyHeading,
  findInDocument,
} from '../commands';
export type {
  NeutrinoKeyBinding,
  SortSelectedLinesOptions,
} from '../commands';
