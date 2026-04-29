import type { NeutrinoPlugin } from '../types';
import headingsPlugin from './headings';
import emphasisPlugin from './emphasis';
import codeInlinePlugin from './code-inline';
import codeFencePlugin from './code-fence';
import blockquotePlugin from './blockquote';
import linksPlugin from './links';
import imagesPlugin from './images';
import listsPlugin from './lists';
import checkboxesPlugin from './checkboxes';
import dividersPlugin from './dividers';
import tablesPlugin from './tables';

export const BUILT_IN_PLUGINS: NeutrinoPlugin[] = [
  headingsPlugin,
  emphasisPlugin,
  codeInlinePlugin,
  codeFencePlugin,
  blockquotePlugin,
  linksPlugin,
  imagesPlugin,
  listsPlugin,
  checkboxesPlugin,
  dividersPlugin,
  tablesPlugin,
];

export {
  headingsPlugin,
  emphasisPlugin,
  codeInlinePlugin,
  codeFencePlugin,
  blockquotePlugin,
  linksPlugin,
  imagesPlugin,
  listsPlugin,
  checkboxesPlugin,
  dividersPlugin,
  tablesPlugin,
};
