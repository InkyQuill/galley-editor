import { Decoration, WidgetType } from '@codemirror/view';
import { makeInlinePlugin } from '../rendering';
import type { NeutrinoPlugin, NeutrinoClassNames } from '../types';

class DividerWidget extends WidgetType {
  widgetClass: string;

  constructor(widgetClass: string) {
    super();
    this.widgetClass = widgetClass;
  }

  eq(other: DividerWidget) {
    return other.widgetClass === this.widgetClass;
  }

  toDOM() {
    const hr = document.createElement('hr');
    hr.className = this.widgetClass;
    hr.setAttribute('aria-hidden', 'true');
    return hr;
  }

  ignoreEvent() {
    return true;
  }
}

const dividersPlugin: NeutrinoPlugin = {
  id: 'ne:dividers',
  extensions(classNames: NeutrinoClassNames, context) {
    const widgetClass = classNames.dividerWidget ?? 'ne-divider-widget';
    const lineClass = classNames.divider ?? 'ne-divider';
    const lineDeco = Decoration.line({ class: lineClass });
    const revealStrategy = context?.mode === 'preview' ? false : 'line';

    return [
      // Replace horizontal rule with widget
      makeInlinePlugin({
        createDecoration(node) {
          if (node.name === 'HorizontalRule') {
            return new DividerWidget(widgetClass);
          }
          return null;
        },
        getMarkRange(node) {
          return { from: node.from, to: node.to };
        },
        getRevealStrategy: () => revealStrategy,
      }),
      // Add line decoration
      makeInlinePlugin({
        createDecoration(node) {
          if (node.name === 'HorizontalRule') {
            return lineDeco;
          }
          return null;
        },
        getLineRange(node, state) {
          const line = state.doc.lineAt(node.from);
          return { from: line.from, to: line.to };
        },
      }),
    ];
  },
};

export default dividersPlugin;
