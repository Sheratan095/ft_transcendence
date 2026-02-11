import type { User } from './auth';

export interface SearchResult extends User {
  matchType: 'name' | 'id';
}

/**
 * Initialize search autocomplete behavior
 */
export function initSearchAutocomplete(): void {
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
            input.value = u.username;
            dropdown.classList.add('hidden');
            form.dispatchEvent(new Event('submit'));
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

  document.addEventListener('click', (e) => {
    if (!input.contains(e.target as Node) && !dropdown.contains(e.target as Node)) {
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
 * Render a user profile from search results
 */
export async function renderSearchResult(user: SearchResult, container: HTMLElement): Promise<void> {
  // Clear container
  container.innerHTML = '';

  // Create wrapper with back button
  const wrapper = document.createElement('div');
  wrapper.className = 'w-full';

  // Create back button
  const backBtn = document.createElement('button');
  backBtn.className = 'mb-6 px-4 py-2 bg-neutral-700 text-white font-semibold uppercase tracking-tight hover:bg-neutral-600 transition border-2 border-neutral-600';
  backBtn.textContent = '← Back';
  backBtn.addEventListener('click', () => {
    location.reload();
  });
  wrapper.appendChild(backBtn);

  // Import and render custom search profile card
  const { renderSearchProfileCard } = await import('../components/profile/SearchProfileCard');
  const cardEl = await renderSearchProfileCard(user, wrapper);

  if (!cardEl) {
    container.innerHTML = '<div class="text-red-500 text-center mt-8">Failed to load user profile</div>';
    return;
  }

  container.appendChild(wrapper);
}
