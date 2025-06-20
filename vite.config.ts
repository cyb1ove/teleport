import { defineConfig } from 'vite'

import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import webExtension from 'vite-plugin-web-extension'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

/** @type {import('vite').UserConfig} */
export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths(),
    webExtension({
      manifest: 'src/manifest.json',
      watchFilePaths: ['src/**/*']
    }),
    nodePolyfills({
      protocolImports: true,
    }),
  ],
  optimizeDeps: {
    include: ['buffer', 'process'],
  },
  publicDir: 'public',
  build: {
    emptyOutDir: true,
  },
})
