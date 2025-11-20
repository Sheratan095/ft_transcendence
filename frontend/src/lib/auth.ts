// API base URL - adjust for your environment
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

export interface User {
    id: string;
    username: string;
    email: string;
    avatarUrl?: string;
}

export function getAccessToken(): string | null {
  return localStorage.getItem('accessToken');
}

export function saveTokens(accessToken: string, refreshToken?: string | null) {
  localStorage.setItem('accessToken', accessToken);
  if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
}

export function clearTokens() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

// decode base64url
function base64UrlDecode(input: string): string {
  input = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = input.length % 4;
  if (pad) input += '='.repeat(4 - pad);
  try {
    return decodeURIComponent(atob(input).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
  } catch {
    return '';
  }
}

export function decodeJwt(token: string | null) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(base64UrlDecode(parts[1]));
    return payload;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string | null, leewaySeconds = 5) {
  const payload = decodeJwt(token);
  if (!payload) return true;
  if (!payload.exp) return true;
  const now = Math.floor(Date.now() / 1000);
  return (payload.exp - leewaySeconds) <= now;
}

// Quick client-only check
export function isLoggedInClient(): boolean {
  const token = getAccessToken();
  if (!token) return false;
  return !isTokenExpired(token);
}

export async function fetchUserProfile(): Promise<User | null> {
  const token = getAccessToken();
  if (!token) {
    // not authenticated
    return null;
  }

  // Prefer extracting user id from the access token payload
  const payload: any = decodeJwt(token);
  let userId: string | null = null;
  if (payload && payload.id) userId = payload.id;
  // fallback to localStorage if set by other parts of the app
  if (!userId) userId = localStorage.getItem('userId');

  if (!userId) {
    console.error('No user id available to fetch profile');
    return null;
  }

  try {
    const url = `${API_BASE}/users/user?id=${encodeURIComponent(userId)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
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

// Robust server validation
export async function isLoggedInServerValidate(): Promise<{ ok: boolean; user?: any; error?: string }> {
  const token = getAccessToken();
  if (!token) return { ok: false, error: 'no_token' };

  const payload: any = decodeJwt(token);
  const userId = payload?.id || localStorage.getItem('userId');
  if (!userId) return { ok: false, error: 'no_user_id' };

  try {
    const res = await fetch(`${API_BASE}/users/user?id=${encodeURIComponent(userId)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    if (res.ok) {
      const body = await res.json();
      return { ok: true, user: body };
    } else {
      return { ok: false, error: `server_${res.status}` };
    }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'network_error' };
  }
}