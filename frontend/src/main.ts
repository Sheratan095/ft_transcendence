import { fetchUserProfile, getUserId, logout } from './lib/auth';
import { isLoggedInClient, startTokenRefresh } from './lib/token';
import { attachUserOptions } from './components/profile/profile';
import { setupChatEventListeners, initChat } from './components/chat/chat';
import { initChatButton, initHomeButton, removeHomeButton } from './components/shared/FloatingButtons';
import { searchUser, renderSearchResult, initSearchAutocomplete } from './lib/search';
import { showErrorToast, showToast, showInfoToast } from './components/shared';
import { getIntlayer, setLocaleInStorage } from "intlayer";
import { connectNotificationsWebSocket } from './components/profile/Notifications';
import { setFriendsManager } from './components/profile/Notifications';
import { showTournamentListModal } from './components/tournaments/TournamentsList';
import { FriendsManager } from './components/profile/FriendsManager';
import { setupTrisCardListener, setTrisFriendsManager } from './lib/tris-ui';
import { setupPongCardListener } from './lib/pong-ui';
import { initSlideshow, goToSlide } from './lib/slideshow';
import { initTheme } from './lib/theme';
import { initCardHoverEffect } from './lib/card';
import ApexCharts from 'apexcharts';
import { start } from './spa';

// Make ApexCharts globally available for UserCardCharts
if (typeof window !== 'undefined') {
  (window as any).ApexCharts = ApexCharts;
}

main(window.location.pathname);

// Main application entry point,
// called on every page load remembering SPA navigation
// add checks here.
export async function main(path: string) {
await start();

// Load user's saved language preference
const savedLanguage = localStorage.getItem('userLanguage') || 'en';
setLocaleInStorage(savedLanguage);

console.log(savedLanguage);

getIntlayer("app"); // Initialize intlayer

initTheme(); // add theme
initCardHoverEffect(); // Initialize card hover effect
if (isLoggedInClient()) initUserServices(path);

}

/**
 * Setup search user functionality
 */
function setupSearchUser()
{
  const searchForm = document.getElementById('search-user-form') as HTMLFormElement;
  const searchInput = document.getElementById('search-user-input') as HTMLInputElement;
  const mainContainer = document.getElementById('main-content') as HTMLElement;

  if (!searchForm || !searchInput || !mainContainer)
    return;

  searchForm.classList.remove('hidden');
  initSearchAutocomplete();
  
  searchForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const query = searchInput.value.trim();
    if (!query) {
      showErrorToast('Please enter a username or ID to search');
      return;
    }

    try {
      showInfoToast('Searching for user...');

      const user = await searchUser(query);
      if (!user) {
        showErrorToast('User not found');
        return;
      }

      mainContainer.innerHTML = '';
      await renderSearchResult(user, mainContainer);
      searchInput.value = '';
    } catch (err) {
      showErrorToast('Error searching for user');
    }
  });
}

function modifyIndex()
{
  const link = document.getElementById('cta-login-logout') as HTMLAnchorElement | null;
  if (link)
  {
    const h2 = link.getElementsByTagName('h2')[0];
    if (h2)
      h2.textContent = './LOGOUT';
    
    // Modification: the click listener is now handled via event delegation in main()
  }

  const showTournamentsBtn = document.getElementById('tournamentListButton');
  if (showTournamentsBtn) {
    showTournamentsBtn.classList.remove('hidden');
  }

  const showTournamentsBtnStatic = document.getElementById('tournamentListButton-static');
  if (showTournamentsBtnStatic) {
    showTournamentsBtnStatic.classList.remove('hidden');
  }
}

function initUserServices(path: string)
{
	const userId = getUserId();
	if (!userId)
      return;

  startTokenRefresh();
  modifyIndex();
  setupChatEventListeners();
  initChatButton();
  initHomeButton();
  connectNotificationsWebSocket();
  
  // Initialize global FriendsManager for notifications
  const globalFriendsManager = new FriendsManager({ currentUserId: userId });
  setFriendsManager(globalFriendsManager);
  setTrisFriendsManager(globalFriendsManager);
  console.log('[Main] FriendsManager initialized for notifications');
  
  setupSearchUser();
  attachUserOptions();
  initChat(userId);

  // Handle home button visibility on route changes
  window.addEventListener('route-rendered', (e: any) => {
    const currentPath = e.detail?.path || window.location.pathname;
    if (currentPath === '/') {
      removeHomeButton();
    } else {
      initHomeButton();
    }
  });
}

// Global click handler for shared/dynamic elements
function setupGlobalClickHandlers() {
  document.addEventListener('click', async (e) => {
    const target = e.target as HTMLElement;

    // Handle Tournament Button
    const tournamentBtn = target.closest('#tournamentListButton, #tournamentListButton-static');
    if (tournamentBtn) {
      e.preventDefault();
      const modal = document.getElementById('tournament-modal');
      if (modal) modal.classList.remove('hidden');
      showTournamentListModal();
      return;
    }

    // Handle Logout Link
    const logoutLink = target.closest('#cta-login-logout');
    if (logoutLink && logoutLink.textContent?.includes('LOGOUT')) {
      e.preventDefault();
      try {
        await logout();
        showToast('Logged out successfully');
        setTimeout(() => (window.location.href = '/'), 800);
      }
      catch (err) {
        console.error('Logout (client) error:', err);
        showErrorToast('Error logging out');
      }
      return;
    }
  });
}

export default {};