import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // KIILA サイトと同じ Xserver の /tile-generator/ で配信する。
  base: '/tile-generator/',
  plugins: [react()],
  build: {
    // Astro が public/ をそのまま dist/ にコピーするため、生成物をここへ出す。
    outDir: '../public/tile-generator',
    emptyOutDir: true,
  },
  server: {
    port: 5174,
  },
});
