const API_BASE = import.meta.env.VITE_API_BASE || 'https://localhost:3000';

const TOKEN_REFRESH_INTERVAL = 10 * 60 * 1000;
let refreshTokenTimer: ReturnType<typeof setInterval> | null = null;

export interface User {
    id: string;
    username: string;
    email: string;
    avatarUrl?: string;
    tfaEnabled?: boolean;
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
    localStorage.removeItem('tfaEnabled');
    location.reload();
    return null;
  }
  user.tfaEnabled = localStorage.getItem('tfaEnabled') === 'true';
  console.log('User 2FA status:', user.tfaEnabled, localStorage.getItem('tfaEnabled'));

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
  if (avatar) {
    if (user.avatarUrl) {
      // If avatarUrl already starts with http/https, use as-is, otherwise prefix with API_BASE
      avatar.src = user.avatarUrl.startsWith('http') ? user.avatarUrl : `${API_BASE}${user.avatarUrl}`;
    } else {
      avatar.src = '/assets/placeholder-avatar.jpg';
    }
  }
  const avatarInput = card.querySelector('#input-avatar') as HTMLInputElement;

  // attach avatar upload handler
  if (avatarInput) {
    avatarInput.addEventListener('change', async () => {
      const file = avatarInput.files ? avatarInput.files[0] : null;
      if (!file) return;
      
      const formData = new FormData();
      formData.append('file', file);
      try {
        const res = await fetch(`${API_BASE}/users/upload-avatar`, {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });
        if (!res.ok) throw new Error(`Avatar upload failed: ${res.status}`);
        const body = await res.json();
        if (body && body.avatarUrl) {
          // Update the avatar image with the new URL
          avatar.src = body.avatarUrl.startsWith('http') ? body.avatarUrl : `${API_BASE}${body.avatarUrl}`;
          // Also update the user object for consistency
          user.avatarUrl = body.avatarUrl;
        }
      }
      catch (err) {
        console.error('Avatar upload error:', err);
      }
    });
  }


  const username = card.querySelector('#profile-username') as HTMLElement;
  if (username) username.textContent = user.username || user.email || 'User';

  const enabled2FA = card.querySelector('#profile-tfa') as HTMLElement;
  const input2FA = card.querySelector('#input-lock') as HTMLInputElement;

  // attach 2FA status
  console.log("input2FA:", input2FA);
  input2FA.checked = user.tfaEnabled || false;
  if (user.tfaEnabled)
  {
    enabled2FA.textContent = 'DISABLE 2FA'; 
  }
  else
  {
    enabled2FA.textContent = 'ENABLE 2FA';
  }

  if (input2FA) {
    input2FA.addEventListener('change', async () => {
        console.log("input:", input2FA.checked);
        const tfaEnabled = input2FA.checked;
      try {
        const res = await fetch(`${API_BASE}/auth/enable-2fa`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ tfaEnabled }),
        });
        if (!res.ok) throw new Error(`2FA update failed: ${res.status}`);
        user.tfaEnabled = tfaEnabled;
        localStorage.setItem('tfaEnabled', tfaEnabled ? 'true' : 'false');
        if (user.tfaEnabled)
        {
          enabled2FA.textContent = 'DISABLE 2FA'; 
        }
        else
        {
          enabled2FA.textContent = 'ENABLE 2FA';
        }
      } catch (err) {
        console.error('2FA update error:', err);
        input2FA.checked = !tfaEnabled;
      }
    });
  }


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
      await logout();
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

/**
 * Refresh JWT access token using the refresh token cookie
 * Called periodically to maintain session validity
 */
export async function refreshAccessToken(): Promise<boolean> {
  if (!isLoggedInClient()) {
    return false;
  }

  try {
    const res = await fetch(`${API_BASE}/auth/token`, {
      method: 'POST',
      credentials: 'include', // Send and receive cookies
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      }
    });

    if (res.ok) {
      console.log('Token refreshed successfully');
      return true;
    } else if (res.status === 401) {
      // Refresh token expired or invalid, logout user
      console.warn('Refresh token invalid or expired, logging out');
      await logout();
      return false;
    } else {
      console.error('Token refresh failed:', res.status);
      return false;
    }
  } catch (error) {
    console.error('Token refresh error:', error);
    return false;
  }
}

/**
 * Start periodic token refresh
 * Call this after user logs in to maintain session
 */
export function startTokenRefresh(): void {
  if (refreshTokenTimer) {
    clearInterval(refreshTokenTimer);
  }

  if (!isLoggedInClient()) {
    console.warn('startTokenRefresh: user not logged in');
    logout();
    return;
  }

  // Refresh immediately on first call, then periodically
  refreshAccessToken();
  
  refreshTokenTimer = setInterval(() => {
    if (isLoggedInClient()) {
      refreshAccessToken();
    } else {
      stopTokenRefresh();
    }
  }, TOKEN_REFRESH_INTERVAL);

  console.log('Token refresh started, interval:', TOKEN_REFRESH_INTERVAL / 1000 / 60, 'minutes');
}

/**
 * Stop periodic token refresh
 * Call this when user logs out
 */
export function stopTokenRefresh(): void {
  if (refreshTokenTimer) {
    clearInterval(refreshTokenTimer);
    refreshTokenTimer = null;
    console.log('Token refresh stopped');
  }
}

/**
 * Logout user and stop token refresh
 */
export async function logout(): Promise<void> {
  localStorage.removeItem('userId');
  localStorage.removeItem('tfaEnabled');
  
  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      credentials: 'include',
    });
  } catch (err) {
    console.error('Logout error:', err);
  }
}
