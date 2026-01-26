import { fetchUserProfile, logout, deleteAccout } from './auth';
import { initChat, openChatModal } from './chat';
import { renderProfileCard } from '../components/profile';

export async function renderProfile(container?: HTMLElement | string): Promise<HTMLElement | null> {
  let root: HTMLElement | null = null;
  if (!container) {
	root = document.getElementById('app') || document.getElementById('auth-container') || null;
  } else if (typeof container === 'string') {
	root = document.getElementById(container) || null;
  } else {
	root = container;
  }

  if (!root) {
	console.warn('renderProfile: target container not found');
	return null;
  }

  // show loading state
  root.innerHTML = '';
  const loading = document.createElement('div');
  loading.className = 'py-8 text-center text-neutral-400';
  loading.textContent = 'Loading profile...';
  root.appendChild(loading);

  const user = await fetchUserProfile();
  console.log('Fetched user profile:', user);
  root.removeChild(loading);

  if (!user) {
	localStorage.removeItem('userId');
	localStorage.removeItem('tfaEnabled');
	localStorage.removeItem('user');
	location.reload();
	return null;
  }
  user.tfaEnabled = localStorage.getItem('tfaEnabled') === 'true';
  console.log('User 2FA status:', user.tfaEnabled, localStorage.getItem('tfaEnabled'));

  // Initialize chat with user ID
  initChat(user.id);



  // Render the profile card component
  return renderProfileCard(user, root);
}
