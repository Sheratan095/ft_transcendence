import { createUserCard, type UserCardOptions } from './UserCard';
import type { User } from '../../lib/auth';

export interface UserListOptions extends UserCardOptions {
  searchable?: boolean;
  filterable?: boolean;
  emptyMessage?: string;
}

export interface UserListContainerCallbacks extends UserCardOptions {
  onSearch?: (query: string) => void;
  searchable?: boolean;
  emptyMessage?: string;
}

export function createUserListContainer(users: User[], options: UserListContainerCallbacks = {}): {
  container: HTMLDivElement;
  searchInput: HTMLInputElement | null;
  usersList: HTMLDivElement;
  update: (newUsers: User[]) => void;
} {
  const {
    searchable = true,
    emptyMessage = 'No users found',
    onSearch
  } = options;

  const container = document.createElement('div');
  container.className = 'space-y-4';

  let searchInput: HTMLInputElement | null = null;

  // Search bar
  if (searchable) {
    const searchContainer = document.createElement('div');
    searchContainer.className = 'mb-4';

    searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search users...';
    searchInput.className = 'w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30';

    searchInput.addEventListener('input', (e) => {
      const query = (e.target as HTMLInputElement).value;
      if (onSearch) onSearch(query);
    });

    searchContainer.appendChild(searchInput);
    container.appendChild(searchContainer);
  }

  // Users list
  const usersList = document.createElement('div');
  usersList.className = 'space-y-2 max-h-96 overflow-y-auto';

  const renderUsers = (usersToRender: User[]) => {
    usersList.innerHTML = '';

    if (usersToRender.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'text-center py-8 text-neutral-500';
      emptyDiv.textContent = emptyMessage;
      usersList.appendChild(emptyDiv);
      return;
    }

    usersToRender.forEach(user => {
      const card = createUserCard(user, options);
      usersList.appendChild(card);
    });
  };

  // Initial render
  renderUsers(users);
  container.appendChild(usersList);

  return {
    container,
    searchInput,
    usersList,
    update: (newUsers: User[]) => renderUsers(newUsers)
  };
}
