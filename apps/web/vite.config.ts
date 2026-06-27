import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// During dev, the web app runs on :5173 and proxies /api calls to the
// local server on :3001 — so everything feels like one origin.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});
