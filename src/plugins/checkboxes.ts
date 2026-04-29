import { Decoration, EditorView, WidgetType } from '@codemirror/view';
import { makeInlinePlugin } from '../rendering';
import type { NeutrinoPlugin, NeutrinoClassNames } from '../types';

/** @internal */
export class CheckboxWidget extends WidgetType {
  checked: boolean;
  depth: number;
  label: string;
  checkboxClass: string;

  constructor(checked: boolean, depth: number, label: string, checkboxClass: string) {
    super();
    this.checked = checked;
    this.depth = depth;
    this.label = label;
    this.checkboxClass = checkboxClass;
  }

  eq(other: CheckboxWidget) {
    return (
      other.checked === this.checked &&
      other.depth === this.depth &&
      other.label === this.label &&
      other.checkboxClass === this.checkboxClass
    );
  }

  toDOM(view: EditorView) {
    const container = document.createElement('span');
    container.className = `${this.checkboxClass} ne-depth-${this.depth}`;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = this.checked;
    checkbox.ariaLabel = this.label;
    checkbox.title = this.label;
    container.appendChild(checkbox);

    checkbox.oninput = () => {
      const pos = view.posAtDOM(container);
      const line = view.state.doc.lineAt(pos);
      const lineText = line.text;
      // Read actual DOM state, not widget state, to handle updateDOM reuse
      const isNowChecked = checkbox.checked;
      const markerMatch = /\[[ xX]\]/.exec(lineText);
      if (!markerMatch) return;
      const from = line.from + markerMatch.index;
      const to = from + markerMatch[0].length;
      const insert = isNowChecked ? '[x]' : '[ ]';
      view.dispatch({ changes: { from, to, insert } });
    };

    return container;
  }

  updateDOM(dom: HTMLElement) {
    const input = dom.querySelector('input');
    if (input) {
      dom.className = `${this.checkboxClass} ne-depth-${this.depth}`;
      input.checked = this.checked;
      input.ariaLabel = this.label;
      input.title = this.label;
      return true;
    }
    return false;
  }

  ignoreEvent() {
    return false;
  }
}

const checkboxesPlugin: NeutrinoPlugin = {
  id: 'ne:checkboxes',
  extensions(classNames: NeutrinoClassNames) {
    const checkboxClass = classNames.checkbox ?? 'ne-checkbox';
    const completedClass = classNames.completedTask ?? 'ne-completed-task';
    const completedLineDeco = Decoration.line({ class: completedClass });

    return [
      // Allow clicking checkboxes
      EditorView.domEventHandlers({
        mousedown: (event) => {
          const target = event.target as Element;
          if (
            target.nodeName === 'INPUT' &&
            target.parentElement?.classList?.contains(checkboxClass)
          ) {
            return true;
          }
          return false;
        },
      }),
      makeInlinePlugin({
        createDecoration(node, state, parentDepths) {
          if (node.name === 'TaskMarker') {
            const content = state.doc.sliceString(node.from, node.to);
            const checked = content.toLowerCase().includes('x');
            const containerLine = state.doc.lineAt(node.from);
            const label = state.doc.sliceString(node.to, containerLine.to);
            return new CheckboxWidget(
              checked,
              parentDepths.get('ListItem') ?? 0,
              label,
              checkboxClass,
            );
          }
          if (node.name === 'Task') {
            const marker = node.node.getChild('TaskMarker');
            if (marker) {
              const content = state.doc.sliceString(marker.from, marker.to);
              if (content.toLowerCase().includes('x')) {
                return completedLineDeco;
              }
            }
          }
          return null;
        },
        getDecorationRange(node, state) {
          if (node.name === 'TaskMarker') {
            const container = node.node.parent?.parent;
            const listMarker = container?.getChild('ListMark');
            if (!listMarker) return null;
            return [listMarker.from, node.to];
          }
          if (node.name === 'Task') {
            const taskLine = state.doc.lineAt(node.from);
            return [taskLine.from];
          }
          return null;
        },
        getRevealStrategy(node, state) {
          if (node.name === 'TaskMarker') {
            const container = node.node.parent?.parent;
            const listMarker = container?.getChild('ListMark');
            const selection = state.selection.main;
            const rangeFrom = listMarker ? listMarker.from : node.from;
            const rangeTo = node.to;

            const rangeContains = (pt: number) =>
              pt >= rangeFrom && pt <= rangeTo;
            const selContains = (pt: number) =>
              pt >= selection.from && pt <= selection.to;

            return (
              rangeContains(selection.from) ||
              rangeContains(selection.to) ||
              selContains(rangeFrom) ||
              selContains(rangeTo)
            );
          }
          return 'line';
        },
      }),
    ];
  },
};

export default checkboxesPlugin;
