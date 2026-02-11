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