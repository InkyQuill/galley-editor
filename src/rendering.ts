/**
 * Core rendering engine: factories that turn a NeutrinoPluginSpec into CM6 extensions.
 *
 * makeInlinePlugin — ViewPlugin (viewport-only, cheap). For inline marks.
 * makeBlockPlugin  — StateField (full-doc iteration). For multi-line blocks.
 */

import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
} from '@codemirror/view';
import { type EditorState, type Range, StateField } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import type { SyntaxNodeRef } from '@lezer/common';
import type { NeutrinoPluginSpec, RevealStrategy } from './types';
import type { EditorSelection } from '@codemirror/state';

// ── Shared constants ────────────────────────────────────────────────────────

/** Shared decoration that replaces (hides) a node with nothing. */
export const HIDE_DECORATION = Decoration.replace({});

/** How many lines away from the cursor a block node must be to remain decorated. */
export const BLOCK_CURSOR_LINE_PROXIMITY = 1;

// ── Shared utility ──────────────────────────────────────────────────────────

export function nodeIntersectsSelection(
  selection: EditorSelection,
  node: SyntaxNodeRef,
): boolean {
  const sel = selection.main;
  const nodeContains = (pt: number) => pt >= node.from && pt <= node.to;
  const selContains = (pt: number) => pt >= sel.from && pt <= sel.to;
  return (
    nodeContains(sel.from) ||
    nodeContains(sel.to) ||
    selContains(node.from) ||
    selContains(node.to)
  );
}

// ── Inline plugin (ViewPlugin, viewport-only) ──────────────────────────────

export function makeInlinePlugin(spec: NeutrinoPluginSpec) {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = this.buildDecorations(view);
      }

      update(update: ViewUpdate) {
        if (
          update.docChanged ||
          update.viewportChanged ||
          update.selectionSet
        ) {
          this.decorations = this.buildDecorations(update.view);
        }
      }

      private buildDecorations(view: EditorView): DecorationSet {
        const { state } = view;
        const doc = state.doc;
        const cursorLine = doc.lineAt(state.selection.main.anchor);
        const selection = state.selection;
        const parentDepths = new Map<string, number>();
        const widgets: Range<Decoration>[] = [];

        for (const { from, to } of view.visibleRanges) {
          syntaxTree(state).iterate({
            from,
            to,
            enter: (node) => {
              parentDepths.set(
                node.name,
                (parentDepths.get(node.name) ?? 0) + 1,
              );

              const strategy: RevealStrategy =
                spec.getRevealStrategy?.(node, state) ?? 'line';

              let isSelected = false;
              if (typeof strategy === 'boolean') {
                isSelected = strategy;
              } else if (strategy === 'line') {
                const nodeLine = doc.lineAt(node.from);
                isSelected =
                  cursorLine.number === nodeLine.number ||
                  nodeIntersectsSelection(selection, node);
              } else if (strategy === 'select') {
                isSelected = nodeIntersectsSelection(selection, node);
              } else if (strategy === 'active') {
                const parent = node.node.parent;
                isSelected =
                  nodeIntersectsSelection(selection, node) ||
                  (!!parent && nodeIntersectsSelection(selection, parent));
              }

              const shouldHide =
                (spec.hideWhenNearCursor ?? true) && isSelected;
              if (shouldHide) return;

              const result = spec.createDecoration(node, state, parentDepths);
              if (!result) return;

              let decoration: Decoration;
              if (result instanceof WidgetType) {
                decoration = Decoration.replace({ widget: result });
              } else {
                decoration = result;
              }

              const range =
                spec.getDecorationRange?.(node, state) ?? [node.from, node.to];
              const rangeLineFrom = doc.lineAt(range[0]);
              const rangeLineTo =
                range.length === 2 ? doc.lineAt(range[1]) : rangeLineFrom;

              // Only apply inline decorations within a single line
              if (rangeLineFrom.number === rangeLineTo.number) {
                if (range.length === 1) {
                  widgets.push(decoration.range(range[0]));
                } else {
                  widgets.push(decoration.range(range[0], range[1]));
                }
              }
            },
            leave: (node) => {
              parentDepths.set(
                node.name,
                (parentDepths.get(node.name) ?? 0) - 1,
              );
            },
          });
        }

        return Decoration.set(widgets, true);
      }
    },
    {
      decorations: (v) => v.decorations,
    },
  );
}

// ── Block plugin (StateField, full-doc iteration) ──────────────────────────

function buildBlockDecorations(
  state: EditorState,
  spec: NeutrinoPluginSpec,
): DecorationSet {
  const doc = state.doc;
  const cursorLine = doc.lineAt(state.selection.main.anchor);
  const parentDepths = new Map<string, number>();
  const widgets: Range<Decoration>[] = [];

  syntaxTree(state).iterate({
    enter: (node) => {
      parentDepths.set(
        node.name,
        (parentDepths.get(node.name) ?? 0) + 1,
      );

      const nodeLineFrom = doc.lineAt(node.from);
      const nodeLineTo = doc.lineAt(node.to);
      const selectionIsNearNode =
        Math.abs(nodeLineFrom.number - cursorLine.number) <= BLOCK_CURSOR_LINE_PROXIMITY ||
        Math.abs(nodeLineTo.number - cursorLine.number) <= BLOCK_CURSOR_LINE_PROXIMITY;
      const shouldHide =
        (spec.hideWhenNearCursor ?? true) &&
        (nodeIntersectsSelection(state.selection, node) || selectionIsNearNode);

      if (shouldHide) return;

      const result = spec.createDecoration(node, state, parentDepths);
      if (!result) return;

      let decoration: Decoration;
      if (result instanceof WidgetType) {
        decoration = Decoration.replace({ widget: result, block: true });
      } else {
        decoration = result;
      }

      let rangeFrom = nodeLineFrom.from;
      let rangeTo = nodeLineTo.to;
      let skip = false;

      if (spec.getDecorationRange) {
        const range = spec.getDecorationRange(node, state);
        if (range) {
          rangeFrom = range[0];
          rangeTo = range.length === 1 ? range[0] : range[1];
        } else {
          skip = true;
        }
      }

      if (!skip) {
        widgets.push(decoration.range(rangeFrom, rangeTo));
      }
    },
    leave: (node) => {
      parentDepths.set(
        node.name,
        (parentDepths.get(node.name) ?? 0) - 1,
      );
    },
  });

  return Decoration.set(widgets, true);
}

export function makeBlockPlugin(spec: NeutrinoPluginSpec) {
  const field = StateField.define<DecorationSet>({
    create(state) {
      return buildBlockDecorations(state, spec);
    },
    update(decorations, tr) {
      decorations = decorations.map(tr.changes);

      const selectionChanged = !tr.newSelection.eq(tr.startState.selection);
      const treeChanged =
        syntaxTree(tr.state) !== syntaxTree(tr.startState);
      const forceRerender = spec.shouldForceRerender?.(tr) ?? false;

      if (tr.docChanged || selectionChanged || treeChanged || forceRerender) {
        decorations = buildBlockDecorations(tr.state, spec);
      }

      return decorations;
    },
    provide: (f) => EditorView.decorations.from(f),
  });

  return [field];
}
