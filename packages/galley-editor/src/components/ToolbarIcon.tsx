import type { ReactNode } from 'react';
import type { ToolbarIconName } from '../types';

const paths: Record<ToolbarIconName, ReactNode> = {
  bold: <><path d="M6 4h5a3 3 0 0 1 0 6H6z" /><path d="M6 10h6a3 3 0 0 1 0 6H6z" /></>,
  italic: <><path d="M10 4h6" /><path d="M4 16h6" /><path d="m12 4-4 12" /></>,
  strikethrough: <><path d="M15 6.5C14.5 5 13 4 10.5 4 8 4 6.5 5 6.5 7c0 1.5 1 2.2 3.5 3" /><path d="M4 10h12" /><path d="M13.5 10.5c1.6.5 2.5 1.3 2.5 2.7 0 2-1.8 3.3-5.2 3.3-2.7 0-4.4-1-4.8-2.6" /></>,
  inlineCode: <><path d="m7 7-4 3 4 3" /><path d="m13 7 4 3-4 3" /><path d="m11 5-2 10" /></>,
  bulletList: <><circle cx="4" cy="6" r=".8" fill="currentColor" stroke="none" /><circle cx="4" cy="10" r=".8" fill="currentColor" stroke="none" /><circle cx="4" cy="14" r=".8" fill="currentColor" stroke="none" /><path d="M8 6h9M8 10h9M8 14h9" /></>,
  orderedList: <><path d="M3 5h2v3M3 8h3M3 12.5c0-.8.5-1.5 1.5-1.5S6 11.6 6 12.3c0 .5-.3.9-2.5 2.7H6M9 6h8M9 10h8M9 14h8" /></>,
  taskList: <><rect x="3" y="4" width="4" height="4" rx=".5" /><path d="m3.8 6 1 1 2-2M10 6h7M3 12h4v4H3zM10 14h7" /></>,
  link: <><path d="M8 12.5 6.7 14a3.5 3.5 0 0 1-5-5l3-3a3.5 3.5 0 0 1 5 0" /><path d="M12 7.5 13.3 6a3.5 3.5 0 0 1 5 5l-3 3a3.5 3.5 0 0 1-5 0" /><path d="m7 13 6-6" /></>,
  image: <><rect x="2.5" y="3" width="15" height="14" rx="2" /><circle cx="7" cy="7.5" r="1.5" /><path d="m3 14 4-4 3.5 3 2.5-2.5 4.5 4.5" /></>,
  codeBlock: <><rect x="2.5" y="3" width="15" height="14" rx="2" /><path d="m8 8-2 2 2 2m4-4 2 2-2 2" /></>,
  table: <><rect x="2.5" y="3" width="15" height="14" rx="2" /><path d="M2.5 8h15M2.5 12.5h15M9.5 3v14" /></>,
  divider: <><path d="M3 10h14M7 5h6M7 15h6" /></>,
  undo: <><path d="M8 7H3V2" /><path d="M3 7a8 8 0 1 1 0 6" /></>,
  redo: <><path d="M12 7h5V2" /><path d="M17 7a8 8 0 1 0 0 6" /></>,
  mode: <><path d="M2.5 5.5A2.5 2.5 0 0 1 5 3h10a2.5 2.5 0 0 1 2.5 2.5v9A2.5 2.5 0 0 1 15 17H5a2.5 2.5 0 0 1-2.5-2.5z" /><path d="M10 3v14M5.5 7h2M5.5 10h2M12.5 7h2M12.5 10h2" /></>,
};

export function ToolbarIcon({ name }: { name: ToolbarIconName }) {
  return (
    <svg className="ge-toolbar-icon" viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {paths[name]}
    </svg>
  );
}
