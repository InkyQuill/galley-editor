import { syntaxTree } from '@codemirror/language';
import type { EditorState } from '@codemirror/state';

export type TextStyleOption = 'normal' | `h${1 | 2 | 3 | 4 | 5 | 6}`;

const formatNodes = {
  StrongEmphasis: 'toggleBold',
  Emphasis: 'toggleItalic',
  Strikethrough: 'toggleStrikethrough',
  InlineCode: 'toggleCode',
  BulletList: 'toggleBulletList',
  OrderedList: 'toggleOrderedList',
  Task: 'toggleCheckList',
} as const;

export function createToolbarFormat() {
  const listeners = new Set<() => void>();
  let textStyle: TextStyleOption = 'normal';
  let inCode = false;
  let commands = new Set<string>();

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    getTextStyle: () => textStyle,
    isInCode: () => inCode,
    hasCommand: (command: string) => commands.has(command),
    update(state: EditorState) {
      const head = state.selection.main.head;
      const tree = syntaxTree(state);
      let nextStyle: TextStyleOption = 'normal';
      let nextInCode = false;
      const nextCommands = new Set<string>();

      // Bias both directions to include a caret immediately before or after
      // a node. Use the line boundary to avoid including the previous line.
      const line = state.doc.lineAt(head);
      let block = tree.resolveInner(head, 0);
      while (block.parent) {
        if (block.name === 'FencedCode' || block.name === 'CodeBlock') nextInCode = true;
        block = block.parent;
      }
      for (const side of [-1, 1] as const) {
        if ((side === -1 && head === line.from) || (side === 1 && head === line.to)) continue;
        let node = tree.resolveInner(head, side);
        for (;;) {
          if (node.name.startsWith('ATXHeading')) {
            nextStyle = `h${node.name.at(-1)}` as TextStyleOption;
          }
          if (node.name === 'FencedCode' || node.name === 'CodeBlock') nextInCode = true;
          const command = formatNodes[node.name as keyof typeof formatNodes];
          if (command) nextCommands.add(command);
          if (!node.parent) break;
          node = node.parent;
        }
      }

      if (textStyle === nextStyle && inCode === nextInCode &&
          commands.size === nextCommands.size && [...commands].every((command) => nextCommands.has(command))) return;
      textStyle = nextStyle;
      inCode = nextInCode;
      commands = nextCommands;
      listeners.forEach((listener) => listener());
    },
  };
}

export type ToolbarFormat = ReturnType<typeof createToolbarFormat>;
