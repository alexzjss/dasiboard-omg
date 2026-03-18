import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  base: './',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main:    resolve(__dirname, 'index.html'),
        login:   resolve(__dirname, 'login.html'),
        signup:  resolve(__dirname, 'signup.html'),
        profile: resolve(__dirname, 'profile.html'),
      },
    },
    // Gera sourcemaps para debugging
    sourcemap: true,
    // Não minifica em dev para legibilidade
    minify: 'esbuild',
  },
  server: {
    open: true,
    port: 5173,
  },
});
