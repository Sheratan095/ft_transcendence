import type { User } from './auth';

export interface SearchResult extends User {
  matchType: 'name' | 'id';
}

/**
 * Search for a user by name or ID
 */
export async function searchUser(query: string): Promise<SearchResult | null> {
  if (!query.trim()) {
    throw new Error('Please enter a name or user ID');
  }

  try {
    // Try to search by ID first (if query is numeric)
    const numericId = parseInt(query, 10);
    if (!isNaN(numericId)) {
      const res = await fetch(`/api/users/${numericId}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const user = await res.json();
        return { ...user, matchType: 'id' };
      }
    }

    // Search by username/name
    const res = await fetch(`/api/users/search?query=${encodeURIComponent(query)}`, {
      credentials: 'include',
    });

    if (!res.ok) {
      if (res.status === 404) {
        throw new Error('User not found');
      }
      throw new Error(`Search failed: ${res.status}`);
    }

    const users = await res.json();
    
    // If it returns an array, get the first match
    if (Array.isArray(users) && users.length > 0) {
      return { ...users[0], matchType: 'name' };
    }
    
    // If it returns a single user object
    if (users && typeof users === 'object' && 'id' in users) {
      return { ...users, matchType: 'name' };
    }

    throw new Error('User not found');
  } catch (err) {
    const message = (err as Error).message || 'Search failed';
    throw new Error(message);
  }
}

/**
 * Render a user profile from search results
 */
export async function renderSearchResult(user: SearchResult, container: HTMLElement): Promise<void> {
  // Clear container
  container.innerHTML = '';

  // Create back button
  const backBtn = document.createElement('button');
  backBtn.className = 'mb-6 px-4 py-2 bg-neutral-700 text-white font-semibold uppercase tracking-tight hover:bg-neutral-600 transition border-2 border-neutral-600';
  backBtn.textContent = '← Back';
  backBtn.addEventListener('click', () => {
    location.reload();
  });
  container.appendChild(backBtn);

  // Import and render profile card
  const { renderProfileCard } = await import('../components/profile');
  const cardEl = await renderProfileCard(user, container);

  if (!cardEl) {
    container.innerHTML = '<div class="text-red-500 text-center mt-8">Failed to load user profile</div>';
  }
}
