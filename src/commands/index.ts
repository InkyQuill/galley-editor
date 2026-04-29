import type { BuiltinCommand, CommandFn } from '../types';
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
import { makeSmartBackspaceTransaction } from './smartBackspace';
import { makeSmartEnterTransaction } from './smartEnter';
import { makeSmartTabTransaction } from './smartTab';
export { makeSmartBackspaceTransaction, makeSmartEnterTransaction, makeSmartTabTransaction };

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
  undo: undoCommand,
  redo: redoCommand,
  selectAll: selectAllCommand,
};
