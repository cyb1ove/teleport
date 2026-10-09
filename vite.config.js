import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig({
  // GramJS is written for Node and imports Buffer, process, os, crypto, etc.
  // `vm` is excluded: its polyfill calls eval, which the MV3 CSP forbids. Its only user
  // (asn1.js, via crypto-browserify) already falls back when it is missing.
  plugins: [nodePolyfills({ exclude: ["vm"] })],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "esnext",
    rolldownOptions: {
      input: { popup: "popup.html" },
    },
  },
});
