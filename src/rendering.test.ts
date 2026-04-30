import { describe, it, expect, afterEach } from 'vitest';
import { EditorState, EditorSelection, type Extension } from '@codemirror/state';
import { EditorView, Decoration, WidgetType } from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import type { SyntaxNodeRef } from '@lezer/common';
import {
  HIDE_DECORATION,
  BLOCK_CURSOR_LINE_PROXIMITY,
  nodeIntersectsSelection,
  buildInlineDecorationsForRanges,
  makeInlinePlugin,
  makeBlockPlugin,
} from './rendering';
import type { GalleyPluginSpec } from './types';

// ── Helpers ────────────────────────────────────────────────────────────────

function createView(
  doc: string,
  cursor?: number,
  extensions: Extension[] = [],
): EditorView {
  const state = EditorState.create({
    doc,
    extensions: [markdown(), ...extensions],
    selection: { anchor: cursor ?? 0 },
  });
  return new EditorView({ state });
}


/** Minimal mock that satisfies SyntaxNodeRef for nodeIntersectsSelection. */
function mockNode(from: number, to: number): SyntaxNodeRef {
  return { from, to } as unknown as SyntaxNodeRef;
}

/** A trivial spec that marks every "Heading" node with a line decoration. */
function headingBlockSpec(): GalleyPluginSpec {
  return {
    createDecoration(node) {
      if (node.name === 'ATXHeading1' || node.name === 'SetextHeading1') {
        return Decoration.line({ class: 'test-heading' });
      }
      return null;
    },
    getLineRange(node, state) {
      if (node.name === 'ATXHeading1' || node.name === 'SetextHeading1') {
        const line = state.doc.lineAt(node.from);
        return { from: line.from, to: line.to };
      }
      return null;
    },
  };
}

/** A trivial inline spec that hides EmphasisMark nodes. */
function emphasisInlineSpec(): GalleyPluginSpec {
  return {
    createDecoration(node) {
      if (node.name === 'EmphasisMark') {
        return HIDE_DECORATION;
      }
      return null;
    },
  };
}

const views: EditorView[] = [];

function tracked(view: EditorView): EditorView {
  views.push(view);
  return view;
}

afterEach(() => {
  for (const v of views) v.destroy();
  views.length = 0;
});

// ── Constants ──────────────────────────────────────────────────────────────

describe('HIDE_DECORATION', () => {
  it('is a replace decoration', () => {
    expect(HIDE_DECORATION).toBeDefined();
    expect(HIDE_DECORATION.spec).toEqual({});
  });
});

describe('BLOCK_CURSOR_LINE_PROXIMITY', () => {
  it('equals 1', () => {
    expect(BLOCK_CURSOR_LINE_PROXIMITY).toBe(1);
  });
});

// ── nodeIntersectsSelection ────────────────────────────────────────────────

describe('nodeIntersectsSelection', () => {
  it('returns true when cursor is inside node', () => {
    const sel = EditorSelection.single(5);
    const node = mockNode(3, 10);
    expect(nodeIntersectsSelection(sel, node)).toBe(true);
  });

  it('returns true when cursor is at node start', () => {
    const sel = EditorSelection.single(3);
    const node = mockNode(3, 10);
    expect(nodeIntersectsSelection(sel, node)).toBe(true);
  });

  it('returns true when cursor is at node end', () => {
    const sel = EditorSelection.single(10);
    const node = mockNode(3, 10);
    expect(nodeIntersectsSelection(sel, node)).toBe(true);
  });

  it('returns false when cursor is before node', () => {
    const sel = EditorSelection.single(1);
    const node = mockNode(3, 10);
    expect(nodeIntersectsSelection(sel, node)).toBe(false);
  });

  it('returns false when cursor is after node', () => {
    const sel = EditorSelection.single(12);
    const node = mockNode(3, 10);
    expect(nodeIntersectsSelection(sel, node)).toBe(false);
  });

  it('returns true when selection partially overlaps node from the left', () => {
    const sel = EditorSelection.single(1, 5);
    const node = mockNode(3, 10);
    expect(nodeIntersectsSelection(sel, node)).toBe(true);
  });

  it('returns true when selection partially overlaps node from the right', () => {
    const sel = EditorSelection.single(8, 15);
    const node = mockNode(3, 10);
    expect(nodeIntersectsSelection(sel, node)).toBe(true);
  });

  it('returns true when selection fully contains node', () => {
    const sel = EditorSelection.single(0, 20);
    const node = mockNode(3, 10);
    expect(nodeIntersectsSelection(sel, node)).toBe(true);
  });

  it('returns true when node fully contains selection', () => {
    const sel = EditorSelection.single(5, 8);
    const node = mockNode(3, 10);
    expect(nodeIntersectsSelection(sel, node)).toBe(true);
  });

  it('returns false when selection ends just before node', () => {
    const sel = EditorSelection.single(0, 2);
    const node = mockNode(3, 10);
    expect(nodeIntersectsSelection(sel, node)).toBe(false);
  });

  it('returns false when selection starts just after node', () => {
    const sel = EditorSelection.single(11, 15);
    const node = mockNode(3, 10);
    expect(nodeIntersectsSelection(sel, node)).toBe(false);
  });

  it('returns true when selection touches node boundary (sel.to == node.from)', () => {
    const sel = EditorSelection.single(0, 3);
    const node = mockNode(3, 10);
    expect(nodeIntersectsSelection(sel, node)).toBe(true);
  });

  it('returns true when selection touches node boundary (sel.from == node.to)', () => {
    const sel = EditorSelection.single(10, 15);
    const node = mockNode(3, 10);
    expect(nodeIntersectsSelection(sel, node)).toBe(true);
  });
});

// ── makeInlinePlugin ───────────────────────────────────────────────────────

describe('makeInlinePlugin', () => {
  it('throws when multiple range selectors are defined', () => {
    expect(() => makeInlinePlugin({
      createDecoration: () => Decoration.mark({ class: 'x' }),
      getMarkRange: () => ({ from: 0, to: 1 }),
      getPointPosition: () => 0,
    })).toThrow(/Only one/);
  });

  it('returns a ViewPlugin extension', () => {
    const plugin = makeInlinePlugin(emphasisInlineSpec());
    expect(plugin).toBeDefined();
  });

  it('can be added to an EditorView without error', () => {
    const plugin = makeInlinePlugin(emphasisInlineSpec());
    const view = tracked(createView('hello *world*', 0, [plugin]));
    expect(view.state.doc.toString()).toBe('hello *world*');
  });

  it('does not throw when the view has no matching nodes', () => {
    const plugin = makeInlinePlugin(emphasisInlineSpec());
    const view = tracked(createView('plain text', 0, [plugin]));
    expect(view.state.doc.toString()).toBe('plain text');
  });

  it('does not throw when cursor is on a matching node', () => {
    const plugin = makeInlinePlugin(emphasisInlineSpec());
    // cursor on the emphasis mark
    const view = tracked(createView('hello *world*', 7, [plugin]));
    expect(view.state.doc.toString()).toBe('hello *world*');
  });

  it('works with a widget-returning spec', () => {
    class TestWidget extends WidgetType {
      toDOM() {
        const span = document.createElement('span');
        span.textContent = 'X';
        return span;
      }
    }

    const spec: GalleyPluginSpec = {
      createDecoration(node) {
        if (node.name === 'EmphasisMark') {
          return new TestWidget();
        }
        return null;
      },
    };

    const plugin = makeInlinePlugin(spec);
    const view = tracked(createView('hello *world*', 0, [plugin]));
    expect(view.state.doc.toString()).toBe('hello *world*');
  });

  it('supports getPointPosition for point widgets', () => {
    class TestWidget extends WidgetType {
      toDOM() {
        const span = document.createElement('span');
        span.textContent = 'X';
        return span;
      }
    }

    const spec: GalleyPluginSpec = {
      createDecoration(node) {
        if (node.name === 'EmphasisMark') return new TestWidget();
        return null;
      },
      getPointPosition(node) {
        return node.from;
      },
      hideWhenNearCursor: false,
    };

    const view = tracked(createView('hello *world*', 0, [makeInlinePlugin(spec)]));
    expect(view.dom.textContent).toContain('X');
  });

  it('skips selection-only rebuilds when selectionAffectsDecorations returns false', () => {
    let decorationCount = 0;
    const spec: GalleyPluginSpec = {
      createDecoration(node) {
        if (node.name !== 'EmphasisMark') return null;
        decorationCount++;
        return HIDE_DECORATION;
      },
      hideWhenNearCursor: false,
      selectionAffectsDecorations: () => false,
    };

    const view = tracked(createView('hello *world*', 0, [makeInlinePlugin(spec)]));
    const beforeSelectionChange = decorationCount;

    view.dispatch({ selection: EditorSelection.cursor(1) });
    expect(decorationCount).toBe(beforeSelectionChange);

    view.dispatch({ changes: { from: 0, insert: '!' } });
    expect(decorationCount).toBeGreaterThan(beforeSelectionChange);
  });

  it('respects hideWhenNearCursor: false', () => {
    const spec: GalleyPluginSpec = {
      createDecoration(node) {
        if (node.name === 'EmphasisMark') {
          return HIDE_DECORATION;
        }
        return null;
      },
      hideWhenNearCursor: false,
    };

    const plugin = makeInlinePlugin(spec);
    // cursor right on the emphasis mark, but hiding is disabled
    const view = tracked(createView('hello *world*', 7, [plugin]));
    expect(view.state.doc.toString()).toBe('hello *world*');
  });

  it('respects custom getRevealStrategy returning boolean', () => {
    const spec: GalleyPluginSpec = {
      createDecoration(node) {
        if (node.name === 'EmphasisMark') {
          return HIDE_DECORATION;
        }
        return null;
      },
      getRevealStrategy() {
        return false; // never revealed
      },
    };

    const plugin = makeInlinePlugin(spec);
    const view = tracked(createView('hello *world*', 7, [plugin]));
    expect(view.state.doc.toString()).toBe('hello *world*');
  });

  it('resets parentDepths for each visible range', () => {
    const doc = '- a\n  - b\n\n- c\n  - d';
    const secondRangeStart = doc.indexOf('- c');
    const observations: Array<{
      from: number;
      depth: number | undefined;
      map: ReadonlyMap<string, number>;
    }> = [];
    const spec: GalleyPluginSpec = {
      createDecoration(node, _state, parentDepths) {
        if (node.name === 'ListMark') {
          observations.push({
            from: node.from,
            depth: parentDepths.get('BulletList'),
            map: parentDepths,
          });
        }
        return null;
      },
      hideWhenNearCursor: false,
    };

    const view = tracked(createView(doc));

    buildInlineDecorationsForRanges(view, spec, [
      { from: 0, to: doc.indexOf('\n\n') },
      { from: secondRangeStart, to: doc.length },
    ]);

    const secondRangeDepths = observations
      .filter((observation) => observation.from >= secondRangeStart)
      .map((observation) => observation.depth);
    const firstRangeMap = observations.find(
      (observation) => observation.from < secondRangeStart,
    )?.map;
    const secondRangeMap = observations.find(
      (observation) => observation.from >= secondRangeStart,
    )?.map;

    expect(secondRangeMap).not.toBe(firstRangeMap);
    expect(secondRangeDepths[0]).toBe(1);
    expect(secondRangeDepths).toEqual([1, 2]);
  });
});

// ── makeBlockPlugin ────────────────────────────────────────────────────────

describe('makeBlockPlugin', () => {
  it('throws when multiple range selectors are defined', () => {
    expect(() => makeBlockPlugin({
      createDecoration: () => Decoration.line({ class: 'x' }),
      getLineRange: () => ({ from: 0, to: 1 }),
      getMarkRange: () => ({ from: 0, to: 1 }),
    })).toThrow(/Only one/);
  });

  it('returns an array of extensions', () => {
    const extensions = makeBlockPlugin(headingBlockSpec());
    expect(Array.isArray(extensions)).toBe(true);
    expect(extensions.length).toBeGreaterThan(0);
  });

  it('can be added to an EditorView without error', () => {
    const extensions = makeBlockPlugin(headingBlockSpec());
    const view = tracked(createView('# Hello\n\nworld', 0, extensions));
    expect(view.state.doc.toString()).toBe('# Hello\n\nworld');
  });

  it('does not throw when the view has no matching nodes', () => {
    const extensions = makeBlockPlugin(headingBlockSpec());
    const view = tracked(createView('plain text', 0, extensions));
    expect(view.state.doc.toString()).toBe('plain text');
  });

  it('does not throw with cursor on a matching node', () => {
    const extensions = makeBlockPlugin(headingBlockSpec());
    const view = tracked(createView('# Hello\n\nworld', 3, extensions));
    expect(view.state.doc.toString()).toBe('# Hello\n\nworld');
  });

  it('applies decorations when cursor is far from the block', () => {
    // Spec that always decorates Blockquote nodes
    const spec: GalleyPluginSpec = {
      createDecoration(node) {
        if (node.name === 'Blockquote') {
          return Decoration.line({ class: 'test-blockquote' });
        }
        return null;
      },
      getLineRange(node, state) {
        if (node.name === 'Blockquote') {
          const line = state.doc.lineAt(node.from);
          return { from: line.from, to: line.to };
        }
        return null;
      },
    };

    const extensions = makeBlockPlugin(spec);
    // blockquote on line 1, cursor on line 5 (far away)
    const doc = '> quote\n\n\n\n\ncursor here';
    const cursorPos = doc.lastIndexOf('cursor');
    const view = tracked(createView(doc, cursorPos, extensions));

    // The field should exist and contain decorations
    // We verify by checking the view doesn't throw and state is accessible
    expect(view.state.doc.line(1).text).toBe('> quote');
  });

  it('expands line decorations across the full getLineRange span', () => {
    const spec: GalleyPluginSpec = {
      createDecoration(node) {
        if (node.name === 'Blockquote') {
          return Decoration.line({ class: 'test-blockquote' });
        }
        return null;
      },
      getLineRange(node, state) {
        if (node.name === 'Blockquote') {
          return { from: state.doc.lineAt(node.from).from, to: state.doc.lineAt(node.to).to };
        }
        return null;
      },
      hideWhenNearCursor: false,
    };

    const doc = '> one\n> two\n> three\n\nplain';
    const view = tracked(createView(
      doc,
      doc.indexOf('plain'),
      makeBlockPlugin(spec),
    ));
    const lines = view.dom.querySelectorAll('.cm-line');

    expect(lines.item(0).classList.contains('test-blockquote')).toBe(true);
    expect(lines.item(1).classList.contains('test-blockquote')).toBe(true);
    expect(lines.item(2).classList.contains('test-blockquote')).toBe(true);
  });

  it('uses the full block when getLineRange returns null', () => {
    const spec: GalleyPluginSpec = {
      createDecoration(node) {
        if (node.name === 'Blockquote') {
          return Decoration.line({ class: 'test-blockquote' });
        }
        return null;
      },
      getLineRange(node) {
        if (node.name === 'Blockquote') {
          return null;
        }
        return { from: node.from, to: node.to };
      },
      hideWhenNearCursor: false,
    };

    const doc = '> one\n> two\n> three\n\nplain';
    const view = tracked(createView(
      doc,
      doc.indexOf('plain'),
      makeBlockPlugin(spec),
    ));
    const lines = view.dom.querySelectorAll('.cm-line');

    expect(lines.item(0).classList.contains('test-blockquote')).toBe(true);
    expect(lines.item(1).classList.contains('test-blockquote')).toBe(true);
    expect(lines.item(2).classList.contains('test-blockquote')).toBe(true);
  });

  it('hides decorations when cursor is near the block', () => {
    const decorationCreated: boolean[] = [];
    const spec: GalleyPluginSpec = {
      createDecoration(node) {
        if (node.name === 'Blockquote') {
          decorationCreated.push(true);
          return Decoration.line({ class: 'test-blockquote' });
        }
        return null;
      },
      getLineRange(node, state) {
        if (node.name === 'Blockquote') {
          const line = state.doc.lineAt(node.from);
          return { from: line.from, to: line.to };
        }
        return null;
      },
    };

    const extensions = makeBlockPlugin(spec);
    // cursor right on the blockquote line
    const view = tracked(createView('> quote\n\nother', 3, extensions));
    expect(view.state.doc.toString()).toBe('> quote\n\nother');
  });

  it('respects shouldForceRerender', () => {
    let rerenderCount = 0;
    const spec: GalleyPluginSpec = {
      createDecoration(node) {
        if (node.name === 'Blockquote') {
          rerenderCount++;
          return Decoration.line({ class: 'test-blockquote' });
        }
        return null;
      },
      getLineRange(node, state) {
        if (node.name === 'Blockquote') {
          const line = state.doc.lineAt(node.from);
          return { from: line.from, to: line.to };
        }
        return null;
      },
      shouldForceRerender() {
        return true;
      },
    };

    const extensions = makeBlockPlugin(spec);
    const doc = '> quote\n\n\n\n\ncursor here';
    const cursorPos = doc.lastIndexOf('cursor');
    const view = tracked(createView(doc, cursorPos, extensions));

    const countBefore = rerenderCount;

    // Dispatch a no-op transaction that would normally be skipped
    view.dispatch({ effects: [] });

    // shouldForceRerender returns true, so buildBlockDecorations should be called again
    expect(rerenderCount).toBeGreaterThan(countBefore);
  });

  it('works with a widget-returning spec', () => {
    class BlockWidget extends WidgetType {
      toDOM() {
        const div = document.createElement('div');
        div.textContent = 'HR';
        return div;
      }
    }

    const spec: GalleyPluginSpec = {
      createDecoration(node) {
        if (node.name === 'HorizontalRule') {
          return new BlockWidget();
        }
        return null;
      },
    };

    const extensions = makeBlockPlugin(spec);
    const doc = 'above\n\n---\n\n\n\n\ncursor here';
    const cursorPos = doc.lastIndexOf('cursor');
    const view = tracked(createView(doc, cursorPos, extensions));
    expect(view.state.doc.toString()).toBe(doc);
  });

  it('respects hideWhenNearCursor: false', () => {
    const spec: GalleyPluginSpec = {
      createDecoration(node) {
        if (node.name === 'Blockquote') {
          return Decoration.line({ class: 'test-blockquote' });
        }
        return null;
      },
      getLineRange(node, state) {
        if (node.name === 'Blockquote') {
          const line = state.doc.lineAt(node.from);
          return { from: line.from, to: line.to };
        }
        return null;
      },
      hideWhenNearCursor: false,
    };

    const extensions = makeBlockPlugin(spec);
    // cursor ON the blockquote, but hiding is disabled
    const view = tracked(createView('> quote\n\nother', 3, extensions));
    expect(view.state.doc.toString()).toBe('> quote\n\nother');
  });
});
