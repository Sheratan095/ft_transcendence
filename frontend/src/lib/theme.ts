/**
 * Dark/Light mode theme switcher
 */

type Theme = 'dark' | 'light';

const THEME_STORAGE_KEY = 'theme-preference';

/**
 * Initialize theme system
 */
export function initTheme() {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
  const preferredTheme = savedTheme || getSystemTheme();
  
  applyTheme(preferredTheme);
  setupThemeToggle();
}

/**
 * Get system theme preference
 */
function getSystemTheme(): Theme {
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

/**
 * Apply theme to the document
 */
function applyTheme(theme: Theme) {
  const html = document.documentElement;
  html.classList.remove('dark', 'light');
  html.classList.add(theme);
  html.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_STORAGE_KEY, theme);
}

/**
 * Setup theme toggle button
 */
function setupThemeToggle() {
  const toggleBtn = document.getElementById('theme-toggle-btn');
  if (!toggleBtn) return;

  toggleBtn.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme') as Theme || 'dark';
    const newTheme: Theme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
    updateToggleIcon(newTheme);
  });

  // Set initial icon
  const currentTheme = document.documentElement.getAttribute('data-theme') as Theme || 'dark';
  updateToggleIcon(currentTheme);
}

/**
 * Update toggle button icon based on theme
 */
function updateToggleIcon(theme: Theme) {
  const toggleBtn = document.getElementById('theme-toggle-btn') as HTMLButtonElement | null;
  if (!toggleBtn) return;

  const icon = toggleBtn.querySelector('svg');
  if (!icon) return;

  // For dark mode, show sun icon
  // For light mode, show moon icon
  if (theme === 'dark') {
    icon.innerHTML = `
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M 20.354 15.354 A 9 9 0 0 0 8.646 3.646 A 9.003 9.003 0 0 0 12 21 a 9 9.003 0 0 0 8.354 -5.646 z" />
    `;
  } else {
    icon.innerHTML = `
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    `;
  }
}

/**
 * Get current theme
 */
export function getCurrentTheme(): Theme {
  return (document.documentElement.getAttribute('data-theme') as Theme) || 'dark';
}

/**
 * Apply theme-aware classes to an element
 * Adds the appropriate theme class to ensure it respects light mode styling
 */
export function applyThemeClasses(element: HTMLElement, isDarkModeElement: boolean = true) {
  const currentTheme = getCurrentTheme();
  
  // Ensure the element will be properly styled in light mode
  if (isDarkModeElement && currentTheme === 'light') {
    element.classList.add('light-mode-aware');
  }
}
