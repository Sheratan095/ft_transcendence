import { stopTokenRefresh } from './token';

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
    const url = `/api/users/user?id=${userId}`;
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
/**
 * Logout user and stop token refresh
 */
export async function logout(): Promise<void> {
  localStorage.removeItem('userId');
  localStorage.removeItem('tfaEnabled');
  stopTokenRefresh();
  
  try {
    await fetch(`/api/auth/logout`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      credentials: 'include',
    });
  } catch (err) {
    console.error('Logout error:', err);
  }
}
