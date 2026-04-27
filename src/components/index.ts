// Component exports
export { default as NeutrinoEditor } from './NeutrinoEditor';
export { default as ErrorBoundary } from './ErrorBoundary';

// Types
export type {
  NeutrinoEditorProps,
  NeutrinoHandle,
  NeutrinoPlugin,
  NeutrinoPluginSpec,
  NeutrinoClassNames,
  BuiltinCommand,
  CommandFn,
  RevealStrategy,
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
  listsPlugin,
  checkboxesPlugin,
  dividersPlugin,
  tablesPlugin,
} from '../plugins';

// Built-in commands
export { BUILTIN_COMMANDS } from '../commands';
