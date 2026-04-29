import { describe, it, expect, afterEach } from 'vitest';
import { EditorState, EditorSelection } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import { history } from '@codemirror/commands';
import { BUILTIN_COMMANDS } from './commands';

// ── Helpers ────────────────────────────────────────────────────────────────

function createView(doc: string, cursor?: number): EditorView {
  const state = EditorState.create({
    doc,
    extensions: [markdown(), history()],
    selection: { anchor: cursor ?? doc.length },
  });
  return new EditorView({ state });
}

function createViewWithSelection(
  doc: string,
  from: number,
  to: number,
): EditorView {
  const state = EditorState.create({
    doc,
    extensions: [markdown(), history()],
    selection: EditorSelection.range(from, to),
  });
  return new EditorView({ state });
}

function docOf(view: EditorView): string {
  return view.state.doc.toString();
}

function cursorOf(view: EditorView): number {
  return view.state.selection.main.head;
}

let activeView: EditorView | null = null;

function tracked(view: EditorView): EditorView {
  activeView = view;
  return view;
}

afterEach(() => {
  activeView?.destroy();
  activeView = null;
});

// ── Inline formatting ──────────────────────────────────────────────────────

describe('toggleBold', () => {
  it('wraps cursor position with ** markers', () => {
    const view = tracked(createView('hello', 5));
    BUILTIN_COMMANDS.toggleBold(view);
    expect(docOf(view)).toBe('hello****');
  });

  it('wraps selected text with ** markers', () => {
    const view = tracked(createViewWithSelection('hello world', 0, 5));
    BUILTIN_COMMANDS.toggleBold(view);
    expect(docOf(view)).toBe('**hello** world');
  });

  it('removes ** markers when toggled off with selection', () => {
    const view = tracked(createViewWithSelection('**hello** world', 0, 9));
    BUILTIN_COMMANDS.toggleBold(view);
    expect(docOf(view)).toBe('hello world');
  });

  it('removes ** markers when cursor is right after opening **', () => {
    const view = tracked(createView('****', 2));
    BUILTIN_COMMANDS.toggleBold(view);
    // Cursor should jump past the closing **
    expect(cursorOf(view)).toBe(4);
  });

  it('preserves surrounding text', () => {
    const view = tracked(createViewWithSelection('aaa bbb ccc', 4, 7));
    BUILTIN_COMMANDS.toggleBold(view);
    expect(docOf(view)).toBe('aaa **bbb** ccc');
  });
});

describe('toggleItalic', () => {
  it('wraps cursor position with * markers', () => {
    const view = tracked(createView('hello', 5));
    BUILTIN_COMMANDS.toggleItalic(view);
    expect(docOf(view)).toBe('hello**');
  });

  it('wraps selected text with * markers', () => {
    const view = tracked(createViewWithSelection('hello world', 0, 5));
    BUILTIN_COMMANDS.toggleItalic(view);
    expect(docOf(view)).toBe('*hello* world');
  });

  it('removes * markers when toggled off with selection', () => {
    const view = tracked(createViewWithSelection('*hello* world', 0, 7));
    BUILTIN_COMMANDS.toggleItalic(view);
    expect(docOf(view)).toBe('hello world');
  });

  it('handles cursor between ** ** (bold context)', () => {
    // When cursor is between ** and **, the special bold-italic handler
    // inserts ** to create bold-italic, resulting in 6 stars total
    const view = tracked(createView('****', 2));
    BUILTIN_COMMANDS.toggleItalic(view);
    expect(docOf(view)).toBe('******');
    expect(cursorOf(view)).toBe(3);
  });
});

describe('toggleCode', () => {
  it('wraps cursor position with backtick markers', () => {
    const view = tracked(createView('hello', 5));
    BUILTIN_COMMANDS.toggleCode(view);
    expect(docOf(view)).toBe('hello``');
  });

  it('wraps selected text with backtick markers', () => {
    const view = tracked(createViewWithSelection('hello world', 0, 5));
    BUILTIN_COMMANDS.toggleCode(view);
    expect(docOf(view)).toBe('`hello` world');
  });

  it('removes backticks when toggled off', () => {
    const view = tracked(createViewWithSelection('`hello` world', 0, 7));
    BUILTIN_COMMANDS.toggleCode(view);
    expect(docOf(view)).toBe('hello world');
  });
});

describe('toggleStrikethrough', () => {
  it('wraps cursor position with ~~ markers', () => {
    const view = tracked(createView('hello', 5));
    BUILTIN_COMMANDS.toggleStrikethrough(view);
    expect(docOf(view)).toBe('hello~~~~');
  });

  it('wraps selected text with ~~ markers', () => {
    const view = tracked(createViewWithSelection('hello world', 0, 5));
    BUILTIN_COMMANDS.toggleStrikethrough(view);
    expect(docOf(view)).toBe('~~hello~~ world');
  });

  it('removes ~~ markers when toggled off', () => {
    const view = tracked(createViewWithSelection('~~hello~~ world', 0, 9));
    BUILTIN_COMMANDS.toggleStrikethrough(view);
    expect(docOf(view)).toBe('hello world');
  });
});

// ── Headings ───────────────────────────────────────────────────────────────

describe('headings', () => {
  it('toggleHeading adds # prefix', () => {
    const view = tracked(createView('hello', 3));
    BUILTIN_COMMANDS.toggleHeading(view, 1);
    expect(docOf(view)).toBe('# hello');
  });

  it('toggleHeading removes # prefix when toggled off', () => {
    const view = tracked(createView('# hello', 4));
    BUILTIN_COMMANDS.toggleHeading(view, 1);
    expect(docOf(view)).toBe('hello');
  });

  it('toggleHeading adds ## prefix', () => {
    const view = tracked(createView('hello', 3));
    BUILTIN_COMMANDS.toggleHeading(view, 2);
    expect(docOf(view)).toBe('## hello');
  });

  it('toggleHeading removes ## prefix when toggled off', () => {
    const view = tracked(createView('## hello', 5));
    BUILTIN_COMMANDS.toggleHeading(view, 2);
    expect(docOf(view)).toBe('hello');
  });

  it('toggleHeading adds ### prefix', () => {
    const view = tracked(createView('hello', 3));
    BUILTIN_COMMANDS.toggleHeading(view, 3);
    expect(docOf(view)).toBe('### hello');
  });

  it('toggleHeading replaces # with ## (upgrades heading level)', () => {
    const view = tracked(createView('# hello', 4));
    BUILTIN_COMMANDS.toggleHeading(view, 2);
    expect(docOf(view)).toBe('## hello');
  });

  it('toggleHeading replaces ## with # (downgrades heading level)', () => {
    const view = tracked(createView('## hello', 5));
    BUILTIN_COMMANDS.toggleHeading(view, 1);
    expect(docOf(view)).toBe('# hello');
  });

  it('toggleHeading treats seven hashes as plain content', () => {
    const view = tracked(createView('####### hello', 5));
    BUILTIN_COMMANDS.toggleHeading(view, 1);
    expect(docOf(view)).toBe('# ####### hello');
  });

  it.each(
    Array.from({ length: 6 }, (_, sourceIndex) =>
      Array.from({ length: 6 }, (_, targetIndex) => [
        sourceIndex + 1,
        targetIndex + 1,
      ] as const),
    ).flat().filter(([sourceLevel, targetLevel]) => sourceLevel !== targetLevel),
  )(
    'toggleHeading%s to heading%s replaces the source prefix',
    (sourceLevel, targetLevel) => {
      const sourcePrefix = '#'.repeat(sourceLevel);
      const targetPrefix = '#'.repeat(targetLevel);
      const view = tracked(createView(`${sourcePrefix} hello`, sourcePrefix.length + 2));
      BUILTIN_COMMANDS.toggleHeading(view, targetLevel);

      expect(docOf(view)).toBe(`${targetPrefix} hello`);
    },
  );

  it('toggleHeading adds #### prefix', () => {
    const view = tracked(createView('hello'));
    BUILTIN_COMMANDS.toggleHeading(view, 4);
    expect(docOf(view)).toBe('#### hello');
  });

  it('toggleHeading adds ##### prefix', () => {
    const view = tracked(createView('hello'));
    BUILTIN_COMMANDS.toggleHeading(view, 5);
    expect(docOf(view)).toBe('##### hello');
  });

  it('toggleHeading adds ###### prefix', () => {
    const view = tracked(createView('hello'));
    BUILTIN_COMMANDS.toggleHeading(view, 6);
    expect(docOf(view)).toBe('###### hello');
  });

  it('applies heading to multiple selected lines', () => {
    const view = tracked(createViewWithSelection('hello\nworld', 0, 11));
    BUILTIN_COMMANDS.toggleHeading(view, 1);
    expect(docOf(view)).toBe('# hello\n# world');
  });
});

// ── Lists ──────────────────────────────────────────────────────────────────

describe('toggleBulletList', () => {
  it('adds - prefix to line', () => {
    const view = tracked(createView('hello', 3));
    BUILTIN_COMMANDS.toggleBulletList(view);
    expect(docOf(view)).toBe('- hello');
  });

  it('removes - prefix when toggled off', () => {
    const view = tracked(createView('- hello', 4));
    BUILTIN_COMMANDS.toggleBulletList(view);
    expect(docOf(view)).toBe('hello');
  });

  it('applies to multiple selected lines', () => {
    const view = tracked(createViewWithSelection('hello\nworld', 0, 11));
    BUILTIN_COMMANDS.toggleBulletList(view);
    expect(docOf(view)).toBe('- hello\n- world');
  });

  it('removes from multiple selected lines', () => {
    const view = tracked(createViewWithSelection('- hello\n- world', 0, 15));
    BUILTIN_COMMANDS.toggleBulletList(view);
    expect(docOf(view)).toBe('hello\nworld');
  });

  it('does not match checkbox lines as bullet list', () => {
    // The regex /^\s*[-*]\s(?!\[)/ excludes checkboxes
    const view = tracked(createView('- [ ] task', 5));
    BUILTIN_COMMANDS.toggleBulletList(view);
    // Does not strip the checkbox prefix; instead adds - in front
    expect(docOf(view)).toBe('- - [ ] task');
  });
});

describe('toggleOrderedList', () => {
  it('adds 1. prefix to line', () => {
    const view = tracked(createView('hello', 3));
    BUILTIN_COMMANDS.toggleOrderedList(view);
    expect(docOf(view)).toBe('1. hello');
  });

  it('removes numbered prefix when toggled off', () => {
    const view = tracked(createView('1. hello', 5));
    BUILTIN_COMMANDS.toggleOrderedList(view);
    expect(docOf(view)).toBe('hello');
  });

  it('applies to multiple selected lines', () => {
    const view = tracked(createViewWithSelection('hello\nworld', 0, 11));
    BUILTIN_COMMANDS.toggleOrderedList(view);
    expect(docOf(view)).toBe('1. hello\n2. world');
  });
});

describe('toggleCheckList', () => {
  it('adds - [ ] prefix to line', () => {
    const view = tracked(createView('task', 2));
    BUILTIN_COMMANDS.toggleCheckList(view);
    expect(docOf(view)).toBe('- [ ] task');
  });

  it('removes - [ ] prefix when toggled off', () => {
    const view = tracked(createView('- [ ] task', 6));
    BUILTIN_COMMANDS.toggleCheckList(view);
    expect(docOf(view)).toBe('task');
  });

  it('removes - [x] prefix when toggled off', () => {
    const view = tracked(createView('- [x] task', 6));
    BUILTIN_COMMANDS.toggleCheckList(view);
    expect(docOf(view)).toBe('task');
  });

  it('applies to multiple selected lines', () => {
    const view = tracked(createViewWithSelection('task1\ntask2', 0, 11));
    BUILTIN_COMMANDS.toggleCheckList(view);
    expect(docOf(view)).toBe('- [ ] task1\n- [ ] task2');
  });
});

// ── Insert commands ────────────────────────────────────────────────────────

describe('insertLink', () => {
  it('inserts empty link at cursor', () => {
    const view = tracked(createView('hello ', 6));
    BUILTIN_COMMANDS.insertLink(view);
    expect(docOf(view)).toBe('hello []()');
  });

  it('inserts link with label and URL', () => {
    const view = tracked(createView('', 0));
    BUILTIN_COMMANDS.insertLink(view, 'Click', 'https://example.com');
    expect(docOf(view)).toBe('[Click](https://example.com)');
  });

  it('inserts link with only URL', () => {
    const view = tracked(createView('', 0));
    BUILTIN_COMMANDS.insertLink(view, '', 'https://example.com');
    expect(docOf(view)).toBe('[](https://example.com)');
  });
});

describe('insertImage', () => {
  it('inserts empty image at cursor', () => {
    const view = tracked(createView('', 0));
    BUILTIN_COMMANDS.insertImage(view);
    expect(docOf(view)).toBe('![]()');
  });

  it('inserts image with alt and URL', () => {
    const view = tracked(createView('', 0));
    BUILTIN_COMMANDS.insertImage(view, 'alt text', 'image.png');
    expect(docOf(view)).toBe('![alt text](image.png)');
  });
});

describe('insertCodeBlock', () => {
  it('inserts empty code block', () => {
    const view = tracked(createView('', 0));
    BUILTIN_COMMANDS.insertCodeBlock(view);
    expect(docOf(view)).toBe('```\n\n```');
  });

  it('inserts code block with language', () => {
    const view = tracked(createView('', 0));
    BUILTIN_COMMANDS.insertCodeBlock(view, 'typescript');
    expect(docOf(view)).toBe('```typescript\n\n```');
  });
});

describe('insertTable', () => {
  it('inserts a markdown table', () => {
    const view = tracked(createView('', 0));
    BUILTIN_COMMANDS.insertTable(view);
    expect(docOf(view)).toBe(
      '\n| Header | Header |\n|--------|--------|\n|        |        |\n',
    );
  });

  it('inserts table after existing content', () => {
    const view = tracked(createView('Some text', 9));
    BUILTIN_COMMANDS.insertTable(view);
    expect(docOf(view)).toContain('Some text');
    expect(docOf(view)).toContain('| Header | Header |');
  });
});

describe('insertHr', () => {
  it('inserts --- on empty line', () => {
    const view = tracked(createView('', 0));
    BUILTIN_COMMANDS.insertHr(view);
    expect(docOf(view)).toBe('---\n');
  });

  it('inserts --- on new line when current line has content', () => {
    const view = tracked(createView('hello', 5));
    BUILTIN_COMMANDS.insertHr(view);
    expect(docOf(view)).toBe('hello\n---\n');
  });

  it('places cursor after the hr', () => {
    const view = tracked(createView('hello', 5));
    BUILTIN_COMMANDS.insertHr(view);
    expect(cursorOf(view)).toBe(docOf(view).length);
  });
});

// ── Indent / Outdent ───────────────────────────────────────────────────────

describe('indent', () => {
  it('adds indentation to line', () => {
    const view = tracked(createView('hello', 3));
    BUILTIN_COMMANDS.indent(view);
    // Default indent unit is typically a tab or spaces
    const result = docOf(view);
    expect(result.length).toBeGreaterThan(5);
    expect(result).toMatch(/^[\t ]+hello$/);
  });

  it('indents multiple selected lines', () => {
    const view = tracked(createViewWithSelection('hello\nworld', 0, 11));
    BUILTIN_COMMANDS.indent(view);
    const lines = docOf(view).split('\n');
    expect(lines[0]).toMatch(/^[\t ]+hello$/);
    expect(lines[1]).toMatch(/^[\t ]+world$/);
  });
});

describe('outdent', () => {
  it('removes indentation from line', () => {
    const view = tracked(createView('\thello', 3));
    BUILTIN_COMMANDS.outdent(view);
    expect(docOf(view)).toBe('hello');
  });

  it('removes space-based indentation (one indent unit)', () => {
    // outdent removes up to one indent unit (default 2 spaces) at a time
    const view = tracked(createView('  hello', 4));
    BUILTIN_COMMANDS.outdent(view);
    expect(docOf(view)).toBe('hello');
  });

  it('does nothing on unindented line', () => {
    const view = tracked(createView('hello', 3));
    BUILTIN_COMMANDS.outdent(view);
    expect(docOf(view)).toBe('hello');
  });
});

// ── Undo / Redo / SelectAll ────────────────────────────────────────────────

describe('undo and redo', () => {
  it('undo reverts a change', () => {
    const view = tracked(createView('hello', 5));
    view.dispatch(view.state.replaceSelection(' world'));
    expect(docOf(view)).toBe('hello world');
    BUILTIN_COMMANDS.undo(view);
    expect(docOf(view)).toBe('hello');
  });

  it('redo restores an undone change', () => {
    const view = tracked(createView('hello', 5));
    view.dispatch(view.state.replaceSelection(' world'));
    BUILTIN_COMMANDS.undo(view);
    expect(docOf(view)).toBe('hello');
    BUILTIN_COMMANDS.redo(view);
    expect(docOf(view)).toBe('hello world');
  });
});

describe('selectAll', () => {
  it('selects the entire document', () => {
    const view = tracked(createView('hello world', 0));
    BUILTIN_COMMANDS.selectAll(view);
    const sel = view.state.selection.main;
    expect(sel.from).toBe(0);
    expect(sel.to).toBe(11);
  });
});

// ── Edge cases ─────────────────────────────────────────────────────────────

describe('edge cases', () => {
  it('toggle bold on empty document', () => {
    const view = tracked(createView('', 0));
    BUILTIN_COMMANDS.toggleBold(view);
    expect(docOf(view)).toBe('****');
    expect(cursorOf(view)).toBe(2);
  });

  it('toggle italic on empty document', () => {
    const view = tracked(createView('', 0));
    BUILTIN_COMMANDS.toggleItalic(view);
    expect(docOf(view)).toBe('**');
    expect(cursorOf(view)).toBe(1);
  });

  it('toggle bold trims surrounding whitespace in selection', () => {
    const view = tracked(createViewWithSelection('  hello  ', 0, 9));
    BUILTIN_COMMANDS.toggleBold(view);
    // Should wrap trimmed content, preserving outer whitespace
    expect(docOf(view)).toBe('  **hello**  ');
  });

  it('heading on multiline with empty lines', () => {
    const view = tracked(createViewWithSelection('hello\n\nworld', 0, 12));
    BUILTIN_COMMANDS.toggleHeading(view, 1);
    // matchEmpty is true for headings, so empty lines also get prefix
    expect(docOf(view)).toBe('# hello\n# \n# world');
  });

  it('all toggle commands return true', () => {
    const view = tracked(createView('hello', 3));
    expect(BUILTIN_COMMANDS.toggleBold(view)).toBe(true);
    expect(BUILTIN_COMMANDS.toggleItalic(view)).toBe(true);
    expect(BUILTIN_COMMANDS.toggleCode(view)).toBe(true);
    expect(BUILTIN_COMMANDS.toggleStrikethrough(view)).toBe(true);
    expect(BUILTIN_COMMANDS.toggleHeading(view, 1)).toBe(true);
    expect(BUILTIN_COMMANDS.toggleBulletList(view)).toBe(true);
    expect(BUILTIN_COMMANDS.toggleOrderedList(view)).toBe(true);
    expect(BUILTIN_COMMANDS.toggleCheckList(view)).toBe(true);
    expect(BUILTIN_COMMANDS.insertLink(view)).toBe(true);
    expect(BUILTIN_COMMANDS.insertImage(view)).toBe(true);
    expect(BUILTIN_COMMANDS.insertCodeBlock(view)).toBe(true);
    expect(BUILTIN_COMMANDS.insertTable(view)).toBe(true);
    expect(BUILTIN_COMMANDS.insertHr(view)).toBe(true);
    expect(BUILTIN_COMMANDS.indent(view)).toBe(true);
    expect(BUILTIN_COMMANDS.outdent(view)).toBe(true);
  });
});
