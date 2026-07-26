import {
  Decoration,
  EditorView,
  WidgetType,
  showTooltip,
  type Tooltip,
} from '@codemirror/view';
import { StateEffect, StateField, type EditorState } from '@codemirror/state';
import type { SyntaxNodeRef } from '@lezer/common';
import { makeInlinePlugin } from '../rendering';
import type { GalleyPlugin, GalleyClassNames } from '../types';

export interface FootnoteDefinition {
  label: string;
  /** Range of the definition text (after the `[^label]: ` prefix). */
  textFrom: number;
  textTo: number;
  text: string;
}

const FOOTNOTE_REF_RE = /^\[\^([^\s\]]+)\]$/;
const FOOTNOTE_DEF_RE = /^\[\^([^\s\]]+)\]:[ \t]?(.*)$/;

/** Label of a footnote reference Link node (`[^label]`), or null. */
export function footnoteReferenceLabel(
  state: EditorState,
  node: SyntaxNodeRef,
): string | null {
  if (node.name !== 'Link') return null;
  const match = FOOTNOTE_REF_RE.exec(state.sliceDoc(node.from, node.to));
  return match ? match[1] : null;
}

/** True when the node starts a `[^label]: text` definition line. */
export function isFootnoteDefinitionLine(
  state: EditorState,
  node: SyntaxNodeRef,
): boolean {
  const line = state.doc.lineAt(node.from);
  return node.from === line.from && FOOTNOTE_DEF_RE.test(line.text);
}

function collectFootnoteDefinitions(state: EditorState): Map<string, FootnoteDefinition> {
  const definitions = new Map<string, FootnoteDefinition>();

  for (let lineNumber = 1; lineNumber <= state.doc.lines; lineNumber++) {
    const line = state.doc.line(lineNumber);
    const match = FOOTNOTE_DEF_RE.exec(line.text);
    if (!match) continue;
    const label = match[1];
    if (definitions.has(label)) continue;
    const textFrom = line.from + (line.text.length - match[2].length);
    definitions.set(label, {
      label,
      textFrom,
      textTo: line.to,
      text: match[2],
    });
  }

  return definitions;
}

export const footnoteRegistryField = StateField.define<Map<string, FootnoteDefinition>>({
  create: collectFootnoteDefinitions,
  update(value, transaction) {
    if (!transaction.docChanged) return value;
    return collectFootnoteDefinitions(transaction.state);
  },
});

interface FootnotePopoverState {
  pos: number;
  label: string;
}

const setFootnotePopover = StateEffect.define<FootnotePopoverState | null>();

class FootnoteRefWidget extends WidgetType {
  label: string;
  refClass: string;

  constructor(label: string, refClass: string) {
    super();
    this.label = label;
    this.refClass = refClass;
  }

  eq(other: FootnoteRefWidget) {
    return other.label === this.label && other.refClass === this.refClass;
  }

  toDOM() {
    const sup = document.createElement('sup');
    sup.className = this.refClass;
    sup.dataset.geFootnote = this.label;
    sup.textContent = this.label;
    sup.setAttribute('role', 'button');
    sup.title = `Footnote ${this.label}`;
    return sup;
  }

  ignoreEvent() {
    return false;
  }
}

function footnotePopoverExtensions(canEdit: boolean, refSelectorClass: string) {
  function closePopover(view: EditorView): void {
    view.dispatch({ effects: setFootnotePopover.of(null) });
  }

  function saveDefinition(view: EditorView, label: string, text: string): void {
    const definition = view.state.field(footnoteRegistryField).get(label);
    const normalized = text.replace(/\r?\n/g, ' ').trim();

    if (definition) {
      view.dispatch({
        changes: { from: definition.textFrom, to: definition.textTo, insert: normalized },
        effects: setFootnotePopover.of(null),
      });
      return;
    }

    const doc = view.state.doc;
    const needsLeadingBreak = doc.length > 0 && doc.sliceString(doc.length - 1) !== '\n';
    view.dispatch({
      changes: {
        from: doc.length,
        insert: `${needsLeadingBreak ? '\n' : ''}[^${label}]: ${normalized}\n`,
      },
      effects: setFootnotePopover.of(null),
    });
  }

  function renderPopoverEditor(dom: HTMLElement, view: EditorView, label: string): void {
    dom.replaceChildren();

    const definition = view.state.field(footnoteRegistryField).get(label);
    const textarea = document.createElement('textarea');
    textarea.className = 'ge-footnote-popover-input';
    textarea.value = definition?.text ?? '';
    textarea.setAttribute('aria-label', `Footnote ${label} text`);
    textarea.rows = 3;

    const save = document.createElement('button');
    save.type = 'button';
    save.className = 'ge-footnote-popover-save';
    save.textContent = 'Save';
    save.onclick = () => saveDefinition(view, label, textarea.value);

    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'ge-footnote-popover-cancel';
    cancel.textContent = 'Cancel';
    cancel.onclick = () => renderPopoverContent(dom, view, label);

    textarea.addEventListener('keydown', (event) => {
      event.stopPropagation();
      if (event.key === 'Escape') {
        event.preventDefault();
        renderPopoverContent(dom, view, label);
      }
      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        saveDefinition(view, label, textarea.value);
      }
    });

    const actions = document.createElement('div');
    actions.className = 'ge-footnote-popover-actions';
    actions.append(save, cancel);
    dom.append(textarea, actions);
    textarea.focus();
  }

  function renderPopoverContent(dom: HTMLElement, view: EditorView, label: string): void {
    dom.replaceChildren();

    const definition = view.state.field(footnoteRegistryField).get(label);
    const text = document.createElement('div');
    text.className = 'ge-footnote-popover-text';
    if (definition) {
      text.textContent = definition.text;
    } else {
      text.textContent = 'No definition';
      text.classList.add('ge-footnote-popover-missing');
    }
    dom.append(text);

    if (canEdit) {
      const edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'ge-footnote-popover-edit';
      edit.textContent = 'Edit';
      edit.setAttribute('aria-label', `Edit footnote ${label}`);
      edit.onclick = () => renderPopoverEditor(dom, view, label);
      dom.append(edit);
    }
  }

  function footnoteTooltip(value: FootnotePopoverState): Tooltip {
    return {
      pos: value.pos,
      above: true,
      create(view) {
        const dom = document.createElement('div');
        dom.className = 'ge-footnote-popover';
        renderPopoverContent(dom, view, value.label);
        return { dom };
      },
    };
  }

  const popoverField = StateField.define<FootnotePopoverState | null>({
    create: () => null,
    update(value, transaction) {
      if (value && transaction.docChanged) {
        value = { ...value, pos: transaction.changes.mapPos(value.pos) };
      }
      for (const effect of transaction.effects) {
        if (effect.is(setFootnotePopover)) value = effect.value;
      }
      return value;
    },
    provide: (field) =>
      showTooltip.from(field, (value) => (value ? footnoteTooltip(value) : null)),
  });

  const clickExt = EditorView.domEventHandlers({
    click: (event, view) => {
      const target = event.target as Element | null;

      if (target?.closest('.ge-footnote-popover')) return false;

      const chip = target?.closest<HTMLElement>(`.${refSelectorClass}`);
      const open = view.state.field(popoverField);
      if (!chip) {
        if (open) closePopover(view);
        return false;
      }

      const label = chip.dataset.geFootnote;
      if (!label) return false;

      event.preventDefault();
      if (open && open.label === label) {
        closePopover(view);
        return true;
      }

      const pos = view.posAtDOM(chip);
      view.dispatch({ effects: setFootnotePopover.of({ pos, label }) });
      return true;
    },
  });

  return [popoverField, clickExt];
}

const footnotesPlugin: GalleyPlugin = {
  id: 'ge:footnotes',
  extensions(classNames: GalleyClassNames, context) {
    const preview = context?.mode === 'preview';
    const canEdit = context?.canEdit !== false && !preview;
    const refClass = classNames.footnoteRef ?? 'ge-footnote-ref';
    const refSelectorClass = refClass.split(/\s+/).find(Boolean) ?? 'ge-footnote-ref';
    const defClass = classNames.footnoteDef ?? 'ge-footnote-def';

    // Replace `[^label]` references with superscript chips
    const refExt = makeInlinePlugin({
      createDecoration(node, state) {
        const label = footnoteReferenceLabel(state, node);
        if (!label || isFootnoteDefinitionLine(state, node)) return null;
        return new FootnoteRefWidget(label, refClass);
      },
      getRevealStrategy: () => (preview ? false : 'select'),
    });

    // Style definition lines
    const defExt = makeInlinePlugin({
      createDecoration(node, state) {
        const label = footnoteReferenceLabel(state, node);
        if (!label || !isFootnoteDefinitionLine(state, node)) return null;
        return Decoration.line({ class: defClass });
      },
      getLineRange(node, state) {
        const line = state.doc.lineAt(node.from);
        return { from: line.from, to: line.to };
      },
      hideWhenNearCursor: false,
      getRevealStrategy: () => false,
    });

    return [
      footnoteRegistryField,
      refExt,
      defExt,
      ...footnotePopoverExtensions(canEdit, refSelectorClass),
    ];
  },
};

export default footnotesPlugin;
