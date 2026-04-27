import { WidgetType } from '@codemirror/view';
import { makeInlinePlugin } from '../rendering';
import type { NeutrinoPlugin, NeutrinoClassNames } from '../types';

/** Number of distinct visual bullet styles that cycle with nesting depth. */
const DEPTH_STYLE_COUNT = 3;

class BulletMarkerWidget extends WidgetType {
  private depthClass: string;
  private markerClass: string;

  constructor(depth: number, markerClass: string) {
    super();
    this.markerClass = markerClass;
    this.depthClass = `ne-depth-${depth % DEPTH_STYLE_COUNT}`;
  }

  eq(other: BulletMarkerWidget) {
    return other.depthClass === this.depthClass && other.markerClass === this.markerClass;
  }

  toDOM() {
    const span = document.createElement('span');
    span.className = `${this.markerClass} ${this.depthClass}`;
    span.setAttribute('aria-label', 'bullet');
    span.role = 'img';

    // Sizing element preserves the width of the original marker
    const sizing = document.createElement('span');
    sizing.className = 'ne-list-marker-sizing';
    sizing.textContent = '-';
    span.appendChild(sizing);

    // Visual bullet
    const dot = document.createElement('span');
    dot.className = 'ne-list-marker-dot';
    span.appendChild(dot);

    return span;
  }

  updateDOM(dom: HTMLElement) {
    dom.classList.remove('ne-depth-0', 'ne-depth-1', 'ne-depth-2');
    dom.classList.add(this.depthClass);
    return true;
  }

  ignoreEvent() {
    return true;
  }
}

const listsPlugin: NeutrinoPlugin = {
  id: 'ne:lists',
  extensions(classNames: NeutrinoClassNames) {
    const markerClass = classNames.listMarker ?? 'ne-list-marker';

    return [
      makeInlinePlugin({
        createDecoration(node, _state, parentDepths) {
          if (node.name !== 'ListMark') return null;
          const parent = node.node.parent;
          if (
            parent?.name === 'ListItem' &&
            parent?.parent?.name === 'BulletList'
          ) {
            return new BulletMarkerWidget(
              parentDepths.get('BulletList') ?? 1,
              markerClass,
            );
          }
          return null;
        },
        getRevealStrategy: () => 'active',
      }),
    ];
  },
};

export default listsPlugin;
