import { isLoggedInClient, isLoggedInServerValidate, getAccessToken, clearTokens, fetchUserProfile } from '../lib/auth';

export class Header {
  private profileIcon: HTMLImageElement | null = null;
  private loginLink: HTMLAnchorElement | null = null;
  private dropdown: HTMLDivElement | null = null;

  constructor() {
    this.init();
  }

  private init() {
    this.createHeaderHTML();
    this.attachElements();
    this.attachHandlers();
    this.showProfileIfLoggedIn();
    fetchUserProfile();
  }

  private createHeaderHTML() {
    const header = document.createElement('header');
    header.className = 'bg-white shadow-sm';
    header.innerHTML = `
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div class="flex justify-between items-center">
          <div class="flex items-center">
            <a href="/" class="text-xl font-bold text-gray-900">ft_transcendence</a>
          </div>
          <div class="flex items-center space-x-4">
            <div class="relative">
              <img id="profile-icon" src="../../assets/placeholder-avatar.jpg" alt="Profile" 
                class="w-8 h-8 rounded-full hidden cursor-pointer" 
                title="Open profile">
              <div id="profile-dropdown" 
                class="hidden absolute right-0 mt-2 w-48 bg-white border rounded-md shadow-lg py-1">
                <a href="../src/pages/profile-info/profile.html" 
                  class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Profile</a>
                <button id="logout-btn" 
                  class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                  Logout
                </button>
              </div>
            </div>
            <a id="login-link" href="../src/pages/login/login.html" 
              class="text-blue-500 hover:text-blue-700">Sign in</a>
          </div>
        </div>
      </div>
    `;
    
    // Insert at the start of body
    document.body.insertBefore(header, document.body.firstChild);
  }

  private attachElements() {
    this.profileIcon = document.getElementById('profile-icon') as HTMLImageElement;
    this.loginLink = document.getElementById('login-link') as HTMLAnchorElement;
    this.dropdown = document.getElementById('profile-dropdown') as HTMLDivElement;
  }

  private attachHandlers() {
    if (this.profileIcon) {
      // Toggle dropdown on click
      this.profileIcon.addEventListener('click', () => {
        this.dropdown?.classList.toggle('hidden');
      });

      // Close dropdown when clicking outside
      document.addEventListener('click', (event) => {
        if (!this.profileIcon?.contains(event.target as Node)) {
          this.dropdown?.classList.add('hidden');
        }
      });
    }

    // Logout handler
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.doLogout());
    }
  }

  private async showProfileIfLoggedIn() {
    if (isLoggedInClient()) {
      this.showProfileUI();
      try {
        const validation = await isLoggedInServerValidate();
        if (!validation.ok) {
          console.warn('Server validation failed:', validation.error);
          this.hideProfileUI();
        } else if (validation.user?.avatar) {
          // Update avatar if available
          this.profileIcon!.src = validation.user.avatar;
        }
      } catch (err) {
        console.warn('Validation request failed:', err);
      }
    } else {
      this.hideProfileUI();
    }
  }

  private showProfileUI() {
    this.profileIcon?.classList.remove('hidden');
    this.loginLink?.classList.add('hidden');
  }

  private hideProfileUI() {
    this.profileIcon?.classList.add('hidden');
    this.loginLink?.classList.remove('hidden');
    this.dropdown?.classList.add('hidden');
  }

  private async doLogout() {
    const token = getAccessToken();
    if (token) {
      try {
        await fetch('http://localhost:3000/auth/logout', {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      } catch (err) {
        // Ignore network errors during logout
      }
    }
    clearTokens();
    this.hideProfileUI();
    window.location.href = './pages/login/login.html';
  }
}