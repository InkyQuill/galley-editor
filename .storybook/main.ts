import type { StorybookConfig } from '@storybook/react-vite';
import { mergeConfig } from 'vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-docs',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  async viteFinal(config) {
    const codemirrorPackages = [
      '@codemirror/state',
      '@codemirror/view',
      '@codemirror/lang-markdown',
      '@codemirror/commands',
    ];

    return mergeConfig(config, {
      optimizeDeps: {
        exclude: codemirrorPackages,
      },
      resolve: {
        dedupe: codemirrorPackages,
        preserveSymlinks: false,
      },
    });
  },
};

export default config;
