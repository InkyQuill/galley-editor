import type { EditorView } from '@codemirror/view';
import { getHeadings, revealPosition } from './headings';

export { slugifyHeading } from './headings';

export function jumpToHash(view: EditorView, hash: string): boolean {
  const fragment = hash.replace(/^#/, '');
  if (!fragment) return false;

  let target = fragment;
  try {
    target = decodeURIComponent(fragment);
  } catch {
    return false;
  }

  const heading = getHeadings(view.state).find(({ slug }) => slug === target);
  if (!heading) return false;

  revealPosition(view, heading.from, { align: 'start', select: true });
  return true;
}
