/**
 * Theme system for Galley Editor.
 *
 * Produces CM6 styles that consume the public --ge-* CSS variable contract
 * and uses classHighlighter for Lezer token CSS classes.
 */

import { EditorView } from '@codemirror/view';
import { type Extension } from '@codemirror/state';
import { syntaxHighlighting } from '@codemirror/language';
import { classHighlighter } from '@lezer/highlight';

export type ColorScheme = 'light' | 'dark' | 'auto';

export function resolveColorScheme(scheme: ColorScheme): 'light' | 'dark' {
  if (scheme === 'auto') {
    return typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }
  return scheme;
}

export function watchColorScheme(
  scheme: ColorScheme,
  onChange: (resolved: 'light' | 'dark') => void,
): () => void {
  if (
    scheme !== 'auto' ||
    typeof window === 'undefined' ||
    typeof window.matchMedia !== 'function'
  ) {
    return () => {};
  }

  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const listener = () => {
    onChange(resolveColorScheme('auto'));
  };

  if (typeof media.addEventListener === 'function') {
    media.addEventListener('change', listener);
    return () => {
      media.removeEventListener('change', listener);
    };
  }

  media.addListener(listener);
  return () => {
    media.removeListener(listener);
  };
}

/**
 * Build CM6 theme extensions.
 * Structural layout stays fixed while visual values flow through --ge-* CSS
 * variables defined by galley-base.css or consumer overrides.
 */
export function buildCmTheme(scheme: ColorScheme): Extension[] {
  const isDark = resolveColorScheme(scheme) === 'dark';

  return [
    EditorView.editorAttributes.of({
      class: isDark ? 'cm-dark' : 'cm-light',
    }),
    EditorView.theme(
      {
        '&': {
          backgroundColor: 'var(--ge-color-bg)',
          boxSizing: 'border-box',
          height: 'auto',
          width: '100%',
        },
        '.cm-content': {
          caretColor: 'var(--ge-color-caret)',
          color: 'var(--ge-color-text)',
          fontFamily: 'var(--ge-font-body)',
          fontSize: 'var(--ge-font-size)',
          lineHeight: 'var(--ge-line-height)',
          padding: '12px',
        },
        '&.cm-focused': {
          outline: 'none',
        },
        '& .cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
          backgroundColor: 'var(--ge-color-selection)',
        },
        '.cm-scroller': {
          overflowY: 'auto',
        },
        '.cm-line': {
          padding: '0 4px',
        },
        '.cm-cursor': {
          borderLeftColor: 'var(--ge-color-caret)',
          zIndex: '10',
        },
      },
      { dark: isDark },
    ),
    // Lezer token CSS classes: .tok-strong, .tok-emphasis, .tok-link, etc.
    syntaxHighlighting(classHighlighter),
  ];
}
