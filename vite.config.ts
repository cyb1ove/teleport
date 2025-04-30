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
  // resolve: {
  //   alias: {
  //     os: 'os-browserify', // Alias for the os polyfill
  //     buffer: 'buffer', // Alias for the buffer polyfill
  //     crypto: 'crypto-browserify', // Alias for the crypto polyfill
  //     stream: 'stream-browserify', // Alias for the stream polyfill
  //     util: 'util',        // Alias for the util polyfill
  //     process: 'process/browser', // Alias for the process polyfill
  //   },
  // },
  // define: {
  //   global: {},
  //   'process.env': {},
  // },
  publicDir: 'public',
  build: {
    emptyOutDir: true,
  },
})
