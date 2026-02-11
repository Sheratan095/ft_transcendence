import { fetchUserProfile, getUserId, logout } from './lib/auth';
import { isLoggedInClient, startTokenRefresh } from './lib/token';
import { attachUserOptions } from './lib/profile';
import { setupChatEventListeners, initChat } from './lib/chat';
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
start();

// Load user's saved language preference
const savedLanguage = localStorage.getItem('userLanguage') || 'en';
setLocaleInStorage(savedLanguage);

console.log(savedLanguage);

getIntlayer("app"); // Initialize intlayer

initTheme(); // add theme
initCardHoverEffect(); // Initialize card hover effect

if (isLoggedInClient())
  initUserServices();

const tournamentListButton = document.getElementById('tournamentListButton');
tournamentListButton?.addEventListener('click', () =>
{
  const modal = document.getElementById('tournament-modal');
  if (modal)
    modal.classList.remove('hidden');

    showTournamentListModal();
});

}
/**
 * Setup search user functionality
 */
function setupSearchUser()
{
  const searchForm = document.getElementById('search-user-form') as HTMLFormElement;
  const searchInput = document.getElementById('search-user-input') as HTMLInputElement;
  const mainContainer = document.getElementById('main-content') as HTMLElement;

  if (!searchForm || !searchInput || !mainContainer) return;

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

    link.addEventListener('click', async (e) => {
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
    });
  }

}

function initUserServices()
{
	const userId = getUserId();
	if (!userId) return;

	startTokenRefresh();
  modifyIndex();
  setupChatEventListeners();
	connectNotificationsWebSocket();
	setupSearchUser();
	attachUserOptions();
	initChat(userId);
}

export default {};