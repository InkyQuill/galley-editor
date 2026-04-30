import type { KeyBinding } from '@codemirror/view';
import type { BuiltinCommand, CommandFn, FindOpts } from '../types';
import { toggleBold, toggleCode, toggleItalic, toggleStrikethrough } from './inline';
import {
  toggleBulletList,
  toggleCheckList,
  toggleHeading,
  toggleOrderedList,
} from './block';
import {
  insertCodeBlock,
  insertHr,
  insertImage,
  insertLink,
  insertTable,
} from './insert';
import { indent, outdent, redoCommand, selectAllCommand, undoCommand } from './editing';
import { duplicateLine } from './editing/duplicateLine';
import { insertLineAfter, insertLineBefore } from './editing/insertLine';
import { sortSelectedLines } from './editing/sortSelectedLines';
import { swapLineDown, swapLineUp } from './editing/swapLine';
import { findInDocument } from './navigation/findInDocument';
import { jumpToHash } from './navigation/jumpToHash';
import { makeSmartBackspaceTransaction } from './smartBackspace';
import { makeSmartEnterTransaction } from './smartEnter';
import { makeSmartTabTransaction } from './smartTab';
export { makeSmartBackspaceTransaction, makeSmartEnterTransaction, makeSmartTabTransaction };
export { duplicateLine } from './editing/duplicateLine';
export { insertLineAfter, insertLineBefore } from './editing/insertLine';
export { sortSelectedLines, type SortSelectedLinesOptions } from './editing/sortSelectedLines';
export { swapLineDown, swapLineUp } from './editing/swapLine';
export { findInDocument } from './navigation/findInDocument';
export { jumpToHash, slugifyHeading } from './navigation/jumpToHash';

export type GalleyKeyBinding = KeyBinding & {
  command?: BuiltinCommand;
  args?: unknown[];
  description?: string;
};

function commandBinding(
  key: string,
  command: BuiltinCommand,
  description: string,
  ...args: unknown[]
): GalleyKeyBinding {
  return {
    key,
    command,
    args,
    description,
    run: (view) => BUILTIN_COMMANDS[command](view, ...args) !== false,
  };
}

export const DEFAULT_KEYMAP: GalleyKeyBinding[] = [
  commandBinding('Mod-d', 'duplicateLine', 'Duplicate the current line or selected lines'),
  commandBinding('Alt-ArrowUp', 'swapLineUp', 'Swap the current line upward'),
  commandBinding('Alt-ArrowDown', 'swapLineDown', 'Swap the current line downward'),
  commandBinding('Mod-Alt-ArrowUp', 'insertLineBefore', 'Insert a blank line before the current line'),
  commandBinding('Mod-Alt-ArrowDown', 'insertLineAfter', 'Insert a blank line after the current line'),
  commandBinding('Mod-K', 'insertLink', 'Insert a markdown link'),
  commandBinding('Mod-b', 'toggleBold', 'Toggle bold formatting'),
  commandBinding('Mod-i', 'toggleItalic', 'Toggle italic formatting'),
  commandBinding('Mod-z', 'undo', 'Undo the last change'),
  commandBinding('Mod-Shift-z', 'redo', 'Redo the last undone change'),
  commandBinding('Mod-a', 'selectAll', 'Select the entire document'),
];

export const BUILTIN_COMMANDS: Record<BuiltinCommand, CommandFn> = {
  toggleBold,
  toggleItalic,
  toggleCode,
  toggleStrikethrough,
  toggleHeading,
  toggleBulletList,
  toggleOrderedList,
  toggleCheckList,
  insertLink,
  insertImage,
  insertCodeBlock,
  insertTable,
  insertHr,
  indent,
  outdent,
  duplicateLine,
  sortSelectedLines,
  swapLineUp,
  swapLineDown,
  insertLineAfter,
  insertLineBefore,
  jumpToHash: (view, hash) => typeof hash === 'string' && jumpToHash(view, hash),
  findInDocument: (view, needle, opts) =>
    typeof needle === 'string' ? findInDocument(view, needle, opts as FindOpts) : [],
  undo: undoCommand,
  redo: redoCommand,
  selectAll: selectAllCommand,
};

export const BUILTIN_COMMAND_NAMES = Object.keys(BUILTIN_COMMANDS) as BuiltinCommand[];
