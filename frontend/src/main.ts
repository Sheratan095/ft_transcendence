import { fetchUserProfile, getUserId, logout } from './lib/auth';
import { isLoggedInClient, startTokenRefresh } from './lib/token';
import { attachUserOptions } from './components/profile/profile';
import { setupChatEventListeners, initChat } from './components/chat/chat';
import { initChatButton, initHomeButton, removeHomeButton } from './components/shared/FloatingButtons';
import { searchUser, renderSearchResult, initSearchAutocomplete } from './lib/search';
import { showErrorToast, showToast, showInfoToast } from './components/shared';
import { getIntlayer, setLocaleInStorage } from "intlayer";
import { connectNotificationsWebSocket } from './components/shared/Notifications';
import { setFriendsManager } from './components/shared/Notifications';
import { showTournamentListModal } from './components/tournaments/TournamentsList';
import { FriendsManager } from './components/profile/FriendsManager';
import { setupTrisCardListener, setTrisFriendsManager } from './lib/tris-ui';
import { setupPongCardListener } from './lib/pong-ui';
import { initSlideshow, goToSlide } from './lib/slideshow';
import { initTheme } from './lib/theme';
import { initCardHoverEffect } from './lib/card';
import ApexCharts from 'apexcharts';
import { start } from './spa';

// internalization dictionaries
import { registerDictionary, setLocale, getLocale, t } from './lib/intlayer';
import en from './i18n/en.json';
import fr from './i18n/fr.json';
import it from './i18n/it.json';

registerDictionary('en', en);
registerDictionary('fr', fr);
registerDictionary('it', it);
// set runtime locale from saved preference (fallback to 'en') and persist via any storage hook
let _savedLanguage = localStorage.getItem('locale');
if (!_savedLanguage) _savedLanguage = fetchLanguage(); // will set to navigator language or default and persist
setLocale(_savedLanguage);

// simple language selector handler: persist and reload to ensure full UI picks up the new locale
document.addEventListener('DOMContentLoaded', () => {
  // hydrate existing DOM and template contents once on load
  hydrateOnce();

  // Expose hydration functions globally for debugging
  (window as any).__hydrateRoot = hydrateRoot;
  (window as any).__hydrateAll = hydrateOnce;
  
  const locales = [
    { code: 'en', label: 'EN' },
    { code: 'fr', label: 'FR' },
    { code: 'it', label: 'IT' }
  ];
  const langSelect = document.getElementById('profile-language') as HTMLSelectElement | null;
  if (!langSelect) return;

  // populate selector and set current value
  langSelect.innerHTML = locales.map(l => `<option value="${l.code}">${l.label}</option>`).join('');
  langSelect.value = _savedLanguage;

  langSelect.addEventListener('change', async () => {
    const v = langSelect.value;
    try
    {
      if (isLoggedInClient())
      {
        localStorage.setItem('locale', v); 
        const response = await fetch('/api/users/update-user', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ newLanguage: v }),
        });
        if (!response.ok)
          console.error('Failed to update user language:', response.status);
      }
    }
    catch (err)
    {
      console.error('Error updating user language:', err);
    }
    console.log('Language changed to', v);
    window.location.reload();
  });
});

// Make ApexCharts globally available for UserCardCharts
if (typeof window !== 'undefined') {
  (window as any).ApexCharts = ApexCharts;
}

// Delegated fallback: catch change events for dynamically-inserted #profile-language selects
document.addEventListener('change', (e) => {
  const target = e.target as Element | null;
  if (!target) return;
  if (!(target instanceof HTMLSelectElement)) return;
  if (target.id !== 'profile-language') return;

  const v = target.value;
  setLocale(v);
  try { setLocaleInStorage && setLocaleInStorage(v); } catch {}
  // Expose hydrate function before reload
  // const hydrateRoot = (window as any).__hydrateRoot;
  const hydrateAll = (window as any).__hydrateAll;
  if (hydrateAll) hydrateAll();
  // reload to ensure all templates/renderers pick up the new locale
  window.location.reload();
});

main(window.location.pathname);

// Main application entry point,
// called on every page load remembering SPA navigation
// add checks here.
export async function main(path: string)
{
await start();

// Load user's saved language preference
const savedLanguage = localStorage.getItem('locale') || 'en';
setLocaleInStorage(savedLanguage);

  // IMPORTANT: set the runtime translator locale so t(...) uses it
setLocale(savedLanguage);

console.log(savedLanguage);

getIntlayer("app"); // Initialize intlayer

// initTheme(); // add theme
initCardHoverEffect(); // Initialize card hover effect
  // Attach global click handlers for shared/dynamic elements
  setupGlobalClickHandlers();
  // Setup game card listeners
  initSlideshow();

  // Handle home button visibility on route changes
  window.addEventListener('route-rendered', (e: any) => {
    const currentPath = e.detail?.path || window.location.pathname;
    if (currentPath === '/') {
      removeHomeButton();
    } else {
      initHomeButton();
    }
    // Ensure the CTA in the rendered page reflects the logged-in state
    if (isLoggedInClient()) modifyIndex();
  });

  // Show home button if not on home page
  if (path !== '/')
    initHomeButton();

  if (isLoggedInClient())
    initUserServices(path);
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
}

function modifyIndex()
{
  // Support both the dynamic and static login anchors
  const link = document.querySelector('#cta-login-logout, #cta-login-logout-static') as HTMLAnchorElement | null;
  if (link)
  {
    const h2 = link.getElementsByTagName('h2')[0];
    if (h2)
      h2.textContent = './LOGOUT';
    
    // Clicks are handled via event delegation in setupGlobalClickHandlers()
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
}

// Global click handler for shared/dynamic elements
function setupGlobalClickHandlers() {
  document.addEventListener('click', async (e) => {
    const target = e.target as HTMLElement;

    // Handle cancel delete button
    const cancelDeleteBtn = target.closest('#cancel-delete-btn');
    if (cancelDeleteBtn) {
      const deleteDialog = document.getElementById('delete-dialog') as HTMLElement;
      if (deleteDialog) {
        deleteDialog.classList.add('hidden');
      }
      return;
    }

    // Handle Tournament Button
    const tournamentBtn = target.closest('#tournamentListButton, #tournamentListButton-static');
    if (tournamentBtn) {
      e.preventDefault();
      const modal = document.getElementById('tournament-modal');
      if (modal) modal.classList.remove('hidden');
      showTournamentListModal();
      return;
    }

    // Shared logout flow
    const performLogout = async () => {
      // mark manual logout to prevent background token refresh from redirecting to /login
      (window as any).__manualLogout = true;
      try {
        await logout();
        showToast('Logged out successfully');
        // Navigate to home and force a full reload to ensure fresh state
        setTimeout(() => {
          window.location.href = '/';
          setTimeout(() => window.location.reload(), 60);
        }, 300);
      }
      catch (err) {
        console.error('Logout (client) error:', err);
        showErrorToast('Error logging out');
      }
      // clear the flag after a short delay so future 401s behave normally
      setTimeout(() => { (window as any).__manualLogout = false; }, 2000);
    };

    // Handle Logout Link (static or dynamic)
    const logoutLink = target.closest('#cta-login-logout, #cta-login-logout-static');
    if (logoutLink && logoutLink.textContent?.includes('LOGOUT')) {
      e.preventDefault();
      await performLogout();
      return;
    }

    // Handle Logout Button on profile page
    const profileLogoutBtn = target.closest('#profile-logout-btn');
    if (profileLogoutBtn) {
      e.preventDefault();
      await performLogout();
      return;
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initTheme(); // Initialize theme on DOMContentLoaded
});

function fetchLanguage(): string
{
  let language = localStorage.getItem('locale');
  if (!language) {
      language = navigator.language || 'en';

    switch (language) {
    case 'fr':
      setLocaleInStorage('fr');
      break;
    case 'it':
      setLocaleInStorage('it');
      break;
    default:
      setLocaleInStorage('en');
      break;
    }
  }
  return language;
}

function hydrateOnce()
{
  hydrateRoot(document);
  document.querySelectorAll('template').forEach(tpl => hydrateRoot((tpl as HTMLTemplateElement).content));
}

function hydrateRoot(root: ParentNode = document)
{
  // translate element text content
  const nodes = Array.from((root as any).querySelectorAll('[data-i18n]') as HTMLElement[]);
  nodes.forEach(el => {
    const key = el.dataset.i18n!;
    const rawVars = el.dataset.i18nVars || '{}';
    let vars = {};
    try { vars = JSON.parse(rawVars); } catch {}
    try {
      const val = t(key, vars as Record<string, string|number>);
      el.textContent = val;
    } catch (err) {
      el.textContent = key;
    }
  });

  // translate input placeholders (data-i18n-placeholder)
  const phNodes = Array.from((root as any).querySelectorAll('[data-i18n-placeholder]') as HTMLInputElement[]);
  phNodes.forEach(el => {
    const key = el.dataset.i18nPlaceholder!;
    try {
      el.placeholder = t(key);
    } catch (err) {
      el.placeholder = key;
    }
  });
}

export default {};