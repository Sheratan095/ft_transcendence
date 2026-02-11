import type { User } from '../lib/auth';
import { initChat } from './chat';
import { renderProfileCard } from '../components/profile';

export async function attachUserOptions() {
	const userOptions = document.getElementById('user-options') as HTMLElement | null;
	if (!userOptions) return;
	
	userOptions.classList.remove('hidden'); 
	const raw = localStorage.getItem('user');
	const user: User | null = raw ? JSON.parse(raw) : null;
	if (!user || !user.id) {
		userOptions.classList.add('hidden');
		return;
	}

	const avatar = userOptions.querySelector('#topbar-avatar') as HTMLImageElement | null;
	const usernameEl = userOptions.querySelector('#topbar-username') as HTMLElement | null;
	
	if (avatar) {
		avatar.src = user.avatarUrl || '/assets/placeholder-avatar.jpg';
	}
	if (usernameEl) {
		usernameEl.textContent = user.username || 'Unknown User';
	}
}

export async function renderProfile(container?: HTMLElement | string): Promise<HTMLElement | null> {
  // Resolve root element:
  let root = typeof container === 'string' ? document.querySelector(container) : container;

  // If no container passed, try the profile-specific slot, then fallback to main content
  if (!root) {
    root = document.getElementById('profile-content') as HTMLElement | null;
  }
  if (!root) {
    root = document.getElementById('main-content') as HTMLElement | null;
  }

  if (!root) {
    console.warn('renderProfile: target container not found');
    return null;
  }

  // If caller passed the main container but there's a #profile-content inside it, prefer that
  const preferred = (root instanceof HTMLElement) ? (root.querySelector ? (root.querySelector('#profile-content') as HTMLElement | null) : null) : null;
  const target = preferred ?? root;

  // show loading state
  target.innerHTML = '';
  const loading = document.createElement('div');
  loading.className = 'py-8 text-center text-neutral-400';
  loading.textContent = 'Loading profile...';
  target.appendChild(loading);

  const raw = localStorage.getItem('user');
  const user: User | null = raw ? JSON.parse(raw) : null;
  console.log('Fetched user profile:', user);
  // Remove loading placeholder
  if (loading.parentElement) loading.parentElement.removeChild(loading);

  if (!user || !user.id) {
    // Invalid user state — clear local storage and reload to force auth
    localStorage.removeItem('userId');
    localStorage.removeItem('user');
    localStorage.removeItem('tfaEnabled');
    console.warn('renderProfile: no valid user found, reloading');
    location.reload();
    return null;
  }

  // Ensure tfa flag is accurate
  (user as any).tfaEnabled = localStorage.getItem('tfaEnabled') === 'true';

  // Initialize chat with user ID (non-blocking)
  try {
    initChat(user.id);
  } catch (e) {
    console.warn('initChat failed:', e);
  }

  // Render the profile card component into the resolved target
  return renderProfileCard(user, target);
}
