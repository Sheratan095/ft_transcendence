import { defineConfig } from 'vite'

export default defineConfig({
  base: '/',
  server: {
    port: 3004,
    strictPort: true,
    proxy: {
      '/api': 'http://localhost:3000'
    }
  },
  resolve: {
    alias: {
      '@': '/src',
    }
  },
  publicDir: 'public',
})