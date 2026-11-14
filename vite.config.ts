import { defineConfig } from 'vite';

export default defineConfig({
  base: '/WhiteSignalGame/',
  build: {
    rollupOptions: {
      // Three.js changes rarely; a separate chunk stays cached across game updates.
      output: { manualChunks: { three: ['three'] } },
    },
    // The minified Three.js chunk alone is ~520 kB (133 kB gzipped).
    chunkSizeWarningLimit: 600,
  },
});
