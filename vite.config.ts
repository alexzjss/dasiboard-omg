import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    // Server tests run in node (they also carry a `@vitest-environment node` docblock).
    setupFiles: ['server/test/env.ts'],
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
