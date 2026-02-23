import type { User } from '../../lib/auth';

export async function attachUserOptions() {
	const userOptions = document.getElementById('user-options') as HTMLElement | null;
	if (!userOptions) return;
	
	if (!userOptions.classList.contains('hidden')) return;

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
		if (user.avatarUrl)
		{
			if (user.avatarUrl.startsWith('/api') || user.avatarUrl.startsWith('http'))
			{
				avatar.src = user.avatarUrl;
			}
			else
			{
				avatar.src = '/assets/placeholder-avatar.jpg';
			}
		}
		else
		{
			console.warn('User has no avatar URL, using placeholder');
			avatar.src = '/assets/placeholder-avatar.jpg';
		}
		avatar.onerror = () => { avatar.src = '/assets/placeholder-avatar.jpg'; };
	}
	if (usernameEl)
		usernameEl.textContent = user.username || 'Unknown User';
}