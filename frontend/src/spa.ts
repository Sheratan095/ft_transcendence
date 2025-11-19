import { isLoggedInClient } from './lib/auth';

type RouteConfig = { html: string; script?: string };

const routes: Record<string, RouteConfig> = {
  '/': { html: '/src/pages/profile-page/profilepage.html', script: '/src/pages/profile-page/profilepage.ts' },
  '/login': { html: '/src/pages/login/login.html', script: '/src/pages/login/login.ts' },
  '/register': { html: '/src/pages/register/register.html', script: '/src/pages/register/register.ts' },
  '/profile': { html: '/src/pages/profile-info/profile.html', script: '/src/pages/profile-info/profile.ts' }
};

async function navigate(path: string) {
  history.pushState({}, '', path);
  await renderRoute(path);
}

async function renderRoute(path: string) {
  const container = document.getElementById('app');
  if (!container) return;
  container.innerHTML = '<div class="py-8">Loading...</div>';
  const route = routes[path] || routes['/'];
  try {
    // Load HTML
    const res = await fetch(route.html);
    if (!res.ok) throw new Error(`Failed to load ${route.html}: ${res.status}`);
    const html = await res.text();
    container.innerHTML = html;

    
    // Load script if provided (dynamic import)
    if (route.script) {
      try {
        // ensure script executes as module; Vite supports TS imports
        await import(route.script);
      } catch (err) {
        // If dynamic import with .ts fails, attempt without extension
        try { await import(route.script.replace(/\.ts$/, '.js')); } catch (_) { console.warn('Page script import failed', err); }
      }
    }
  } catch (err) {
    container.innerHTML = `<div class="text-red-600">Error loading page</div>`;
    console.error(err);
  }
}

export function linkify() {
  document.addEventListener('click', (ev) => {
    const a = (ev.target as HTMLElement).closest('a');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href) return;
    if (href.startsWith('/')) {
      ev.preventDefault();
      navigate(href);
    }
  });
}

export async function start() {
  // mount root app container if missing
  if (!document.getElementById('app')) {
    const app = document.createElement('div');
    app.id = 'app';
    document.body.appendChild(app);
  }
  linkify();
  window.addEventListener('popstate', () => renderRoute(location.pathname));
  // Decide initial route: if user not logged in, show login
  let initial = location.pathname || '/';
  if (initial === '/' && !isLoggedInClient()) initial = '/login';
  await renderRoute(initial);
}

export default { start, navigate };