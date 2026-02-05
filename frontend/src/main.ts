import { getUserId } from './lib/auth';
import { startTokenRefresh } from './lib/token';
import { renderProfile } from './lib/profile';
import { setupChatEventListeners, initChat } from './lib/chat';
import { searchUser, renderSearchResult } from './lib/search';
import { showErrorToast, showToast, showInfoToast } from './components/shared';
import { getIntlayer, setLocaleInStorage } from "intlayer";
import { connectNotificationsWebSocket } from './components/profile/Notifications';
import { setFriendsManager } from './components/profile/Notifications';
import { FriendsManager } from './components/profile/FriendsManager';
import { setupTrisCardListener, setTrisFriendsManager } from './lib/tris-ui';
import { setupPongCardListener } from './lib/pong-ui';
import { initCardOverlay } from './components/shared';
import { initSlideshow, goToSlide } from './lib/slideshow';
import { initTheme } from './lib/theme';
import { initCardHoverEffect } from './lib/card';
import ApexCharts from 'apexcharts';

// Make ApexCharts globally available for UserCardCharts
if (typeof window !== 'undefined') {
  (window as any).ApexCharts = ApexCharts;
}

main(window.location.pathname);

// Main application entry point,
// called on every page load remembering SPA navigation
// add checks here.
export async function main(path: string) {
// Load user's saved language preference
const savedLanguage = localStorage.getItem('userLanguage') || 'en';
setLocaleInStorage(savedLanguage);

getIntlayer("app"); // Initialize intlayer

initTheme(); // add theme 
initCardHoverEffect(); // Initialize card hover effect
initCardOverlay(); // Initialize card overlay functionality
if (getUserId())
{
	  initUserServices();
	  setupSearchUser();
}
	setupSearchUser();
}
/**
 * Setup search user functionality
 */
function setupSearchUser() {
  const searchForm = document.getElementById('search-user-form') as HTMLFormElement;
  const searchInput = document.getElementById('search-user-input') as HTMLInputElement;
  const mainContainer = document.getElementById('main-content') as HTMLElement;

  if (!searchForm || !searchInput || !mainContainer) return;

  searchForm.classList.remove('hidden');
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

function initUserServices() {
	  const userId = getUserId();
	  if (!userId) return;
	  
	connectNotificationsWebSocket();
	initChat(userId);
}

export default {};