import { defineConfig } from 'vite'

import react from '@vitejs/plugin-react'
// import path from 'path'
import tsconfigPaths from 'vite-tsconfig-paths'
import webExtension from 'vite-plugin-web-extension'

/** @type {import('vite').UserConfig} */
export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths(),
    webExtension({
      manifest: 'src/manifest.json',
      watchFilePaths: ['src/**/*']
    }),
  ],
  publicDir: 'public',
  build: {
    emptyOutDir: true,
  },
})
