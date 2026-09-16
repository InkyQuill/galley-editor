import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dts from 'vite-plugin-dts'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isLib = mode === 'lib'

  const codemirrorPackages = [
    '@codemirror/state',
    '@codemirror/view',
    '@codemirror/lang-markdown',
    '@codemirror/language',
    '@codemirror/commands',
    '@codemirror/search',
    '@lezer/highlight',
    '@lezer/markdown',
    '@lezer/common',
  ];

  return {
    plugins: [
      react(),
      ...(isLib
        ? [
            dts({
              tsconfigPath: 'tsconfig.lib.json',
              rollupTypes: true,
              insertTypesEntry: true,
            }),
          ]
        : []),
    ],
    optimizeDeps: {
      exclude: codemirrorPackages,
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
      dedupe: codemirrorPackages,
      preserveSymlinks: false,
    },
    build: isLib
      ? {
          lib: {
            entry: resolve(__dirname, 'src/components/index.ts'),
            name: 'GalleyEditor',
            fileName: 'index',
            formats: ['es'],
          },
          cssCodeSplit: false,
          rollupOptions: {
            external: ['react', 'react-dom', 'react/jsx-runtime', ...codemirrorPackages],
            output: {
              globals: {
                react: 'React',
                'react-dom': 'ReactDOM',
              },
              assetFileNames: (assetInfo) =>
                assetInfo.name === 'style.css' ? 'style.css' : 'assets/[name][extname]',
            },
          },
        }
      : undefined,
  }
})
