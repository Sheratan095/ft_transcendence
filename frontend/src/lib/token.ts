const TOKEN_REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes

import { logout } from './auth';

let refreshTokenTimer: ReturnType<typeof setInterval> | null = null;
let isRefreshing = false;

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
    return false;
  } catch (error) {
    console.error('Token refresh error:', error);
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

