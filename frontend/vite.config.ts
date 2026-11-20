/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// API calls stay on the page's own origin: in development Vite forwards /api to
// the backend; in Docker nginx does the same. So the backend needs no CORS.
// BACKEND_URL is read from the shell environment (Vite does not load .env into
// process.env for its own config).
const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:3000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': backendUrl },
  },
  test: {
    environment: 'jsdom',
    include: ['test/**/*.test.{ts,tsx}'],
    setupFiles: ['test/setup.ts'],
    restoreMocks: true,
  },
});
