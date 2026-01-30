import { logout, deleteAccout } from '../../lib/auth';
import { openChatModal } from '../../lib/chat';
import type { User } from '../../lib/auth';
import { FriendsManager } from './FriendsManager';
import { setFriendsManager } from './Notifications';
import { setLocaleInStorage } from 'intlayer';
import type { GameStats } from './UserCardCharts';
import { getAllMatchHistories, calculateStats } from '../../lib/matchHistory';

let navigate: (path: string) => Promise<void>;
// Lazy load navigate function to avoid circular dependency
async function getNavigateFunction() {
  if (!navigate) {
    const spaModule = await import('../../spa');
    navigate = spaModule.navigate;
  }
  return navigate;
}

export async function renderProfileCard(user: User, root: HTMLElement, gameStats?: GameStats): Promise<HTMLElement | null> {
  // Initialize FriendsManager
  const friendsManager = new FriendsManager({ currentUserId: user.id });
  // Connect FriendsManager to Notifications for real-time updates
  setFriendsManager(friendsManager);
  // Clone template
  const template = document.getElementById('profile-card-template') as HTMLTemplateElement;
  if (!template) {
    console.error('Profile card template not found');
    return null;
  }

  const card = template.content.cloneNode(true) as DocumentFragment;
  const cardEl = (card.querySelector('div') as HTMLElement) || null;

  if (!cardEl) return null;

  // ===== Avatar =====
  const avatar = card.querySelector('#profile-avatar') as HTMLImageElement;
  if (avatar) {
    if (user.avatarUrl) {
      console.log('Setting avatar URL:', user.avatarUrl);
      avatar.src = user.avatarUrl.startsWith('http') ? user.avatarUrl : `https://localhost:3000${user.avatarUrl}`;
    } else {
      avatar.src = '/assets/placeholder-avatar.jpg';
    }
  }

  // Avatar upload handler
  const avatarInput = card.querySelector('#input-avatar') as HTMLInputElement;
  if (avatarInput) {
    avatarInput.addEventListener('change', async () => {
      const file = avatarInput.files ? avatarInput.files[0] : null;
      if (!file) return;
      
      const formData = new FormData();
      formData.append('file', file);
      try {
        const res = await fetch(`/api/users/upload-avatar`, {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });
        if (!res.ok) throw new Error(`Avatar upload failed: ${res.status}`);
        const body = await res.json();
        if (body && body.avatarUrl) {
          avatar.src = body.avatarUrl.startsWith('http') ? body.avatarUrl : `https://localhost:3000${body.avatarUrl}`;
          user.avatarUrl = body.avatarUrl;
        }
      } catch (err) {
        console.error('Avatar upload error:', err);
      }
    });
  }

  // ===== Username =====
  const username = card.querySelector('#profile-username') as HTMLElement;
  if (username) {
    username.textContent = user.username || user.email || 'User';
  }

  // ===== 2FA Toggle =====
  const enabled2FA = card.querySelector('#profile-tfa') as HTMLElement;
  const input2FA = card.querySelector('#input-lock') as HTMLInputElement;

  input2FA.checked = user.tfaEnabled || false;
  if (enabled2FA) {
    enabled2FA.textContent = user.tfaEnabled ? 'DISABLE 2FA' : 'ENABLE 2FA';
  }

  if (input2FA) {
    input2FA.addEventListener('change', async () => {
      const tfaEnabled = input2FA.checked;
      try {
        const res = await fetch(`/api/auth/enable-2fa`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ tfaEnabled }),
        });
        if (!res.ok) throw new Error(`2FA update failed: ${res.status}`);
        user.tfaEnabled = tfaEnabled;
        localStorage.setItem('tfaEnabled', tfaEnabled ? 'true' : 'false');
        if (enabled2FA) {
          enabled2FA.textContent = tfaEnabled ? 'DISABLE 2FA' : 'ENABLE 2FA';
        }
      } catch (err) {
        console.error('2FA update error:', err);
        input2FA.checked = !tfaEnabled;
      }
    });
  }

  // ===== Email & ID =====
  const email = card.querySelector('#profile-email') as HTMLElement;
  if (email) email.textContent = user.email || '';

  const id = card.querySelector('#profile-id') as HTMLElement;
  if (id) id.textContent = user.id || '';

  // ===== Buttons =====
  const logoutBtn = card.querySelector('#profile-logout-btn') as HTMLButtonElement;
  const chatBtn = card.querySelector('#profile-chat-btn') as HTMLButtonElement;

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await logout();
      const fn = await getNavigateFunction();
      fn('/login');
    });
  }

  if (chatBtn) {
    chatBtn.addEventListener('click', () => {
      openChatModal();
    });
  }

  // ===== Delete Account Button =====
  const confirmDeleteBtn = document.getElementById('confirm-delete-btn') as HTMLButtonElement;
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', async () => {
      try {
        await deleteAccout();
        localStorage.removeItem('userId');
        localStorage.removeItem('tfaEnabled');
        //window.location.reload();
      } catch (err) {
        console.error('Delete account error:', err);
        alert('Failed to delete account');
      }
    });
  }

  const languageSelect = card.querySelector('#profile-language') as HTMLSelectElement;
  if (languageSelect) {
    // Load saved language from localStorage or use browser default
    const savedLanguage = localStorage.getItem('userLanguage') || 'en';
    languageSelect.value = savedLanguage;

    languageSelect.addEventListener('change', (e) => {
      const selectedLanguage = (e.target as HTMLSelectElement).value;
      
      // Save to localStorage
      localStorage.setItem('userLanguage', selectedLanguage);
      
      // Update intlayer locale
      setLocaleInStorage(selectedLanguage);
      
      console.log('Language changed to:', selectedLanguage);
      
      // Optionally reload the page to apply locale changes
      getNavigateFunction().then(n => n(window.location.pathname));
    });
  }

  // ===== Add Charts if stats provided =====
  if (gameStats && Object.keys(gameStats).length > 0) {
    const chartsSection = card.querySelector('#profile-charts-section');
    if (chartsSection) {
      // Pong stats
      if (gameStats.pongWins !== undefined || gameStats.pongHistory) {
        const pongDiv = document.createElement('div');
        pongDiv.className = 'bg-neutral-800/50 rounded-lg p-4 border border-neutral-700';
        
        const pongTitle = document.createElement('h3');
        pongTitle.className = 'text-lg font-extrabold text-[#0dff66] mb-3 uppercase tracking-tight';
        pongTitle.textContent = 'Pong Statistics';
        pongDiv.appendChild(pongTitle);

        const pongStats = document.createElement('div');
        pongStats.className = 'space-y-2 text-neutral-300';
        const pongWins = gameStats.pongWins || 0;
        const pongLosses = gameStats.pongLosses || 0;
        const pongTotal = pongWins + pongLosses;
        const pongWinRate = pongTotal > 0 ? ((pongWins / pongTotal) * 100).toFixed(1) : 0;
        
        pongStats.innerHTML = `
          <div class="flex justify-between items-center">
            <span>Matches Played:</span>
            <span class="font-bold text-white">${pongTotal}</span>
          </div>
          <div class="flex justify-between items-center">
            <span>Wins:</span>
            <span class="font-bold text-green-400">${pongWins}</span>
          </div>
          <div class="flex justify-between items-center">
            <span>Losses:</span>
            <span class="font-bold text-red-400">${pongLosses}</span>
          </div>
          <div class="flex justify-between items-center">
            <span>Win Rate:</span>
            <span class="font-bold text-cyan-400">${pongWinRate}%</span>
          </div>
        `;
        pongDiv.appendChild(pongStats);
        chartsSection.appendChild(pongDiv);
      }

      // Tris stats
      if (gameStats.trisWins !== undefined || gameStats.trisHistory) {
        const trisDiv = document.createElement('div');
        trisDiv.className = 'bg-neutral-800/50 rounded-lg p-4 border border-neutral-700';
        
        const trisTitle = document.createElement('h3');
        trisTitle.className = 'text-lg font-extrabold text-[#0dff66] mb-3 uppercase tracking-tight';
        trisTitle.textContent = 'Tris Statistics';
        trisDiv.appendChild(trisTitle);

        const trisStats = document.createElement('div');
        trisStats.className = 'space-y-2 text-neutral-300';
        const trisWins = gameStats.trisWins || 0;
        const trisLosses = gameStats.trisLosses || 0;
        const trisTotal = trisWins + trisLosses;
        const trisWinRate = trisTotal > 0 ? ((trisWins / trisTotal) * 100).toFixed(1) : 0;
        
        trisStats.innerHTML = `
          <div class="flex justify-between items-center">
            <span>Matches Played:</span>
            <span class="font-bold text-white">${trisTotal}</span>
          </div>
          <div class="flex justify-between items-center">
            <span>Wins:</span>
            <span class="font-bold text-green-400">${trisWins}</span>
          </div>
          <div class="flex justify-between items-center">
            <span>Losses:</span>
            <span class="font-bold text-red-400">${trisLosses}</span>
          </div>
          <div class="flex justify-between items-center">
            <span>Win Rate:</span>
            <span class="font-bold text-cyan-400">${trisWinRate}%</span>
          </div>
        `;
        trisDiv.appendChild(trisStats);
        chartsSection.appendChild(trisDiv);
      }

      // Render detailed charts asynchronously
      setTimeout(async () => {
        const { createGameStatsChart } = await import('./UserCardCharts');
        if (gameStats.pongWins !== undefined) {
          const pongChartId = `profile-pong-donut`;
          const pongChartContainer = chartsSection.querySelector(`#${pongChartId}`);
          if (pongChartContainer) {
            try {
              await createGameStatsChart(pongChartId, 'pong', gameStats, user.id);
            } catch (e) {
              console.warn('Failed to render pong chart:', e);
            }
          }
        }
        
        if (gameStats.trisWins !== undefined) {
          const trisChartId = `profile-tris-donut`;
          const trisChartContainer = chartsSection.querySelector(`#${trisChartId}`);
          if (trisChartContainer) {
            try {
              await createGameStatsChart(trisChartId, 'tris', gameStats, user.id);
            } catch (e) {
              console.warn('Failed to render tris chart:', e);
            }
          }
        }
      }, 100);
    }
  } else {
    // Load match histories if gameStats not provided
    const chartsSection = card.querySelector('#profile-charts-section');
    if (chartsSection) {
      try {
        const { trisHistory, pongHistory } = await getAllMatchHistories(user.id);

        // Pong stats
        if (pongHistory && pongHistory.length > 0) {
          const pongStats = calculateStats(pongHistory, user.id);
          const pongDiv = document.createElement('div');
          pongDiv.className = 'bg-neutral-800/50 rounded-lg p-4 border border-neutral-700';
          
          const pongTitle = document.createElement('h3');
          pongTitle.className = 'text-lg font-extrabold text-[#0dff66] mb-3 uppercase tracking-tight';
          pongTitle.textContent = 'Pong Statistics';
          pongDiv.appendChild(pongTitle);

          const pongStatsDiv = document.createElement('div');
          pongStatsDiv.className = 'space-y-2 text-neutral-300';
          pongStatsDiv.innerHTML = `
            <div class="flex justify-between items-center">
              <span>Matches Played:</span>
              <span class="font-bold text-white">${pongStats.total}</span>
            </div>
            <div class="flex justify-between items-center">
              <span>Wins:</span>
              <span class="font-bold text-green-400">${pongStats.wins}</span>
            </div>
            <div class="flex justify-between items-center">
              <span>Losses:</span>
              <span class="font-bold text-red-400">${pongStats.losses}</span>
            </div>
            <div class="flex justify-between items-center">
              <span>Win Rate:</span>
              <span class="font-bold text-cyan-400">${pongStats.winRate}%</span>
            </div>
          `;
          pongDiv.appendChild(pongStatsDiv);
          chartsSection.appendChild(pongDiv);
        }

        // Tris stats
        if (trisHistory && trisHistory.length > 0) {
          const trisStats = calculateStats(trisHistory, user.id);
          const trisDiv = document.createElement('div');
          trisDiv.className = 'bg-neutral-800/50 rounded-lg p-4 border border-neutral-700';
          
          const trisTitle = document.createElement('h3');
          trisTitle.className = 'text-lg font-extrabold text-[#0dff66] mb-3 uppercase tracking-tight';
          trisTitle.textContent = 'Tris Statistics';
          trisDiv.appendChild(trisTitle);

          const trisStatsDiv = document.createElement('div');
          trisStatsDiv.className = 'space-y-2 text-neutral-300';
          trisStatsDiv.innerHTML = `
            <div class="flex justify-between items-center">
              <span>Matches Played:</span>
              <span class="font-bold text-white">${trisStats.total}</span>
            </div>
            <div class="flex justify-between items-center">
              <span>Wins:</span>
              <span class="font-bold text-green-400">${trisStats.wins}</span>
            </div>
            <div class="flex justify-between items-center">
              <span>Losses:</span>
              <span class="font-bold text-red-400">${trisStats.losses}</span>
            </div>
            <div class="flex justify-between items-center">
              <span>Win Rate:</span>
              <span class="font-bold text-cyan-400">${trisStats.winRate}%</span>
            </div>
          `;
          trisDiv.appendChild(trisStatsDiv);
          chartsSection.appendChild(trisDiv);
        }

        // Render match history charts asynchronously
        setTimeout(async () => {
          const { createMatchHistoryChart } = await import('./UserCardCharts');
          
          if (pongHistory && pongHistory.length > 0) {
            const pongHistoryChartId = `profile-pong-history-chart`;
            const pongHistoryWrapper = document.createElement('div');
            pongHistoryWrapper.className = 'bg-neutral-800/50 rounded-lg p-4 border border-neutral-700';
            
            const pongHistoryTitle = document.createElement('h4');
            pongHistoryTitle.className = 'text-lg font-extrabold text-[#0dff66] mb-3 uppercase tracking-tight';
            pongHistoryTitle.textContent = 'Pong Match History';
            pongHistoryWrapper.appendChild(pongHistoryTitle);
            
            const pongHistoryContainer = document.createElement('div');
            pongHistoryContainer.id = pongHistoryChartId;
            pongHistoryContainer.className = 'w-full h-[350px]';
            pongHistoryWrapper.appendChild(pongHistoryContainer);
            
            chartsSection.appendChild(pongHistoryWrapper);
            
            try {
              await createMatchHistoryChart(pongHistoryChartId, 'pong', { pongHistory }, user.id);
            } catch (e) {
              console.warn('Failed to render pong history chart:', e);
            }
          }

          if (trisHistory && trisHistory.length > 0) {
            const trisHistoryChartId = `profile-tris-history-chart`;
            const trisHistoryWrapper = document.createElement('div');
            trisHistoryWrapper.className = 'bg-neutral-800/50 rounded-lg p-4 border border-neutral-700';
            
            const trisHistoryTitle = document.createElement('h4');
            trisHistoryTitle.className = 'text-lg font-extrabold text-[#0dff66] mb-3 uppercase tracking-tight';
            trisHistoryTitle.textContent = 'Tris Match History';
            trisHistoryWrapper.appendChild(trisHistoryTitle);
            
            const trisHistoryContainer = document.createElement('div');
            trisHistoryContainer.id = trisHistoryChartId;
            trisHistoryContainer.className = 'w-full h-[350px]';
            trisHistoryWrapper.appendChild(trisHistoryContainer);
            
            chartsSection.appendChild(trisHistoryWrapper);
            
            try {
              await createMatchHistoryChart(trisHistoryChartId, 'tris', { trisHistory }, user.id);
            } catch (e) {
              console.warn('Failed to render tris history chart:', e);
            }
          }
        }, 100);
      } catch (error) {
        console.error('Failed to load match histories:', error);
      }
    }
  }

  // Append to root
  root.appendChild(card);

  return cardEl;
}
