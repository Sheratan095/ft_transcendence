import { logout } from './auth';

// Refresh token at 80% of expiration time to ensure it's refreshed before it expires
const EXPIRATION_MINUTES = parseInt(import.meta.env.VITE_ACCESS_TOKEN_EXPIRATION_MINUTES || '0');
const TOKEN_REFRESH_INTERVAL = EXPIRATION_MINUTES > 0 ? Math.max(EXPIRATION_MINUTES * 60 * 1000 * 0.8, 60000) : 0; // Min 1 minute, refresh at 80% of expiration

let refreshTokenTimer: ReturnType<typeof setInterval> | null = null;
let isRefreshing = false;

if (TOKEN_REFRESH_INTERVAL <= 0) {
  console.error('Invalid TOKEN_REFRESH_INTERVAL: ACCESS_TOKEN_EXPIRATION_MINUTES not set or invalid');
}

export function getUserId(): string | null {
  return localStorage.getItem('userId');
}

export function isLoggedInClient(): boolean {
  return !!getUserId();
}


export async function refreshAccessToken(): Promise<boolean> {
//  if (!isLoggedInClient()) return false;

  if (isRefreshing) return true;
  isRefreshing = true;

  try {
    const res = await fetch(`/api/auth/token`, {
      method: 'POST',
      credentials: 'include',
    });

    if (res.ok) {
      console.log('Access token refreshed');
      return true;
    }

    if (res.status === 401) {
      console.warn('Refresh token expired — logging out');
      await logout();
      return false;
    }

    console.error('Token refresh failed:', res.status);
	await logout();
    return false;
  } catch (error) {
    console.error('Token refresh error:', error);
    await logout();
    return false;
  } finally {
    isRefreshing = false;
  }
}

export function startTokenRefresh(): void {
  if (refreshTokenTimer) {
    clearInterval(refreshTokenTimer);
  }

  if (!isLoggedInClient()) {
    console.warn('Token refresh not started: user not logged in');
    return;
  }

  if (isNaN(TOKEN_REFRESH_INTERVAL) || TOKEN_REFRESH_INTERVAL <= 0) {
    console.error('Cannot start token refresh: invalid interval', TOKEN_REFRESH_INTERVAL);
    return;
  }

  refreshAccessToken();

  refreshTokenTimer = setInterval(() => {
    if (!isLoggedInClient()) {
      stopTokenRefresh();
      return;
    }

    refreshAccessToken();
  }, TOKEN_REFRESH_INTERVAL);

  console.log(
    'Token refresh started every',
    TOKEN_REFRESH_INTERVAL / 1000 / 60,
    'minutes'
  );
}

export function stopTokenRefresh(): void {
  if (refreshTokenTimer) {
    clearInterval(refreshTokenTimer);
    refreshTokenTimer = null;
    console.log('Token refresh stopped');
  }
}

