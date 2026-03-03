import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  plugins: [react(), basicSsl()],
  server: {
    port: 3000,
    host: '0.0.0.0',
    https: true,
    proxy: {
      '/socket.io': {
        target: 'http://127.0.0.1:5000',
        ws: true,
      },
      '/session': {
        target: 'http://127.0.0.1:5000',
      },
      '/feedback': {
        target: 'http://127.0.0.1:5000',
      },
      '/network-info': {
        target: 'http://127.0.0.1:5000',
      },
      '/meetings': {
        target: 'http://127.0.0.1:5000',
      },
      '/admin': {
        target: 'http://127.0.0.1:5000',
      },
    },
  },
  build: {
    outDir: 'dist',
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    css: false,
  },
});
