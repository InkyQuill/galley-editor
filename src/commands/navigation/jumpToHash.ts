import { EditorSelection } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

function headingText(line: string): string | null {
  const match = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
  if (!match) return null;
  return match[2].replace(/\s+#+\s*$/, '').trim();
}

export function slugifyHeading(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function jumpToHash(view: EditorView, hash: string): boolean {
  const target = hash.replace(/^#/, '');
  if (!target) return false;

  const seen = new Map<string, number>();
  for (let lineNumber = 1; lineNumber <= view.state.doc.lines; lineNumber += 1) {
    const line = view.state.doc.line(lineNumber);
    const text = headingText(line.text);
    if (!text) continue;

    const baseSlug = slugifyHeading(text);
    const count = seen.get(baseSlug) ?? 0;
    seen.set(baseSlug, count + 1);
    const slug = count === 0 ? baseSlug : `${baseSlug}-${count}`;

    if (slug === target) {
      view.dispatch({
        selection: EditorSelection.cursor(line.from),
        effects: EditorView.scrollIntoView(line.from, { y: 'start' }),
      });
      return true;
    }
  }

  return false;
}
