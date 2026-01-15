import { getUserId } from './lib/auth';
import { startTokenRefresh } from './lib/token';
import { renderProfile } from './lib/profile';
import { setupChatEventListeners } from './lib/chat';
import { searchUser, renderSearchResult } from './lib/search';
import { createLoginForm, createRegisterForm, createTwoFactorForm } from './components/auth';
import { getIntlayer } from "intlayer";
import { connectNotificationsWebSocket } from './components/profile/Notifications';

getIntlayer("app"); // Initialize intlayer


class AuthUI {
  private container: HTMLElement;

  constructor() {
    const el = document.getElementById('auth-container');
    if (!el) throw new Error('Auth container not found');
    this.container = el;

    // make container flexible so the card can expand to available space
    this.container.classList.add('w-full', 'flex', 'items-center', 'justify-center');
    this.container.style.minHeight = '240px';

    getUserCount();
    if (getUserId()) {
        startTokenRefresh();
        renderProfile(el);
        connectNotificationsWebSocket();
      return;
    }
    else
    {
      this.renderLogin();
    }
  }

  private clear() {
    while (this.container.firstChild) this.container.removeChild(this.container.firstChild);
  }

  private renderLogin() {
    this.clear();

    const { form, card } = createLoginForm({
      onRegisterClick: () => this.renderRegister()
    });

    // Listen for 2FA required event
    const handleTfaRequired = () => {
      this.render2FA();
    };
    window.addEventListener('login:tfa-required', handleTfaRequired);

    card.appendChild(form);
    this.container.appendChild(card);
  }

  private renderRegister() {
    this.clear();

    const { form, card } = createRegisterForm({
      onLoginClick: () => this.renderLogin()
    });

    card.appendChild(form);
    this.container.appendChild(card);
  }

  // 2FA 

  private render2FA() {
    this.clear();

    const { form, card } = createTwoFactorForm({
      onBackClick: () => this.renderLogin()
    });

    card.appendChild(form);
    this.container.appendChild(card);
  }
}

async function getUserCount() 
{
  const onlineCount = document.getElementById('online-count');
  if (!onlineCount) return;

  try {
    const res = await fetch(`/api/users/stats`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    });
    if (res.ok) {
      const body = await res.json();
      if (body && typeof body.activeUsers === 'number') {
        onlineCount.textContent = 'Join now! (' + body.activeUsers + '/' + body.totalUsers + ') users online.';
      }
    }
  }
    catch (err) {
      console.error('Failed to fetch user stats', err);
    }
}

/**
 * Setup search user functionality
 */
function setupSearchUser() {
  const searchForm = document.getElementById('search-user-form') as HTMLFormElement;
  const searchInput = document.getElementById('search-user-input') as HTMLInputElement;
  const searchError = document.getElementById('search-error') as HTMLElement;
  const authContainer = document.getElementById('auth-container') as HTMLElement;

  if (!searchForm || !searchInput || !searchError || !authContainer) return;

  searchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    searchError.classList.add('hidden');
    searchError.textContent = '';

    const query = searchInput.value.trim();
    if (!query) {
      searchError.textContent = 'Please enter a name or user ID';
      searchError.classList.remove('hidden');
      return;
    }

    try {
      searchError.classList.add('hidden');
      authContainer.innerHTML = '<div class="py-8 text-center text-neutral-400">Searching...</div>';

      const user = await searchUser(query);
      if (!user) {
        searchError.textContent = 'User not found';
        searchError.classList.remove('hidden');
        authContainer.innerHTML = '';
        return;
      }

      authContainer.innerHTML = '';
      await renderSearchResult(user, authContainer);
      searchInput.value = '';
    } catch (err) {
      searchError.textContent = (err as Error).message || 'Search failed';
      searchError.classList.remove('hidden');
      authContainer.innerHTML = '';
    }
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  setupChatEventListeners();
  setupSearchUser();
  new AuthUI();
});

export default {};