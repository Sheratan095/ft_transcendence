import { logout, deleteAccout } from '../../lib/auth';
import { openChatModal } from '../../lib/chat';
import type { User } from '../../lib/auth';
import { FriendsManager } from './FriendsManager';
import { setFriendsManager } from './Notifications';
import { setLocaleInStorage } from 'intlayer';
import type { GameStats } from './UserCardCharts';
import { getAllMatchHistories, calculateStats } from '../../lib/matchHistory';
import { goToRoute } from '../../spa';
import { initCardHoverEffect } from '../../lib/card';

export async function renderProfileCard(container: HTMLElement | null) {
  if (!container) {
    console.error('renderProfileCard: container element is null');
    return null;
  }

  const template = document.getElementById('profile-template') as HTMLTemplateElement | null;
  if (!template) {
    console.error('Profile template not found');
    return null;
  }

  // Clone template and append to container
  const clone = template.content.cloneNode(true);
  container.innerHTML = '';
  container.appendChild(clone);

  // Find the card element to populate
  const cardEl = container.querySelector('.card') as HTMLElement | null;
  if (!cardEl) {
    console.error('Profile card element not found in template');
    return null;
  }

  // Get user from localStorage
  const user: User = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user') as string) : null;
  if (!user || !user.id) {
    console.error('No user data found in localStorage');
    logout();
    return null;
  }
  // Initialize FriendsManager
  const friendsManager = new FriendsManager({ currentUserId: user.id });
  setFriendsManager(friendsManager);

  // ===== Avatar =====
  const avatar = cardEl.querySelector('#profile-avatar') as HTMLImageElement;
  if (avatar) avatar.src = user.avatarUrl || '/assets/placeholder-avatar.jpg';

  // Avatar upload handler
  const avatarInput = cardEl.querySelector('#input-avatar') as HTMLInputElement;
  if (avatarInput && avatar) {
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
          avatar.src = body.avatarUrl.startsWith('http') ? body.avatarUrl : `/api${body.avatarUrl}`;
          user.avatarUrl = body.avatarUrl;
        }
      } catch (err) {
        console.error('Avatar upload error:', err);
      }
    });
  }

  // ===== Username =====
  const username = cardEl.querySelector('#profile-username') as HTMLElement;
  if (username) {
    username.textContent = user.username || user.email || 'User';
  }

  // ===== 2FA Toggle =====
  const enabled2FA = cardEl.querySelector('#profile-tfa') as HTMLElement;
  const input2FA = cardEl.querySelector('#input-lock') as HTMLInputElement;
  if (input2FA && enabled2FA) {
    input2FA.checked = user.tfaEnabled || false;
    enabled2FA.textContent = user.tfaEnabled ? 'DISABLE 2FA' : 'ENABLE 2FA';
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
        enabled2FA.textContent = tfaEnabled ? 'DISABLE 2FA' : 'ENABLE 2FA';
      } catch (err) {
        console.error('2FA update error:', err);
        input2FA.checked = !tfaEnabled;
      }
    });
  }

  // ===== Email & ID =====
  const email = cardEl.querySelector('#profile-email') as HTMLElement;
  if (email) email.textContent = user.email || '';

  const id = cardEl.querySelector('#profile-id') as HTMLElement;
  if (id) id.textContent = user.id || '';

  // ===== Buttons =====
  const logoutBtn = cardEl.querySelector('#profile-logout-btn') as HTMLButtonElement;
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await logout();
      goToRoute('/login');
    });
  }

  const chatBtn = cardEl.querySelector('#profile-chat-btn') as HTMLButtonElement;
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
      } catch (err) {
        console.error('Delete account error:', err);
        alert('Failed to delete account');
      }
    });
  }

  // ===== Language selector =====
  const languageSelect = cardEl.querySelector('#profile-language') as HTMLSelectElement;
  if (languageSelect) {
    const savedLanguage = localStorage.getItem('userLanguage') || 'en';
    languageSelect.value = savedLanguage;
    languageSelect.addEventListener('change', (e) => {
      const selectedLanguage = (e.target as HTMLSelectElement).value;
      localStorage.setItem('userLanguage', selectedLanguage);
      setLocaleInStorage(selectedLanguage);
      console.log('Language changed to:', selectedLanguage);
    });
  }

  // Initialize hover effects
  initCardHoverEffect();

  // ===== Fetch Stats and Match History asynchronously (Non-blocking) =====
  (async () => {
    console.log('[ProfileCard] Starting stats fetch for user:', user.id);
    
    try {
      const [trisRes, pongRes] = await Promise.all([
        fetch(`/api/tris/stats?id=${user.id}`, { method: 'GET', credentials: 'include' }),
        fetch(`/api/pong/stats?id=${user.id}`, { method: 'GET', credentials: 'include' })
      ]);

      const trisStats = trisRes.ok ? await trisRes.json() : null;
      const pongStats = pongRes.ok ? await pongRes.json() : null;

      console.log('[ProfileCard] Stats received:', { trisStats, pongStats });

      // Update header stats
      const profileWinsEl = cardEl.querySelector('#profile-wins');
      if (profileWinsEl) {
        const totalWins = (trisStats?.gamesWon || 0) + (pongStats?.gamesWon || 0);
        profileWinsEl.textContent = totalWins.toString();
      }
      const profileRankEl = cardEl.querySelector('#profile-rank');
      if (profileRankEl) {
        profileRankEl.textContent = pongStats?.rank || trisStats?.rank || 'Rookie';
      }

      const gameStats: GameStats = {
        trisWins: trisStats?.gamesWon || 0,
        trisLosses: trisStats?.gamesLost || 0,
        pongWins: pongStats?.gamesWon || 0,
        pongLosses: pongStats?.gamesLost || 0,
      };

      const chartsSection = cardEl.querySelector('#profile-charts-section');
      if (chartsSection) {
        chartsSection.innerHTML = ''; // Clear loading if any

        // GAME SELECTOR
        const selectorRow = document.createElement('div');
        selectorRow.className = 'flex flex-row gap-2 mb-4 justify-end';
        selectorRow.innerHTML = `
          <button id="btn-show-pong" class="text-sm font-black px-3 py-1 bg-[#00bcd4] text-black uppercase tracking-[0.2em] rounded border border-[#00bcd4] transition-all">PONG</button>
          <button id="btn-show-tris" class="text-sm font-black px-3 py-1 bg-transparent text-neutral-500 uppercase tracking-[0.2em] rounded border border-neutral-700 hover:border-neutral-500 transition-all">TRIS</button>
        `;
        chartsSection.appendChild(selectorRow);
        
        // SINGLE horizontal row for stats components
        const mainRow = document.createElement('div');
        mainRow.className = 'flex flex-row flex-wrap lg:flex-nowrap gap-4 w-full';
        chartsSection.appendChild(mainRow);

        // History row sits under the stats row (initially same view visibility)
        const historyRow = document.createElement('div');
        historyRow.className = 'flex flex-row flex-wrap lg:flex-nowrap gap-4 w-full mt-3';
        chartsSection.appendChild(historyRow);

        const pongStatsElements: HTMLElement[] = [];
        const trisStatsElements: HTMLElement[] = [];

        // Pong Summary
        if (gameStats.pongWins !== undefined) {
          const pongDiv = document.createElement('div');
          pongDiv.className = 'bg-neutral-800/10 rounded-lg p-3 border border-neutral-700/30 flex flex-row items-center gap-4 flex-1 min-w-[200px] h-32';
          
          const pongWins = gameStats.pongWins || 0;
          const pongLosses = gameStats.pongLosses || 0;
          const pongTotal = pongWins + pongLosses;
          const pongWinRate = pongTotal > 0 ? ((pongWins / pongTotal) * 100).toFixed(0) : 0;

          pongDiv.innerHTML = `
            <div class="flex-1">
              <h3 class="text-lg text-center font-black text-[#00bcd4] uppercase tracking-[0.2em] mb-1">PONG</h3>
              <div class="flex flex-row gap-3 text-base">
                <div class="flex flex-col"><span class="text-neutral-500 font-bold">P</span><span class="text-white">${pongTotal}</span></div>
                <div class="flex flex-col"><span class="text-neutral-500 font-bold">W</span><span class="text-green-400">${pongWins}</span></div>
                <div class="flex flex-col"><span class="text-neutral-500 font-bold">L</span><span class="text-red-400">${pongLosses}</span></div>
                <div class="flex flex-col"><span class="text-neutral-500 font-bold">%</span><span class="text-cyan-400">${pongWinRate}</span></div>
              </div>
            </div>
            <div id="profile-pong-donut" class="w-12 h-12 flex-shrink-0"></div>
          `;
          mainRow.appendChild(pongDiv);
          pongStatsElements.push(pongDiv);
        }

        // Tris Summary
        if (gameStats.trisWins !== undefined) {
          const trisDiv = document.createElement('div');
          trisDiv.className = 'bg-neutral-800/10 rounded-lg p-3 border border-neutral-700/30 flex flex-row items-center gap-4 flex-1 min-w-[200px] h-32 hidden';
          
          const trisWins = gameStats.trisWins || 0;
          const trisLosses = gameStats.trisLosses || 0;
          const trisTotal = trisWins + trisLosses;
          const trisWinRate = trisTotal > 0 ? ((trisWins / trisTotal) * 100).toFixed(0) : 0;

          trisDiv.innerHTML = `
            <div class="flex-1">
              <h3 class="text-lg text-center font-black text-[#0dff66] uppercase tracking-[0.2em] mb-1">TRIS</h3>
              <div class="flex flex-row gap-3 text-base">
                <div class="flex flex-col"><span class="text-neutral-500 font-bold">P</span><span class="text-white">${trisTotal}</span></div>
                <div class="flex flex-col"><span class="text-neutral-500 font-bold">W</span><span class="text-green-400">${trisWins}</span></div>
                <div class="flex flex-col"><span class="text-neutral-500 font-bold">L</span><span class="text-red-400">${trisLosses}</span></div>
                <div class="flex flex-col"><span class="text-neutral-500 font-bold">%</span><span class="text-cyan-400">${trisWinRate}</span></div>
              </div>
            </div>
            <div id="profile-tris-donut" class="w-12 h-12 flex-shrink-0"></div>
          `;
          mainRow.appendChild(trisDiv);
          trisStatsElements.push(trisDiv);
        }

        // Fetch histories
        const { trisHistory, pongHistory } = await getAllMatchHistories(user.id);
        const { createMatchHistoryChart, createGameStatsChart } = await import('./UserCardCharts');

        // Pong History
        if (pongHistory && pongHistory.length > 0) {
          const pongHistoryWrapper = document.createElement('div');
          pongHistoryWrapper.className = 'bg-neutral-800/10 rounded-lg p-3 border border-neutral-700/30 flex-1 min-w-[250px] h-32 flex flex-col';
          const pongHistoryChartId = `profile-pong-history-chart`;
          pongHistoryWrapper.innerHTML = `
            <h4 class="text-lg text-center font-black text-[#00bcd4] mb-1 uppercase tracking-[0.2em]">PONG HISTORY</h4>
            <div id="${pongHistoryChartId}" class="w-full flex-1"></div>
          `;
          historyRow.appendChild(pongHistoryWrapper);
          pongStatsElements.push(pongHistoryWrapper);
          try {
            await createMatchHistoryChart(pongHistoryChartId, 'pong', { pongHistory }, user.id);
          } catch (e) { console.warn(e); }
        }

        // Tris History
        if (trisHistory && trisHistory.length > 0) {
          const trisHistoryWrapper = document.createElement('div');
          trisHistoryWrapper.className = 'bg-neutral-800/10 rounded-lg p-3 border border-neutral-700/30 flex-1 min-w-[250px] h-32 flex flex-col hidden';
          const trisHistoryChartId = `profile-tris-history-chart`;
          trisHistoryWrapper.innerHTML = `
            <h4 class="text-lg text-center font-black text-[#0dff66] mb-1 uppercase tracking-[0.2em]">TRIS HISTORY</h4>
            <div id="${trisHistoryChartId}" class="w-full flex-1"></div>
          `;
          historyRow.appendChild(trisHistoryWrapper);
          trisStatsElements.push(trisHistoryWrapper);
          try {
            await createMatchHistoryChart(trisHistoryChartId, 'tris', { trisHistory }, user.id);
          } catch (e) { console.warn(e); }
        }

        // Selector buttons logic
        const btnPong = selectorRow.querySelector('#btn-show-pong') as HTMLButtonElement;
        const btnTris = selectorRow.querySelector('#btn-show-tris') as HTMLButtonElement;

        const setView = (view: 'pong' | 'tris') => {
          if (view === 'pong') {
            btnPong.className = 'text-sm font-black px-3 py-1 bg-[#00bcd4] text-black uppercase tracking-[0.2em] rounded border border-[#00bcd4] transition-all';
            btnTris.className = 'text-sm font-black px-3 py-1 bg-transparent text-neutral-500 uppercase tracking-[0.2em] rounded border border-neutral-700 hover:border-neutral-500 transition-all';
            pongStatsElements.forEach(el => el.classList.remove('hidden'));
            trisStatsElements.forEach(el => el.classList.add('hidden'));
          } else {
            btnTris.className = 'text-sm font-black px-3 py-1 bg-[#0dff66] text-black uppercase tracking-[0.2em] rounded border border-[#0dff66] transition-all';
            btnPong.className = 'text-sm font-black px-3 py-1 bg-transparent text-neutral-500 uppercase tracking-[0.2em] rounded border border-neutral-700 hover:border-neutral-500 transition-all';
            trisStatsElements.forEach(el => el.classList.remove('hidden'));
            pongStatsElements.forEach(el => el.classList.add('hidden'));
          }
          // Dispatch resize event to help ApexCharts recalculate visibility
          window.dispatchEvent(new Event('resize'));
        };

        btnPong.addEventListener('click', () => setView('pong'));
        btnTris.addEventListener('click', () => setView('tris'));

        // Render donuts
        if (gameStats.pongWins !== undefined && chartsSection.querySelector('#profile-pong-donut')) {
          try { await createGameStatsChart('profile-pong-donut', 'pong', gameStats, user.id); } catch (e) {}
        }
        if (gameStats.trisWins !== undefined && chartsSection.querySelector('#profile-tris-donut')) {
          try { await createGameStatsChart('profile-tris-donut', 'tris', gameStats, user.id); } catch (e) {}
        }
      }
    } catch (err) {
      console.error('[ProfileCard] Combined fetch error:', err);
    }
  })();
}

