import { defineConfig } from 'vite';

// base './' keeps the build working from any sub-path (GitHub Pages, Netlify, a plain folder)
export default defineConfig({
  base: './',
  build: { chunkSizeWarningLimit: 900 },
});
