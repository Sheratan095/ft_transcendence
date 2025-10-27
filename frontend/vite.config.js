import { defineConfig } from 'vite'

export default defineConfig({
  base: '/',
  server: {
    port: 3004,
    strictPort: true,
  },
  resolve: {
    alias: {
      '@': '/src',
    }
  },
  publicDir: 'public',
})