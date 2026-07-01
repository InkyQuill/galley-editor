"use client";

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
  GalleyTableControlIcon,
  GalleyTableControlIconName,
  GalleyTableControlIconRenderer,
  GalleyTableControlIcons,
  GalleyFileSource,
  GalleySelectionInfo,
  GalleyFileStatusPhase,
  GalleyFileStatusUpdate,
  GalleyFileStatus,
  GalleyUploadInfo,
  GalleyUploadInteraction,
  UploadPlaceholderRenderer,
  DropIndicatorRenderer,
  UploadOverlayRenderer,
  GalleyFileReporter,
  GalleyFileInput,
  GalleyFileHandlerResult,
  GalleyFileHandler,
  GalleyImageInfo,
  GalleyMissingImageInfo,
  GalleyImageMetadataInput,
  MissingImageRenderer,
  ImageControlsRenderer,
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
export type {
  GalleyTable,
  GalleyTableCell,
  TableAlignment,
  TableCellRef,
} from '../table-markdown';

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
  updateImageMetadata,
  clearImageDimensions,
  commitTableCell,
  deleteTableColumn,
  deleteTableRow,
  jumpToHash,
  slugifyHeading,
  findInDocument,
  insertTableColumnAfter,
  insertTableColumnBefore,
  insertTableRowAfter,
  insertTableRowBefore,
  normalizeTable,
  replaceTable,
  replaceTables,
  revealTableSource,
  setTableColumnAlignment,
} from '../commands';
export type {
  GalleyTableReplacement,
  GalleyKeyBinding,
  SortSelectedLinesOptions,
} from '../commands';
