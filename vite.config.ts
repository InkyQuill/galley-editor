import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
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
    '@lezer/highlight',
    '@lezer/markdown',
    '@lezer/common',
  ];

  return {
    plugins: [react()],
    optimizeDeps: {
      // Exclude CodeMirror from optimization to prevent multiple instances
      exclude: codemirrorPackages,
      // Force re-optimization
      force: true,
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src')
      },
      dedupe: codemirrorPackages,
      // Preserve symlinks to ensure same instance
      preserveSymlinks: false,
    },
    build: isLib ? {
      lib: {
        entry: resolve(__dirname, 'src/components/index.ts'),
        name: 'NeutrinoEditor',
        fileName: 'index',
        formats: ['es']
      },
      rolldownOptions: {
        external: ['react', 'react-dom', ...codemirrorPackages],
        output: {
          globals: {
            react: 'React',
            'react-dom': 'ReactDOM'
          }
        }
      }
    } : undefined,
  }
})
