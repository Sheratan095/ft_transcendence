import { getUserId } from './lib/auth';
import { startTokenRefresh } from './lib/token';
import { renderProfile } from './lib/profile';
import { setupChatEventListeners, initChat } from './lib/chat';
import { searchUser, renderSearchResult } from './lib/search';
import { createLoginForm, createRegisterForm, createTwoFactorForm } from './components/auth';
import { showErrorToast } from './components/shared';
import { getIntlayer, setLocaleInStorage } from "intlayer";
import { connectNotificationsWebSocket } from './components/profile/Notifications';
import { setFriendsManager } from './components/profile/Notifications';
import { FriendsManager } from './components/profile/FriendsManager';
import { setupTrisCardListener, setTrisFriendsManager } from './lib/tris-ui';
import { setupPongCardListener } from './lib/pong-ui';
import { initSlideshow, goToSlide } from './lib/slideshow';
import { initTheme } from './lib/theme';
import ApexCharts from 'apexcharts';

// Make ApexCharts globally available for UserCardCharts
if (typeof window !== 'undefined') {
  (window as any).ApexCharts = ApexCharts;
}

// Load user's saved language preference
const savedLanguage = localStorage.getItem('userLanguage') || 'en';
setLocaleInStorage(savedLanguage);

getIntlayer("app"); // Initialize intlayer

/**
 * Initialize application managers and websockets after user login
 */
async function initializeUserServices(userId: string) {
  try {
    console.log('Initializing user services for userId:', userId);

    // 1. Initialize FriendsManager
    const friendsManager = new FriendsManager({ currentUserId: userId });
    console.log('FriendsManager initialized');

    // 2. Connect FriendsManager to Notifications
    setFriendsManager(friendsManager);

    // 3. Connect FriendsManager to Tris UI
    setTrisFriendsManager(friendsManager);

    // 4. Load friends list
    await friendsManager.loadFriends();
    console.log('Friends loaded');

    // 5. Initialize Chat
    initChat(userId);
    setupChatEventListeners();
    console.log('Chat services initialized');

    // 6. Connect to Notifications WebSocket
    connectNotificationsWebSocket();
    console.log('Notifications WebSocket connected');

    // 7. Set up periodic token refresh
    startTokenRefresh();
    console.log('Token refresh started');

  } catch (err) {
    console.error('Failed to initialize user services:', err);
    throw err;
  }
}

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
    const userId = getUserId();
    if (userId) {
      this.renderProfileWithInit(el, userId);
      return;
    }
    else
    {
      this.renderLogin();
    }
  }

  private async renderProfileWithInit(el: HTMLElement, userId: string) {
    try {
      // Initialize all user services
      await initializeUserServices(userId);
      
      // Render profile card
      await renderProfile(el);
    } catch (err) {
      console.error('Failed to initialize profile:', err);
      // Fall back to login on init error
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
  const authContainer = document.getElementById('auth-container') as HTMLElement;

  if (!searchForm || !searchInput || !authContainer) return;

  searchForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const query = searchInput.value.trim();
    if (!query) {
      showErrorToast('Please enter a username or ID to search');
      return;
    }

    try {
      authContainer.innerHTML = '<div class="py-8 text-center text-neutral-400">Searching...</div>';

      const user = await searchUser(query);
      if (!user) {
        showErrorToast('User not found');
        return;
      }

      authContainer.innerHTML = '';
      await renderSearchResult(user, authContainer);
      searchInput.value = '';
    } catch (err) {
      showErrorToast('Error searching for user');
    }
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  setupSearchUser();
  setupTrisCardListener();
  setupPongCardListener();
  initSlideshow();
  
  // Setup indicator dots click handlers
  const indicators = document.querySelectorAll('.slideshow-indicator');
  indicators.forEach((indicator) => {
    indicator.addEventListener('click', () => {
      const slideId = (indicator as HTMLElement).dataset.slide;
      if (slideId) {
        goToSlide(slideId);
      }
    });
  });
  
  // AuthUI will handle chat setup after user login
  new AuthUI();
});

export default {};