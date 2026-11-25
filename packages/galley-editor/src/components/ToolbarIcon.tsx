import type { ToolbarIconName } from '../types';

const paths: Record<ToolbarIconName | 'toolbar' | 'command', string> = {
  bold: 'M6 4h7a4 4 0 0 1 0 8H6m0-8v16h8a4 4 0 0 0 0-8h-1',
  heading: 'M5 5v14M19 5v14M5 12h14',
  command: 'M5 6h14v12H5zM8 10l2 2-2 2m4 0h4',
  italic: 'M11 4h8M5 20h8M15 4 9 20',
  strikethrough: 'M5 12h14m-3-5c-1-2-2.5-3-5-3-3 0-5 1.5-5 4 0 2 2 3 5 4s6 2 6 4c0 2.5-2 4-5 4-2.5 0-4.5-1-6-3',
  inlineCode: 'm7 7-5 5 5 5m10-10 5 5-5 5M14 5l-4 14',
  bulletList: 'M4 6h.01M4 12h.01M4 18h.01M8 6h12M8 12h12M8 18h12',
  orderedList: 'M3 4h1v5M3 9h2m-2 5c3-2 4 1 0 4h3M9 7h11M9 16h11',
  taskList: 'm3 6 2 2 3-4m3 3h9M4 13h3v3H4zm7 1.5h9M4 20h3m4 0h9',
  link: 'm10 13 4-4m-6 6-1 1a3 3 0 0 1-4-4l4-4a3 3 0 0 1 4 0m2 6a3 3 0 0 0 4 0l4-4a3 3 0 0 0-4-4l-1 1',
  image: 'M4 5h16v14H4zm0 11 5-5 4 4 2-2 5 5M15 9h.01',
  codeBlock: 'M6 3h8l4 4v14H6zm8 0v5h4m-7 3-2 3 2 3m2-6 2 3-2 3',
  table: 'M3 5h18v14H3zm0 5h18M3 15h18M9 5v14m6-14v14',
  divider: 'M4 12h16',
  undo: 'M8 5 3 10l5 5m-5-5h11a5 5 0 0 1 0 10h-4',
  redo: 'm16 5 5 5-5 5m5-5H10a5 5 0 0 0 0 10h4',
  mode: 'M4 5h16v14H4zm0 5h16m-9 0v9',
  toolbar: 'M3 5h18v14H3zm0 5h18M7 7.5h.01m4 0h.01m4 0h.01',
};

function Icon({ name, size }: { name: keyof typeof paths; size: number }) {
  return (
    <svg
      className="ge-toolbar-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}

export function ToolbarIcon({ name }: { name: ToolbarIconName | 'command' }) {
  return <Icon name={name} size={18} />;
}

export function ToolbarToggleIcon() {
  return <Icon name="toolbar" size={16} />;
}
