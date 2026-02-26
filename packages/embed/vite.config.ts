import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'HexiGalleryEmbed',
      formats: ['iife'],
      fileName: () => 'embed.js',
    },
    rollupOptions: {
      // Bundle everything — no externals
    },
    minify: 'esbuild',
    outDir: 'dist',
  },
  esbuild: {
    jsxFactory: 'h',
    jsxFragment: 'Fragment',
    jsxImportSource: 'preact',
  },
});
