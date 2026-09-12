import { defineConfig } from 'vite';
import { resolve } from 'node:path';
export default defineConfig({
  server: { host: 'localhost', port: 5186, strictPort: true },
  build: {
    rollupOptions: {
      input: {
        index: resolve('index.html'),
        vanilla: resolve('vanilla.html'),
        react: resolve('react.html'),
      },
    },
  },
});
