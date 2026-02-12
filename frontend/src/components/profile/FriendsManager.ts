import type { User } from '../../lib/auth';

export interface FriendsManagerOptions {
  currentUserId: string;
}

export class FriendsManager {
  private friends: Map<string, User> = new Map();
  private friendRequests: Map<string, User> = new Map();
  private blocked: Map<string, User> = new Map();

  // Callbacks
  private onFriendsUpdated: ((friends: User[]) => void) | null = null;
  private onRequestsUpdated: ((requests: User[]) => void) | null = null;

  constructor(_options: FriendsManagerOptions) {
    // Options reserved for future extensibility
  }

  setOnFriendsUpdated(callback: (friends: User[]) => void) {
    this.onFriendsUpdated = callback;
  }

  setOnRequestsUpdated(callback: (requests: User[]) => void) {
    this.onRequestsUpdated = callback;
  }

  async loadFriends(): Promise<User[]> {
    try {
      const response = await fetch('/api/users/relationships/friends', {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Failed to load friends: ${response.statusText}`);
      }

      const friendsList = await response.json();
      this.friends.clear();

      friendsList.forEach((friend: User) => {
        const id = (friend as any).userId ?? friend.id;
        friend.id = id;
        this.friends.set(id, friend);
      });

      if (this.onFriendsUpdated) {
        this.onFriendsUpdated(Array.from(this.friends.values()));
      }

      return Array.from(this.friends.values());
    } catch (err) {
      console.error('Error loading friends:', err);
      return [];
    }
  }

  async loadFriendRequests(): Promise<User[]> {
    try {
      const response = await fetch('/api/users/relationships/requests/incoming', {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Failed to load friend requests: ${response.statusText}`);
      }

      const requests = await response.json();
      this.friendRequests.clear();

      requests.forEach((request: User) => {
        const id = (request as any).userId ?? request.id;
        request.id = id;
        this.friendRequests.set(id, request);
      });

      if (this.onRequestsUpdated) {
        this.onRequestsUpdated(Array.from(this.friendRequests.values()));
      }

      return Array.from(this.friendRequests.values());
    } catch (err) {
      console.error('Error loading friend requests:', err);
      return [];
    }
  }

  async addFriend(userId: string): Promise<boolean> {
    try {
      const response = await fetch('/api/users/relationships/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ targetId: userId })
      });

      if (!response.ok) {
        throw new Error(`Failed to send friend request: ${response.statusText}`);
      }

      return true;
    } catch (err) {
      console.error('Error adding friend:', err);
      return false;
    }
  }

  async removeFriend(userId: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/users/relationships/removeFriend`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetId: userId })
      });

      if (!response.ok) {
        throw new Error(`Failed to remove friend: ${response.statusText}`);
      }

      this.friends.delete(userId);

      if (this.onFriendsUpdated) {
        this.onFriendsUpdated(Array.from(this.friends.values()));
      }

      return true;
    } catch (err) {
      console.error('Error removing friend:', err);
      return false;
    }
  }

  async acceptFriendRequest(userId: string): Promise<boolean> {
    try {
      const response = await fetch('/api/users/relationships/accept', {
      method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ requesterId: userId })
      });

      if (!response.ok) {
        throw new Error(`Failed to accept friend request: ${response.statusText}`);
      }

      // Move from requests to friends
      const user = this.friendRequests.get(userId);
      if (user) {
        this.friendRequests.delete(userId);
        this.friends.set(userId, user);
      }

      if (this.onRequestsUpdated) {
        this.onRequestsUpdated(Array.from(this.friendRequests.values()));
      }

      if (this.onFriendsUpdated) {
        this.onFriendsUpdated(Array.from(this.friends.values()));
      }

      return true;
    } catch (err) {
      console.error('Error accepting friend request:', err);
      return false;
    }
  }

  async rejectFriendRequest(requesterUserId: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/users/relationships/reject`, {
        method: 'PUT',
        credentials: 'include',
        body: JSON.stringify({ requesterId: requesterUserId })
      });

      if (!response.ok) {
        throw new Error(`Failed to reject friend request: ${response.statusText}`);
      }

      this.friendRequests.delete(requesterUserId);

      if (this.onRequestsUpdated) {
        this.onRequestsUpdated(Array.from(this.friendRequests.values()));
      }

      return true;
    } catch (err) {
      console.error('Error rejecting friend request:', err);
      return false;
    }
  }

  async blockUser(userId: string): Promise<boolean> {
    try {
      const response = await fetch('/api/users/relationships/block', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ targetId: userId })
      });

      if (!response.ok) {
        throw new Error(`Failed to block user: ${response.statusText}`);
      }

      // Try to read returned user info (if server provides it)
      const blockedUser = await response.json().catch(() => null);
      const id = blockedUser?.userId ?? blockedUser?.id ?? userId;

      if (this.friends.has(userId)) {
        const user = this.friends.get(userId)!;
        this.friends.delete(userId);
        this.blocked.set(id, user);
        if (this.onFriendsUpdated) this.onFriendsUpdated(Array.from(this.friends.values()));
      } else if (blockedUser) {
        blockedUser.id = id;
        this.blocked.set(id, blockedUser);
      } else {
        // As fallback, create a minimal record in blocked map so callers can query isBlocked()
        this.blocked.set(userId, { id: userId } as User);
      }

      return true;
    } catch (err) {
      console.error('Error blocking user:', err);
      return false;
    }
  }

  async unblockUser(targetId: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/users/relationships/unblock`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetId: targetId })
      });

      if (!response.ok) {
        throw new Error(`Failed to unblock user: ${response.statusText}`);
      }

      this.blocked.delete(targetId);
      return true;
    } catch (err) {
      console.error('Error unblocking user:', err);
      return false;
    }
  }

  getFriends(): User[] {
    return Array.from(this.friends.values());
  }

  getFriendRequests(): User[] {
    return Array.from(this.friendRequests.values());
  }

  isFriend(userId: string): boolean {
    return this.friends.has(userId);
  }

  hasRequest(userId: string): boolean {
    return this.friendRequests.has(userId);
  }

  isBlocked(userId: string): boolean {
    return this.blocked.has(userId);
  }
}
