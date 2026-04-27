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
    return hr;
  }

  ignoreEvent() {
    return true;
  }
}

const dividersPlugin: NeutrinoPlugin = {
  id: 'ne:dividers',
  extensions(classNames: NeutrinoClassNames) {
    const widgetClass = classNames.dividerWidget ?? 'ne-divider-widget';
    const lineClass = classNames.divider ?? 'ne-divider';
    const lineDeco = Decoration.line({ class: lineClass });

    return [
      // Replace horizontal rule with widget
      makeInlinePlugin({
        createDecoration(node) {
          if (node.name === 'HorizontalRule') {
            return new DividerWidget(widgetClass);
          }
          return null;
        },
      }),
      // Add line decoration
      makeInlinePlugin({
        createDecoration(node) {
          if (node.name === 'HorizontalRule') {
            return lineDeco;
          }
          return null;
        },
        getDecorationRange(node, state) {
          const line = state.doc.lineAt(node.from);
          return [line.from];
        },
      }),
    ];
  },
};

export default dividersPlugin;
