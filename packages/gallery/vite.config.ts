import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  // Library build configuration
  if (mode === 'lib') {
    return {
      plugins: [
        react(),
        dts({
          include: ['src'],
          exclude: ['src/__tests__', 'src/main.tsx', 'src/App.tsx'],
          rollupTypes: true,
        }),
      ],
      build: {
        lib: {
          entry: resolve(__dirname, 'src/index.ts'),
          name: 'HexiGallery',
          formats: ['es', 'cjs'],
          fileName: (format) => `index.${format === 'es' ? 'js' : 'cjs'}`,
        },
        rollupOptions: {
          external: ['react', 'react-dom', 'react/jsx-runtime'],
          output: {
            globals: {
              react: 'React',
              'react-dom': 'ReactDOM',
              'react/jsx-runtime': 'jsxRuntime',
            },
          },
        },
        sourcemap: true,
        cssCodeSplit: false,
      },
    };
  }

  // Development configuration
  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
    },
  };
});
