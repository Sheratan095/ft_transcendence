import type { User } from './auth';
import { goToRoute } from '../spa';

export interface SearchResult extends User {
  matchType: 'name' | 'id';
}

/**
 * Initialize search autocomplete behavior
 */
export function initSearchAutocomplete(): void
{
  const input = document.getElementById('search-user-input') as HTMLInputElement;
  const dropdown = document.getElementById('search-results-dropdown') as HTMLElement;
  const form = document.getElementById('search-user-form') as HTMLFormElement;
  const searchBar = document.querySelector('div#top-bar') as HTMLElement;

  if (!input || !dropdown || !form || !searchBar) return;

  // Set CSS custom property for dropdown positioning
  const updateDropdownPosition = () => {
    const height = searchBar.offsetHeight;
    document.documentElement.style.setProperty('--search-bar-height', `${height}px`);
    dropdown.style.top = `calc(${height}px + 1.25rem)`;
  };
  updateDropdownPosition();
  window.addEventListener('resize', updateDropdownPosition);

  const updateDropdown = async () => {
    const q = input.value.trim();
    if (!q) {
      dropdown.classList.add('hidden');
      return;
    }

    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`, { credentials: 'include' });
      if (!res.ok) {
        dropdown.classList.add('hidden');
        return;
      }
      const users = await res.json();
      dropdown.innerHTML = '';
      
      if (Array.isArray(users) && users.length > 0) {
        const list = document.createElement('div');
        list.className = 'max-h-60 overflow-y-auto';
        users.forEach(u => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'w-full px-4 py-3 text-left text-white hover:bg-neutral-700 font-bold uppercase tracking-tight text-xs border-b border-neutral-700 last:border-0 transition-colors';
          btn.textContent = u.username;
          btn.onclick = (e) => {
            e.preventDefault();
            dropdown.classList.add('hidden');
            form.reset();
            // Navigate to profile with user ID
            goToRoute(`/profile?id=${u.id}`);
          };
          list.appendChild(btn);
        });
        dropdown.appendChild(list);
        dropdown.classList.remove('hidden');
      } else {
        dropdown.classList.add('hidden');
      }
    } catch (err) {
      dropdown.classList.add('hidden');
    }
  };

  input.addEventListener('input', updateDropdown);
  input.addEventListener('focus', () => {
    if (input.value.trim()) dropdown.classList.remove('hidden');
  });

  // Prevent Enter key from selecting the first dropdown item automatically
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const isHidden = dropdown.classList.contains('hidden');
      if (!isHidden) {
        e.preventDefault();
        e.stopPropagation();
        // keep dropdown open but don't auto-activate first item
      }
    } else if (e.key === 'Escape') {
      dropdown.classList.add('hidden');
    }
  });

  document.addEventListener('click', (e) => {
    if (!input.contains(e.target as Node) && !dropdown.contains(e.target as Node)) {
      dropdown.classList.add('hidden');
    }
  });

  // Prevent default form submit navigation; perform search and navigate only if a result is found
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const q = input.value.trim();
    if (!q) return;
    try {
      const res = await searchUser(q);
      if (res && res.id) {
        dropdown.classList.add('hidden');
        form.reset();
        goToRoute(`/profile?id=${res.id}`);
      }
    } catch (err) {
      // No result or search error - do nothing (avoid redirect)
      dropdown.classList.add('hidden');
    }
  });
}


/**
 * Search for a user by name or ID
 */
export async function searchUser(query: string): Promise<SearchResult | null> {
  if (!query.trim()) {
    throw new Error('Please enter a name or user ID');
  }

  try {
    const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`, {
      credentials: 'include',
    });

    if (!res.ok) {
      if (res.status === 404) throw new Error('User not found');
      throw new Error(`Search failed: ${res.status}`);
    }

    const users = await res.json();
    
    if (Array.isArray(users) && users.length > 0) {
      return { ...users[0], matchType: 'name' };
    }
    
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
 * Render a user profile from search results - now navigates to /profile?id=<userId>
 */
export async function renderSearchResult(user: SearchResult, container: HTMLElement): Promise<void> {
  // Navigate to the profile page with user ID
  goToRoute(`/profile?id=${user.id}`);
}
