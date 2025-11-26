import { isLoggedInClient } from './lib/auth';

type RouteConfig = { html: string; script?: string };
const routes: Record<string, RouteConfig> = {
  '/': { html: './pages/profile-page/profilepage.html', script: './pages/profile-page/profilepage.ts' },
  '/login': { html: './pages/login/login.html', script: './pages/login/login.ts' },
  '/register': { html: './pages/register/register.html', script: './pages/register/register.ts' },
  '/profile': { html: './pages/profile-info/profile.html', script: './pages/profile-info/profile.ts' }
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
    // Resolve HTML path relative to this module so Vite serves the correct URL
    const htmlUrl = new URL(route.html, import.meta.url).href;
    const res = await fetch(htmlUrl);
    if (!res.ok) throw new Error(`Failed to load ${htmlUrl}: ${res.status}`);
    const html = await res.text();
    container.innerHTML = html;

    
    // Load script if provided (dynamic import)
    if (route.script) {
      try {
        // Resolve script URL relative to this module and import as module
        const scriptUrl = new URL(route.script, import.meta.url).href;
        await import(/* @vite-ignore */ scriptUrl);
      } catch (err) {
        // If dynamic import with .ts fails, attempt .js
        try {
          const alt = new URL(route.script.replace(/\.ts$/, '.js'), import.meta.url).href;
          await import(/* @vite-ignore */ alt);
        } catch (_) {
          console.warn('Page script import failed', err);
        }
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