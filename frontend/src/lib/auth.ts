const API_BASE = import.meta.env.VITE_API_BASE || 'https://localhost:3000';

export interface User {
    id: string;
    username: string;
    email: string;
    avatarUrl?: string;
}

export function getUserId(): string | null {
  return localStorage.getItem('userId');
}

export function isLoggedInClient(): boolean {
  const userId = getUserId();
  return userId !== null && userId !== '';
}

export async function fetchUserProfile(): Promise<User | null> {
  let userId: string | null = getUserId();
  if (!userId) {
    console.error('No user id available to fetch profile');
    return null;
  }
  console.log('Fetching profile for user id:', userId);

  try {
    const url = `${API_BASE}/users/user?id=${userId}`;
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      console.error('Profile fetch failed', response.status);
      return null;
    }

    const user = await response.json();
    return user;
  } catch (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
}

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
    location.reload();
    return null;
  }

  // Clone template
  const template = document.getElementById('profile-card-template') as HTMLTemplateElement;
  if (!template) {
    console.error('Profile card template not found');
    return null;
  }

  const card = template.content.cloneNode(true) as DocumentFragment;
  const cardEl = (card.querySelector('div') as HTMLElement) || null;

  // Populate template with user data
  const avatar = card.querySelector('#profile-avatar') as HTMLImageElement;
  if (avatar) avatar.src = user.avatarUrl || '/assets/placeholder-avatar.jpg';

  const username = card.querySelector('#profile-username') as HTMLElement;
  if (username) username.textContent = user.username || user.email || 'User';

  const email = card.querySelector('#profile-email') as HTMLElement;
  if (email) email.textContent = user.email || '';

  const id = card.querySelector('#profile-id') as HTMLElement;
  if (id) id.textContent = user.id || '';

  const editBtn = card.querySelector('#profile-edit-btn') as HTMLButtonElement;
  const logoutBtn = card.querySelector('#profile-logout-btn') as HTMLButtonElement;

  // Append card to root
  root.appendChild(card);

  // Attach event listeners
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      localStorage.removeItem('userId');
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        credentials: 'include',
      });
      window.location.reload();
    });
  }

  if (editBtn) {
    editBtn.addEventListener('click', () => {
      const ev = new CustomEvent('profile:edit', { detail: user });
      window.dispatchEvent(ev);
    });
  }

  return cardEl;
}
