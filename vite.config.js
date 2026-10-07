import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

const apiPort = Number(process.env.API_PORT ?? 5174);

export default defineConfig({
  root: 'web',
  plugins: [vue()],
  server: {
    port: Number(process.env.PORT ?? 5173),
    strictPort: true,
    proxy: {
      '/api': {
        target: `http://localhost:${apiPort}`,
        changeOrigin: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
