import {
  Bold, Italic, Strikethrough, CodeXml, List, ListOrdered, ListTodo,
  Link, Image, FileCode2, Table2, Minus, Undo2, Redo2, PanelsTopLeft,
  PanelTop,
} from 'lucide-react';
import type { ComponentType } from 'react';
import type { ToolbarIconName } from '../types';

const icons: Record<ToolbarIconName, ComponentType<{ className?: string; size?: number; 'aria-hidden'?: boolean }>> = {
  bold: Bold,
  italic: Italic,
  strikethrough: Strikethrough,
  inlineCode: CodeXml,
  bulletList: List,
  orderedList: ListOrdered,
  taskList: ListTodo,
  link: Link,
  image: Image,
  codeBlock: FileCode2,
  table: Table2,
  divider: Minus,
  undo: Undo2,
  redo: Redo2,
  mode: PanelsTopLeft,
};

export function ToolbarIcon({ name }: { name: ToolbarIconName }) {
  const Icon = icons[name];
  return <Icon className="ge-toolbar-icon" size={18} aria-hidden />;
}

export function ToolbarToggleIcon() {
  return <PanelTop className="ge-toolbar-icon" size={16} aria-hidden />;
}
