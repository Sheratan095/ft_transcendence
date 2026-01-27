// Simple fetch proxy to rewrite `/api` calls to the configured API URL at runtime.
// This helps the built frontend (served by `serve` in Docker) to call the gateway service by name.

// Vite exposes env at build time as import.meta.env, but TypeScript's ImportMeta may not include it.
// Use a safe access pattern and fall back to a global injected value.
const apiUrl = ((typeof (globalThis as any).importMetaEnv !== 'undefined' && (globalThis as any).importMetaEnv.VITE_API_URL)
  || ((import.meta as any).env && (import.meta as any).env.VITE_API_URL)
  || (globalThis as any).__VITE_API_URL
  || '');

function rewriteUrl(url: RequestInfo): RequestInfo {
  try {
    if (typeof url === 'string' && url.startsWith('/api')) {
      // Remove leading /api and join with apiUrl
      const newPath = url.replace(/^\/api/, '');
      // Ensure apiUrl has no trailing slash
      const base = apiUrl.replace(/\/+$/, '');
      return base + newPath;
    }
  } catch (err) {
    // fallback to original url
  }
  return url;
}

if (typeof globalThis !== 'undefined' && (globalThis as any).fetch) {
  const originalFetch = (globalThis as any).fetch.bind(globalThis);
  (globalThis as any).fetch = (input: any, init?: RequestInit) => {
    const newUrl = rewriteUrl(input);
    return originalFetch(newUrl, init);
  };
}

export {};
