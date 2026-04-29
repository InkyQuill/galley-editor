/**
 * Theme system for Neutrino Editor.
 *
 * Produces structural-only CM6 styles (no colors/fonts) and
 * uses classHighlighter for Lezer token CSS classes.
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
 * Only structural styles are applied — no colors, fonts, or typography.
 * Visual styling is handled by consumer CSS targeting ne-* classes and tok-* classes.
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
          boxSizing: 'border-box',
          width: '100%',
          height: 'auto',
        },
        '.cm-content': {
          padding: '12px',
          lineHeight: '1.6',
        },
        '.cm-focused': {
          outline: 'none',
        },
        '.cm-scroller': {
          overflowY: 'auto',
          overflowX: 'hidden',
        },
        '.cm-line': {
          padding: '0 4px',
        },
        '.cm-cursor': {
          zIndex: '10',
        },
      },
      { dark: isDark },
    ),
    // Lezer token CSS classes: .tok-strong, .tok-emphasis, .tok-link, etc.
    syntaxHighlighting(classHighlighter),
  ];
}
