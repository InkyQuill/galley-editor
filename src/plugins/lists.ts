import { WidgetType } from '@codemirror/view';
import { makeInlinePlugin } from '../rendering';
import type { NeutrinoPlugin, NeutrinoClassNames } from '../types';

/** Number of distinct visual bullet styles that cycle with nesting depth. */
const DEPTH_STYLE_COUNT = 3;

export class BulletMarkerWidget extends WidgetType {
  private depthClass: string;
  private markerClass: string;
  private previousDepthClass: string;

  constructor(depth: number, markerClass: string) {
    super();
    this.markerClass = markerClass;
    this.depthClass = `ne-depth-${depth % DEPTH_STYLE_COUNT}`;
    this.previousDepthClass = this.depthClass;
  }

  eq(other: BulletMarkerWidget) {
    return other.depthClass === this.depthClass && other.markerClass === this.markerClass;
  }

  toDOM() {
    const span = document.createElement('span');
    span.className = `${this.markerClass} ${this.depthClass}`;
    span.setAttribute('aria-hidden', 'true');

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
    const currentDepthClass =
      Array.from(dom.classList).find((className) => /^ne-depth-[0-2]$/.test(className)) ??
      this.previousDepthClass;
    this.previousDepthClass = currentDepthClass;
    dom.classList.remove(this.previousDepthClass);
    dom.classList.add(this.depthClass);
    this.previousDepthClass = this.depthClass;
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
