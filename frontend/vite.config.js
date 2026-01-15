import { defineConfig } from 'vite'
import tailwindcss from "@tailwindcss/vite";
import { intlayer } from "vite-intlayer";
import react from '@vitejs/plugin-react'

import path from "path";
import { toUSVString } from 'util';

export default defineConfig({
  base: '/',
  server: {
    port: 4000,
    strictPort: true,
	https: {
		key: './certs/certs/key.pem',
		cert: './certs/certs/cert.pem',
	},
    proxy: {
      '/api': {
		port:3000,
        target: 'https://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        secure: false,
        logLevel: 'debug', // Enable debug logging to see what's happening
      },
    }
  },
  resolve: {
    alias: {
      '@': '/src',
    }
  },
  publicDir: 'public',
  plugins: [
		react(),
		tailwindcss(),
		intlayer(),

		{
			name: 'reload-on-frontend-ts',
			handleHotUpdate({ file, server }) {
				const relativePath = path.relative(process.cwd(), file);
				const isInFrontend = relativePath.startsWith('frontend' + path.sep);

				const validExtensions = ['.ts', '.js', '.html', '.css'];
				const hasValidExtension = validExtensions.some(ext => file.endsWith(ext));

				if (isInFrontend && hasValidExtension) {
					console.log(`[vite] Change detected in ${relativePath}. Triggering full page reload.`);
					server.ws.send({
						type: 'full-reload',
						path: '*',
					});
				}

				return [];
			},
		},
	],
})