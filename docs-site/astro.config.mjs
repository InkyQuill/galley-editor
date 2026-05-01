import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

const site = process.env.GALLEY_DOCS_SITE ?? 'https://pages.inkyquill.net';
const configuredBase = process.env.GALLEY_DOCS_BASE ?? '/inky/galley-editor';
const base = configuredBase === '/' ? '' : configuredBase.replace(/\/$/, '');

export default defineConfig({
  site,
  ...(base ? { base } : {}),
  trailingSlash: 'always',
  integrations: [
    starlight({
      title: 'Galley Editor',
      description: 'A live-preview Markdown editor for React, built on CodeMirror 6.',
      favicon: '/favicon.svg',
      logo: {
        src: './src/assets/galley-color.png',
        alt: 'Galley Editor',
      },
      customCss: ['./src/styles/starlight.css'],
      social: [
        {
          icon: 'gitlab',
          label: 'GitLab',
          href: 'https://git.inkyquill.net/inky/galley-editor',
        },
      ],
      sidebar: [
        { label: 'Overview', slug: 'index' },
        {
          label: 'Guides',
          items: [
            { label: 'Installation', slug: 'guides/installation' },
            { label: 'Quick Start', slug: 'guides/quick-start' },
            { label: 'Complete Guide', slug: 'guides/complete-guide' },
            { label: 'Customization', slug: 'guides/customization' },
            { label: 'Plugins and Renderers', slug: 'guides/plugins-renderers' },
            { label: 'Storybook', slug: 'guides/storybook' },
          ],
        },
        {
          label: 'Reference',
          items: [
            { label: 'API Reference', slug: 'reference/api' },
            { label: 'Architecture', slug: 'internals/architecture' },
          ],
        },
        {
          label: 'Project',
          items: [
            { label: 'Roadmap', slug: 'releases/roadmap' },
            { label: 'v0.8.0', slug: 'releases/v0-8-0' },
            { label: 'v0.9.0', slug: 'releases/v0-9-0' },
            { label: 'v0.7.0', slug: 'releases/v0-7-0' },
          ],
        },
      ],
    }),
  ],
});
