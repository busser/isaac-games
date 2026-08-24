import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        launcher: fileURLToPath(new URL('./index.html', import.meta.url)),
        readyGo: fileURLToPath(new URL('./ready-go.html', import.meta.url)),
      },
    },
  },
  test: {
    environment: 'node',
  },
});
