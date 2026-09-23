import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          tf: ['@tensorflow/tfjs', '@tensorflow-models/coco-ssd'],
        },
      },
    },
  },
});
