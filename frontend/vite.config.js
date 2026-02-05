import { defineConfig, loadEnv } from 'vite'
import tailwindcss from "@tailwindcss/vite";
import { intlayer } from "vite-intlayer";
import react from '@vitejs/plugin-react'

import path from "path";
import { toUSVString } from 'util';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  const proxyConfig = {
    target: env.VITE_API_TARGET || 'https://localhost:3000',
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

  const wsProxyConfig = {
    target: env.VITE_WS_TARGET || 'wss://localhost:3000',
    ws: true,
    changeOrigin: true,
    secure: false,
    rejectUnauthorized: false,
    configure: (proxy, _options) => {
      proxy.on('error', (err, req, res) => {
        console.error('[ws proxy error]', err);
      });
      proxy.on('proxyReq', (proxyReq, req, res) => {
        proxyReq.setHeader('Origin', env.VITE_WS_TARGET || 'wss://localhost:3000');
      });
    },
  };

  return {
    base: '/',
    server: {
      host: env.HOST,
      port: parseInt(env.VITE_PORT) || 4000,
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
        '/chat/ws': wsProxyConfig,
        '/notification/ws': wsProxyConfig,
        '/pong/ws': wsProxyConfig,
        '/tris/ws': wsProxyConfig,
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
  };
});