/**
 * Core rendering engige: factories that turn a GalleyPluginSpec into CM6 extensions.
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
import { type EditorSelection, type EditorState, type Range, StateField } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import type { SyntaxNodeRef } from '@lezer/common';
import type { GalleyPluginSpec, RevealStrategy } from './types';

// ── Shared constants ────────────────────────────────────────────────────────

/** Shared decoration that replaces (hides) a node with nothing. */
export const HIDE_DECORATION = Decoration.replace({});

/** How many lines away from the cursor a block node must be to remain decorated. */
export const BLOCK_CURSOR_LINE_PROXIMITY = 1;

// CodeMirror does not expose a public line-decoration predicate.
const LINE_DECORATION_CONSTRUCTOR = Decoration.line({}).constructor;

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

function isLineDecoration(decoration: Decoration): boolean {
  return decoration.constructor === LINE_DECORATION_CONSTRUCTOR;
}

function validatePluginSpec(spec: GalleyPluginSpec): void {
  const rangeSelectorCount = [
    spec.getLineRange,
    spec.getMarkRange,
    spec.getPointPosition,
  ].filter(Boolean).length;

  if (rangeSelectorCount > 1) {
    throw new Error(
      'Only one of getLineRange, getMarkRange, or getPointPosition may be defined',
    );
  }
}

function defaultNodeRange(node: SyntaxNodeRef): { from: number; to: number } {
  return { from: node.from, to: node.to };
}

function getMarkRange(
  spec: GalleyPluginSpec,
  node: SyntaxNodeRef,
  state: EditorState,
): { from: number; to: number } | null {
  return spec.getMarkRange?.(node, state) ?? defaultNodeRange(node);
}

function getLineRange(
  spec: GalleyPluginSpec,
  node: SyntaxNodeRef,
  state: EditorState,
): { from: number; to: number } | null {
  return spec.getLineRange?.(node, state) ?? defaultNodeRange(node);
}

function addLineDecorations(
  decorations: Range<Decoration>[],
  state: EditorState,
  decoration: Decoration,
  range: { from: number; to: number },
): void {
  const doc = state.doc;
  const lineFrom = doc.lineAt(range.from);
  const lineTo = doc.lineAt(Math.max(range.from, range.to));

  for (let lineNumber = lineFrom.number; lineNumber <= lineTo.number; lineNumber++) {
    decorations.push(decoration.range(doc.line(lineNumber).from));
  }
}

function selectionAffectsDecorations(
  spec: GalleyPluginSpec,
  prev: EditorSelection,
  next: EditorSelection,
): boolean {
  return spec.selectionAffectsDecorations?.(prev, next) ?? true;
}

// ── Inline plugin (ViewPlugin, viewport-only) ──────────────────────────────

export function buildInlineDecorationsForRanges(
  view: EditorView,
  spec: GalleyPluginSpec,
  ranges: readonly { from: number; to: number }[],
): DecorationSet {
  const { state } = view;
  const doc = state.doc;
  const cursorLine = doc.lineAt(state.selection.main.anchor);
  const selection = state.selection;
  const widgets: Range<Decoration>[] = [];

  for (const { from, to } of ranges) {
    const parentDepths = new Map<string, number>();

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
        if (result instanceof WidgetType && spec.getPointPosition) {
          const position = spec.getPointPosition(node, state);
          if (position === null) return;
          widgets.push(Decoration.widget({ widget: result }).range(position));
          return;
        } else if (result instanceof WidgetType) {
          decoration = Decoration.replace({ widget: result });
        } else {
          decoration = result;
        }

        if (isLineDecoration(decoration)) {
          const range = getLineRange(spec, node, state);
          if (!range) return;
          addLineDecorations(widgets, state, decoration, range);
          return;
        }

        const range = getMarkRange(spec, node, state);
        if (!range) return;
        const rangeLineFrom = doc.lineAt(range.from);
        const rangeLineTo = doc.lineAt(range.to);

        // Only apply inline marks/replacements within a single line.
        if (rangeLineFrom.number === rangeLineTo.number) {
          widgets.push(decoration.range(range.from, range.to));
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

export function makeInlinePlugin(spec: GalleyPluginSpec) {
  validatePluginSpec(spec);

  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = buildInlineDecorationsForRanges(
          view,
          spec,
          view.visibleRanges,
        );
      }

      update(update: ViewUpdate) {
        if (
          update.docChanged ||
          update.viewportChanged ||
          (update.selectionSet &&
            selectionAffectsDecorations(
              spec,
              update.startState.selection,
              update.state.selection,
            ))
        ) {
          this.decorations = buildInlineDecorationsForRanges(
            update.view,
            spec,
            update.view.visibleRanges,
          );
        }
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
  spec: GalleyPluginSpec,
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
      let isWidget = false;
      if (result instanceof WidgetType && spec.getPointPosition) {
        const position = spec.getPointPosition(node, state);
        if (position === null) return;
        widgets.push(Decoration.widget({ widget: result, block: true }).range(position));
        return;
      } else if (result instanceof WidgetType) {
        decoration = Decoration.replace({ widget: result, block: true });
        isWidget = true;
      } else {
        decoration = result;
      }

      if (!isWidget && isLineDecoration(decoration)) {
        const range = getLineRange(spec, node, state);
        if (!range) return;
        addLineDecorations(widgets, state, decoration, range);
      } else {
        const range = getMarkRange(spec, node, state);
        if (!range) return;
        widgets.push(decoration.range(range.from, range.to));
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

export function makeBlockPlugin(spec: GalleyPluginSpec) {
  validatePluginSpec(spec);

  const field = StateField.define<DecorationSet>({
    create(state) {
      return buildBlockDecorations(state, spec);
    },
    update(decorations, tr) {
      decorations = decorations.map(tr.changes);

      const selectionChanged =
        !tr.newSelection.eq(tr.startState.selection) &&
        selectionAffectsDecorations(
          spec,
          tr.startState.selection,
          tr.state.selection,
        );
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
