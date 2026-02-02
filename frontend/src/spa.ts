import { isLoggedInClient } from './lib/auth';
import { renderProfile } from './lib/profile';
import { createLoginForm, createRegisterForm } from './components/auth';

type RouteConfig = { render: () => Promise<void> };
const routes: Record<string, RouteConfig> = {
  '/': { 
    render: async () => {
      const el = document.getElementById('auth-container');
      if (!el) return;
      if (!isLoggedInClient()) {
        window.location.pathname = '/login';
        return;
      }
      el.innerHTML = '';
      await renderProfile(el);
    }
  },
  '/login': { 
    render: async () => {
      const el = document.getElementById('auth-container');
      if (!el) return;
      el.innerHTML = '';
      const { form } = createLoginForm({
        onRegisterClick: () => navigate('/register')
      });
      el.appendChild(form);
    }
  },
  '/register': { 
    render: async () => {
      const el = document.getElementById('auth-container');
      if (!el) return;
      el.innerHTML = '';
      const { form } = createRegisterForm({
        onLoginClick: () => navigate('/login')
      });
      el.appendChild(form);
    }
  },
  '/profile': { 
    render: async () => {
      const el = document.getElementById('auth-container');
      if (!el) return;
      el.innerHTML = '';
      await renderProfile(el);
    }
  },
  '/pong': { 
    render: async () => {
      const el = document.getElementById('auth-container');
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
      const el = document.getElementById('auth-container');
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

async function navigate(path: string) {
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
    
    // Check if View Transitions API is supported
    if (document.startViewTransition) {
      const transition = document.startViewTransition(transitionFn);
      // Set animation direction on document for CSS to consume
      document.documentElement.dataset.transitionDirection = isBackNavigation ? 'back' : 'forward';
      
      await transition.finished;
      // Clean up the attribute after transition completes
      delete document.documentElement.dataset.transitionDirection;
    } else {
      // Fallback for browsers that don't support View Transitions API
      await transitionFn();
    }
  } catch (err) {
    const el = document.getElementById('auth-container');
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

export { navigate };
export default { start, navigate };