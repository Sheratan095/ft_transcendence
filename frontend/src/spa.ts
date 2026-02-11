import { isLoggedInClient } from './lib/auth';
import { attachLogin } from './components/auth/LoginForm';
import { showErrorToast } from './components/shared';
import { renderProfileCard, renderSearchProfileCard } from './components/profile';
import { initCardHoverEffect } from './lib/card';

type RouteConfig = { render: () => Promise<void> };
const routes: Record<string, RouteConfig> = {
  '/': { 
    render: async () => {
      const el = document.getElementById('main-content');
      const template = document.getElementById('home-template') as HTMLTemplateElement | null;
      if (!el || !template) return;
      el.innerHTML = '';
      const clone = template.content.cloneNode(true);
      el.appendChild(clone);
      initCardHoverEffect();
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
    const el = document.getElementById('main-content');
    if (!el) return;
    if (!isLoggedInClient()) {
    goToRoute('/login');
    showErrorToast('Please sign in to view your profile');
    return;
    }
    el.innerHTML = '';

    // Check if viewing another user via query param
    const params = new URLSearchParams(window.location.search);
    const userId = params.get('id');

    if (userId && userId !== 'current-user-id')
    {
      // Render search profile card for another user
      try {
        await renderSearchProfileCard(userId, el);
      } catch (err) {
        console.error('Failed to load user profile:', err);
        el.innerHTML = '<div class="text-red-500 text-center mt-8">Failed to load user profile</div>';
      }
      return;
    }

    // Render logged-in user's profile
    try {
      console.log('Calling renderProfileCard...');
      if (typeof renderProfileCard !== 'function') {
        throw new Error('renderProfileCard is not a function (possible circular dependency)');
      }
      await renderProfileCard(el);
      console.log('Profile card rendered');
    } catch (err) {
      console.error('Failed to render profile:', err);
      el.innerHTML = '<div class="text-red-500 text-center mt-8">Failed to load profile</div>';
    }
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
  const url = new URL(path, window.location.origin);
  
  // Real SPA navigation
  if (url.pathname + url.search !== window.location.pathname + window.location.search) {
    history.pushState(null, '', path);
    await renderRoute(url.pathname);
  } else {
    // If already on the path, we can still re-render or do nothing
    // To support clicking the same link to refresh:
    await renderRoute(url.pathname);
  }
}

async function renderRoute(path: string) {
  const route = routes[path] || routes['/'];
  
  try {
    // Use View Transitions API for smooth page transitions
    const transitionFn = async () => {
      await route.render();
      window.dispatchEvent(new CustomEvent('route-rendered', { detail: { path } }));
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
      // Allow explicit new-tab/open/download links to behave normally
      const target = a.getAttribute('target');
      if (target === '_blank' || a.hasAttribute('download') || a.hasAttribute('data-no-spa')) {
        return;
      }
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

export { goToRoute };
export default { start, goToRoute };