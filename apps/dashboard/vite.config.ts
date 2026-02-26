import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 4101,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.API_PORT || '4100'}`,
        changeOrigin: true,
      },
    },
  },
});
