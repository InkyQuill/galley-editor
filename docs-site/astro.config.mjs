import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

const site = process.env.GALLEY_DOCS_SITE ?? 'https://inkyquill.github.io';
const configuredBase = process.env.GALLEY_DOCS_BASE ?? '/galley-editor';
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
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/InkyQuill/galley-editor',
        },
      ],
      sidebar: [
        { label: 'Overview', slug: 'index' },
        {
          label: 'Start',
          items: [
            { label: 'Installation', slug: 'guides/installation' },
            { label: 'Quick Start', slug: 'guides/quick-start' },
          ],
        },
        {
          label: 'Build',
          items: [
            { label: 'Customization', slug: 'guides/customization' },
            { label: 'Commands', slug: 'guides/commands' },
            { label: 'Plugins and Renderers', slug: 'guides/plugins-renderers' },
            { label: 'File Uploads', slug: 'guides/uploads' },
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
            { label: 'v0.11.0', slug: 'releases/v0-11-0' },
            { label: 'v0.10.2', slug: 'releases/v0-10-2' },
            { label: 'v0.10.1', slug: 'releases/v0-10-1' },
            { label: 'v0.10.0', slug: 'releases/v0-10-0' },
          ],
        },
      ],
    }),
  ],
});
