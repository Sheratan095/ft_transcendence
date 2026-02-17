import { stopTokenRefresh } from './token';
import { disconnectChatWebSocket } from '../components/chat/chatService';
import { disconnectNotificationsWebSocket } from '../components/shared/Notifications';
import { setLocaleInStorage } from 'intlayer';

export interface User {
	id: string;
	userId: string;
    username: string;
    email: string;
	language?: string;
    avatarUrl?: string;
	createdAt?: string;
    tfaEnabled?: boolean;
}

export function getUserId(): string | null {
  return localStorage.getItem('userId');
}

export function saveUser(user: User): void {
  localStorage.setItem('userId', user.id);
  localStorage.setItem('user', JSON.stringify(user));
  console.log('User saved to localStorage:', user);
}

export function getUser(): User | null {
  const userJson = localStorage.getItem('user');
  if (!userJson) return null;
  try {
    return JSON.parse(userJson) as User;
  } catch (err) {
    console.error('Error parsing user from localStorage:', err);
    return null;
  }
}

export function isLoggedInClient(): boolean {
  const userId = getUserId();
  return userId !== null && userId !== '';
}

export async function fetchLocalProfile(): Promise<User | null> {
	  if (!isLoggedInClient()) return null;
  return await fetchUserProfile(getUserId()!);
}

export async function fetchUserProfile(userId: string): Promise<User | null> {
  if (!userId) {
    console.error('No user id available to fetch profile');
    return null;
  }
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

    const user: User = await response.json();
    
    // Ensure UserId field matches id for compatibility
    (user as any).UserId = user.id;
    return user;
  } catch (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
}

/**
 * Fetch and save the current user's profile to localStorage
 * Used during login/auth flow to persist user data
 */
export async function SaveCurrentUserProfile(userId: string): Promise<User | null>
{
  const user = await fetchUserProfile(userId);
  
  if (!user) return null;
  
  // Enrich with additional data from localStorage
  (user as any).tfaEnabled = localStorage.getItem('tfaEnabled') === 'true' || false;
  (user as any).avatarUrl = user.avatarUrl ? `/api${user.avatarUrl}` : '/assets/placeholder-avatar.jpg';
  (user as any).createdAt = user.createdAt || new Date().toISOString();
  (user as any).language = user.language || 'en';
  localStorage.setItem("userLanguage", user.language as string);

  // Save to localStorage
  saveUser(user);
  
  console.log('User profile fetched and saved:', user);
  return user;
}

/**
 * Logout user and stop token refresh
 */
export async function logout(): Promise<boolean> {  
  try
  {
    // Close all WebSocket connections BEFORE calling logout API
    // This prevents the server from trying to close already-closed connections
    disconnectChatWebSocket();
    disconnectNotificationsWebSocket();

    const response = await fetch(`/api/auth/logout`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok)
    {
      console.error('Logout response not ok:', response.status);
      return false;
    }
    localStorage.removeItem('userId');
    localStorage.removeItem('user');
    localStorage.removeItem('tfaEnabled');
    stopTokenRefresh();

    return true;
  }
  catch (err)
  {
    console.error('Logout error:', err);
    return false;
  }
}

export async function deleteAccount(): Promise<boolean> {
  try
  {
    const response = await fetch(`/api/auth/delete-account`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok)
    {
      console.error('Delete account response not ok:', response.status);
      return false;
    }
    localStorage.removeItem('userId');
    localStorage.removeItem('user');
    localStorage.removeItem('tfaEnabled');
    stopTokenRefresh();

    return true;
  }
  catch (err)
  {
    console.error('Delete account error:', err);
    return false;
  }
}