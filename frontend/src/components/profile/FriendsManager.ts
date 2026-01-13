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
      const response = await fetch('/api/relationships/friends', {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Failed to load friends: ${response.statusText}`);
      }

      const friendsList = await response.json();
      this.friends.clear();
      
      friendsList.forEach((friend: User) => {
        this.friends.set(friend.id, friend);
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
      const response = await fetch('/api/relationships/requests/incoming', {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Failed to load friend requests: ${response.statusText}`);
      }

      const requests = await response.json();
      this.friendRequests.clear();
      
      requests.forEach((request: User) => {
        this.friendRequests.set(request.id, request);
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
      const response = await fetch('/api/relationships/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ targetUserId: userId })
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
      const response = await fetch(`/api/relationships/${userId}`, {
        method: 'DELETE',
        credentials: 'include'
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
      const response = await fetch('/api/relationships/accept', {
        method: 'POST',
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

  async rejectFriendRequest(userId: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/relationships/${userId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Failed to reject friend request: ${response.statusText}`);
      }

      this.friendRequests.delete(userId);

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
      const response = await fetch('/api/relationships/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ targetUserId: userId })
      });

      if (!response.ok) {
        throw new Error(`Failed to block user: ${response.statusText}`);
      }

      // Remove from friends if exists
      const user = this.friends.get(userId);
      if (user) {
        this.friends.delete(userId);
        this.blocked.set(userId, user);
      }

      return true;
    } catch (err) {
      console.error('Error blocking user:', err);
      return false;
    }
  }

  async unblockUser(userId: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/relationships/${userId}/unblock`, {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Failed to unblock user: ${response.statusText}`);
      }

      this.blocked.delete(userId);
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
