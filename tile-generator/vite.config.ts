import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/woodtile_ec/',
  plugins: [react()],
  server: {
    port: 5174,
  },
});
