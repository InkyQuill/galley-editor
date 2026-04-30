import { type EditorView, WidgetType } from '@codemirror/view';
import { makeInlinePlugin } from '../rendering';
import type { GalleyPlugin, GalleyClassNames } from '../types';

/** Number of distinct visual bullet styles that cycle with nesting depth. */
const DEPTH_STYLE_COUNT = 3;

/** @internal */
export class BulletMarkerWidget extends WidgetType {
  private depthClass: string;
  private markerClass: string;

  constructor(depth: number, markerClass: string) {
    super();
    this.markerClass = markerClass;
    this.depthClass = `ge-depth-${depth % DEPTH_STYLE_COUNT}`;
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
    sizing.className = 'ge-list-marker-sizing';
    sizing.textContent = '-';
    span.appendChild(sizing);

    // Visual bullet
    const dot = document.createElement('span');
    dot.className = 'ge-list-marker-dot';
    span.appendChild(dot);

    return span;
  }

  updateDOM(dom: HTMLElement, _view: EditorView, from: BulletMarkerWidget) {
    dom.classList.remove(from.depthClass);
    dom.classList.add(this.depthClass);
    if (from.markerClass !== this.markerClass) {
      dom.classList.remove(from.markerClass);
      dom.classList.add(this.markerClass);
    }
    return true;
  }

  ignoreEvent() {
    return true;
  }
}

const listsPlugin: GalleyPlugin = {
  id: 'ge:lists',
  extensions(classNames: GalleyClassNames, context) {
    const markerClass = classNames.listMarker ?? 'ge-list-marker';
    const revealStrategy = context?.mode === 'preview' ? false : 'active';

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
        getRevealStrategy: () => revealStrategy,
      }),
    ];
  },
};

export default listsPlugin;
