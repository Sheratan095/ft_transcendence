import { isLoggedInClient } from './lib/auth';
import { logout } from './lib/token';
import { attachLogin } from './components/auth/LoginForm';
import { showErrorToast } from './components/shared';
import { renderProfileCard } from './components/profile/ProfileCard';
import { initCardHoverEffect } from './lib/card';

type RouteConfig = { render: () => Promise<void> };
const routes: Record<string, RouteConfig> = {
  '/': { 
    render: async () => {
	  const el = document.getElementById('main-content');

    }
  },
  '/login': {
  render: async () => {
	if (isLoggedInClient()) {
		showErrorToast('Already logged in');
		return;
	}
    const el = document.getElementById('main-content');
    const template = document.getElementById('login-template') as HTMLTemplateElement | null;

    if (!el || !template) return;

    el.innerHTML = '';

    const clone = template.content.cloneNode(true);
    el.appendChild(clone);

    attachLogin();
	initCardHoverEffect();
  }
  },
  '/profile': {
    render: async () => {
    const template = document.getElementById('profile-template') as HTMLTemplateElement | null;
    const el = document.getElementById('main-content');
    if (!el || !template) return;
    if (!isLoggedInClient()) {
    goToRoute('/login');
    showErrorToast('Please sign in to view your profile');
    return;
    }
	animatePolygonToBottom();
    el.innerHTML = '';

    const clone = template.content.cloneNode(true);
    el.appendChild(clone);
    try {
      // Find the actual profile card root (not just #profile-content)
      const content = el.querySelector('#profile-content') as HTMLElement | null;
      // If the template has a single card child, use it
      let cardRoot = content;
      if (content && content.children.length === 1 && content.children[0] instanceof HTMLElement) {
        cardRoot = content.children[0] as HTMLElement;
      }
      await renderProfileCard(cardRoot ?? content ?? el);
    } catch (err) {
      console.error('Failed to render profile:', err);
    }
	initCardHoverEffect();
    }
  },
  '/pong': { 
    render: async () => {
      const el = document.getElementById('main-content');
      if (!el) return;
      el.innerHTML = '<div class="py-8">Pong game loading...</div>';
      // Import and render pong component
      try {
        const pongModule = await import('./lib/pong-ui');
        await pongModule.openPongModal();
      } catch (err) {
        el.innerHTML = '<div class="text-red-600">Failed to load Pong game</div>';
      }
    }
  },
  '/tris': { 
    render: async () => {
      const el = document.getElementById('main-content');
      if (!el) return;
      el.innerHTML = '<div class="py-8">Tris game loading...</div>';
      // Import and render tris component
      try {
        const trisModule = await import('./lib/tris-ui');
        await trisModule.openTrisModal();
      } catch (err) {
        el.innerHTML = '<div class="text-red-600">Failed to load Tris game</div>';
      }
    }
  }
};
// Navigation history for detecting back/forward
let navigationHistory: string[] = [];
let isBackNavigation = false;

/**
 * Main routing function - handles path navigation and rendering
 * Updates browser history, detects back/forward navigation, and renders the appropriate route
 */
async function goToRoute(path: string) {
  // Instead of SPA rendering, do a full page reload
  if (window.location.pathname !== path) {
    window.location.assign(path);
  } else {
    // If already on the path, force reload
    window.location.reload();
  }
}

async function renderRoute(path: string) {
  const route = routes[path] || routes['/'];
  
  try {
    // Use View Transitions API for smooth page transitions
    const transitionFn = async () => {
      await route.render();
    };
    
    if (document.startViewTransition) {
      const transition = document.startViewTransition(transitionFn);
      document.documentElement.dataset.transitionDirection = isBackNavigation ? 'back' : 'forward';
      
      await transition.finished;
      delete document.documentElement.dataset.transitionDirection;
    } else {
      await transitionFn();
    }
  } catch (err) {
    const el = document.getElementById('main-content');
    if (el) {
      el.innerHTML = `<div class="text-red-600">Error loading page</div>`;
    }
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
      goToRoute(href);
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
  let initial = location.pathname || '/';
  await renderRoute(initial);
}

export function animatePolygonToBottom(): void {
	const polygon = document.querySelector(
		'.mix-blend-difference'
	) as HTMLElement | null;

	if (!polygon) return;

	polygon.style.transition = "clip-path 0.6s ease-in-out";
	polygon.style.clipPath = "polygon(0% 90%, 100% 90%, 100% 100%, 0% 100%)";
}

export { goToRoute };
export default { start, goToRoute };