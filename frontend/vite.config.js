import { defineConfig } from 'vite'
import tailwindcss from "@tailwindcss/vite";
import { intlayer } from "vite-intlayer";
import react from '@vitejs/plugin-react'

import path from "path";
import { toUSVString } from 'util';

const proxyConfig = {
  target: 'https://localhost:3000',
  changeOrigin: true,
  secure: false,
  configure: (proxy, _options) => {
    proxy.on('proxyRes', (proxyRes, req, res) => {
      delete proxyRes.headers['connection'];
      delete proxyRes.headers['keep-alive'];
      delete proxyRes.headers['upgrade'];
      delete proxyRes.headers['transfer-encoding'];
    });
  },
};

export default defineConfig({
  base: '/',
  server: {
    host: '0.0.0.0',
    port: 4000,
    strictPort: true,
	https: {
		key: './certs/certs/key.pem',
		cert: './certs/certs/cert.pem',
	},
    proxy: {
      '/api': {
        ...proxyConfig,
        rewrite: (path) => path.replace(/^\/api/, ''),
        logLevel: 'debug',
      },
      '/chat/ws': {
        ...proxyConfig,
        target: 'wss://localhost:3000',
        ws: true,
      },
      '/notification/ws': {
        ...proxyConfig,
        target: 'wss://localhost:3000',
        ws: true,
      },
      '/pong/ws': {
        ...proxyConfig,
        target: 'wss://localhost:3000',
        ws: true,
      },
      '/tris/ws': {
        ...proxyConfig,
        target: 'wss://localhost:3000',
        ws: true,
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