import { defineConfig } from 'vite'

import react from '@vitejs/plugin-react'
import path from 'path'
import tsconfigPaths from 'vite-tsconfig-paths'
// import webExtension from 'vite-plugin-web-extension'

/** @type {import('vite').UserConfig} */
export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths(),
    // webExtension(),
  ],
  publicDir: 'public',
  build: {
    emptyOutDir: true,
    sourcemap: 'inline',
    rollupOptions: {
      input: {
        popup: path.resolve(__dirname, 'public', 'index.html'),
        background: path.resolve(__dirname, 'src', 'service-worker', 'index.ts'),
      },
      output: {
        assetFileNames: '[name].[extname]',
        chunkFileNames: '[name].js',
        entryFileNames: '[name].js',
        dir: 'build',
      },
      plugins: [
        {
          name: 'move-html-to-root',
          generateBundle(_, bundle) {
            for (const [_, chunk] of Object.entries(bundle)) {
              if (chunk.fileName.endsWith('.html')) {
                chunk.fileName = chunk.fileName.replace('public/', '');
              }
            }
          }
        }
      ]
    },
  },
})
