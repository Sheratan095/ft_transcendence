import { isLoggedInClient } from './lib/auth';
import { renderProfile } from './lib/profile';
import { logout } from './lib/token';
import { attachLogin } from './components/auth/LoginForm';
import { showErrorToast } from './components/shared';
import { renderProfileCard } from './components/profile';

type RouteConfig = { render: () => Promise<void> };
const routes: Record<string, RouteConfig> = {
  '/': { 
    render: async () => {

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
    el.innerHTML = '';

    const clone = template.content.cloneNode(true);
    el.appendChild(clone);

    // Populate profile content using renderProfile
    try {
    const content = el.querySelector('#profile-content') as HTMLElement;
    await renderProfileCard(content, undefined);
    } catch (err) {
    console.error('Failed to render profile:', err);
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
  // Detect if this is a back/forward navigation
  const currentIndex = navigationHistory.indexOf(location.pathname);
  const targetIndex = navigationHistory.indexOf(path);
  
  if (targetIndex !== -1 && targetIndex < currentIndex) {
    isBackNavigation = true;
  } else {
    isBackNavigation = false;
    // Add to history if new path
    if (!navigationHistory.includes(path)) {
      navigationHistory.push(path);
    }
  }
  
  history.pushState({}, '', path);
  await renderRoute(path);
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

export { goToRoute };
export default { start, goToRoute };