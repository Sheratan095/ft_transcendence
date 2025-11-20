import { defineConfig } from 'vite'
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  base: '/',
  server: {
    port: 443,
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
  plugins: [
		tailwindcss(),

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