import { Decoration, type DecorationSet, EditorView, WidgetType } from '@codemirror/view';
import { type EditorState, type Range, StateField } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import { BLOCK_CURSOR_LINE_PROXIMITY } from '../rendering';
import type {
  CodeHighlighter,
  NeutrinoPlugin,
  NeutrinoClassNames,
  NeutrinoRenderContext,
} from '../types';

/**
 * Code fence plugin using a custom StateField to replace inactive fenced code
 * blocks with a visual widget.
 */

interface ParsedFence {
  code: string;
  language: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function defaultHighlight(code: string): string {
  const escaped = escapeHtml(code);
  return escaped
    .replace(
      /\b(const|let|var|function|return|if|else|for|while|interface|type|class|extends|import|export|from|async|await|new|true|false|null|undefined)\b/g,
      '<span class="ne-token-keyword">$1</span>',
    )
    .replace(/(&quot;.*?&quot;|'.*?'|`.*?`)/g, '<span class="ne-token-string">$1</span>')
    .replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="ne-token-number">$1</span>')
    .replace(/(\/\/.*)$/gm, '<span class="ne-token-comment">$1</span>');
}

function parseFence(raw: string): ParsedFence {
  const lines = raw.split('\n');
  const opening = lines[0] ?? '';
  const openingMatch = /^(`{3,}|~{3,})\s*([^\s`]*)/.exec(opening);
  const language = openingMatch?.[2]?.trim() || 'text';
  const closingIndex = lines.length > 1 && /^(`{3,}|~{3,})\s*$/.test(lines[lines.length - 1])
    ? lines.length - 1
    : lines.length;
  return {
    language,
    code: lines.slice(1, closingIndex).join('\n'),
  };
}

function highlightedContent(
  highlighter: CodeHighlighter | undefined,
  parsed: ParsedFence,
  theme: 'light' | 'dark',
): string | HTMLElement {
  return highlighter?.({ code: parsed.code, language: parsed.language, theme }) ??
    defaultHighlight(parsed.code);
}

class CodeFenceWidget extends WidgetType {
  private readonly parsed: ParsedFence;
  private readonly blockClass: string;
  private readonly context: NeutrinoRenderContext;

  constructor(
    parsed: ParsedFence,
    blockClass: string,
    context: NeutrinoRenderContext,
  ) {
    super();
    this.parsed = parsed;
    this.blockClass = blockClass;
    this.context = context;
  }

  eq(other: CodeFenceWidget): boolean {
    return (
      other.parsed.code === this.parsed.code &&
      other.parsed.language === this.parsed.language &&
      other.context.theme === this.context.theme &&
      other.context.codeHighlighter === this.context.codeHighlighter
    );
  }

  toDOM(): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = `ne-code-block ${this.blockClass}`;

    const header = document.createElement('div');
    header.className = 'ne-code-block-header';

    const language = document.createElement('span');
    language.className = 'ne-code-language';
    language.textContent = this.parsed.language;

    const copy = document.createElement('button');
    copy.className = 'ne-code-copy';
    copy.type = 'button';
    copy.textContent = 'Copy';
    copy.addEventListener('mousedown', (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
    copy.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const write = navigator.clipboard?.writeText(this.parsed.code);
      void write
        ?.then(() => {
          copy.textContent = 'Copied';
        })
        .catch(() => {
          copy.textContent = 'Failed';
        });
    });

    header.append(language, copy);

    const pre = document.createElement('pre');
    pre.className = 'ne-code-body';
    const code = document.createElement('code');
    const highlighted = highlightedContent(
      this.context.codeHighlighter,
      this.parsed,
      this.context.theme,
    );
    if (typeof highlighted === 'string') {
      code.innerHTML = highlighted;
    } else {
      code.append(highlighted);
    }
    pre.append(code);

    wrapper.append(header, pre);
    return wrapper;
  }

  ignoreEvent(event: Event): boolean {
    const target = event.target;
    if (!(target instanceof Element)) return false;
    return target.closest('.ne-code-block-header') !== null;
  }
}

function buildCodeFenceDecorations(
  state: EditorState,
  blockClass: string,
  context: NeutrinoRenderContext,
): DecorationSet {
  const doc = state.doc;
  const cursorLine = doc.lineAt(state.selection.main.anchor);
  const widgets: Range<Decoration>[] = [];

  syntaxTree(state).iterate({
    enter: (node) => {
      if (node.name !== 'FencedCode') return;

      const nodeLineFrom = doc.lineAt(node.from);
      const nodeLineTo = doc.lineAt(node.to);

      // Hide when cursor is near the block
      const isNear =
        Math.abs(nodeLineFrom.number - cursorLine.number) <= BLOCK_CURSOR_LINE_PROXIMITY ||
        Math.abs(nodeLineTo.number - cursorLine.number) <= BLOCK_CURSOR_LINE_PROXIMITY;

      // Check if cursor is inside the block
      const sel = state.selection.main;
      const isInside =
        (sel.from >= node.from && sel.from <= node.to) ||
        (sel.to >= node.from && sel.to <= node.to);

      if (isNear || isInside) return;

      const raw = state.sliceDoc(node.from, node.to);
      const parsed = parseFence(raw);
      const widget = new CodeFenceWidget(parsed, blockClass, context);
      widgets.push(
        Decoration.replace({ widget, block: true }).range(node.from, node.to),
      );
    },
  });

  return Decoration.set(widgets, true);
}

const codeFencePlugin: NeutrinoPlugin = {
  id: 'ne:code-fence',
  extensions(classNames: NeutrinoClassNames, context = { theme: 'light' as const }) {
    const blockClass = classNames.blockCode ?? 'ne-code-fence';

    const field = StateField.define<DecorationSet>({
      create(state) {
        return buildCodeFenceDecorations(state, blockClass, context);
      },
      update(decos, tr) {
        decos = decos.map(tr.changes);
        const selectionChanged = !tr.newSelection.eq(tr.startState.selection);
        const treeChanged = syntaxTree(tr.state) !== syntaxTree(tr.startState);

        if (tr.docChanged || selectionChanged || treeChanged) {
          decos = buildCodeFenceDecorations(tr.state, blockClass, context);
        }
        return decos;
      },
      provide: (f) => EditorView.decorations.from(f),
    });

    return [field];
  },
};

export default codeFencePlugin;
