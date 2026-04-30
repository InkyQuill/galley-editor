// Component exports
export { default as GalleyEditor } from './GalleyEditor';
export { default as ErrorBoundary } from './ErrorBoundary';
export { useGalley } from '../hooks/useGalley';

// Types
export type {
  GalleyEditorProps,
  GalleyHandle,
  GalleyPlugin,
  GalleyPluginSpec,
  GalleyClassNames,
  GalleyMode,
  GalleyToolbarOptions,
  GalleyToolbarContext,
  GalleyToolbarSlot,
  GalleyFooterOptions,
  GalleyFooterContext,
  GalleyFooterSlot,
  GalleySurfaceOptions,
  GalleyFileSource,
  GalleySelectionInfo,
  GalleyFileInput,
  GalleyFileHandlerResult,
  GalleyFileHandler,
  GalleyImageInfo,
  GalleyImageMetadataInput,
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
  UseGalleyOptions,
  UseGalleyResult,
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
  GalleyKeyBinding,
  SortSelectedLinesOptions,
} from '../commands';
