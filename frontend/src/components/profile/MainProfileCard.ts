import { logout, deleteAccount, fetchUserProfile, SaveCurrentUserProfile, fetchLocalProfile } from '../../lib/auth';
import { openChatModal } from '../chat/chat';
import type { User } from '../../lib/auth';
import { FriendsManager } from './FriendsManager';
import { setFriendsManager } from '../shared/Notifications';
import { setLocaleInStorage } from 'intlayer';
import type { GameStats } from './UserCardCharts';
import { getAllMatchHistories, calculateStats } from '../../lib/matchHistory';
import { goToRoute } from '../../spa';
import { initCardHoverEffect } from '../../lib/card';
import { getUserId } from '../../lib/token';
import { attachUserOptions } from './profile';

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

  await SaveCurrentUserProfile(getUserId() as string);
  let user: User | null = await fetchLocalProfile();
  if (!user || !user.id) {
    console.error('No user data found');
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
  const lockLabel = cardEl.querySelector('label.btn-lock') as HTMLElement;
  const lockIcon = lockLabel ? lockLabel.querySelector('svg') : null;
  if (input2FA && enabled2FA && lockLabel && lockIcon) {
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

  if (logoutBtn)
  {
      logoutBtn.addEventListener('click', async () => {
       const success = await logout();

      if (success) {
        await attachUserOptions();
        goToRoute('/login');
      }
      else
        throw new Error('Logout failed');
    });
  }

  const chatBtn = cardEl.querySelector('#profile-chat-btn') as HTMLButtonElement;
  if (chatBtn) {
    chatBtn.addEventListener('click', () => {
      openChatModal();
    });
  }

  // ===== Delete Account Button =====
  const deleteBtn = cardEl.querySelector('button[command="show-modal"][commandfor="delete-dialog"]') as HTMLButtonElement;
  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      const deleteDialog = document.getElementById('delete-dialog') as HTMLElement;
      if (deleteDialog) {
        deleteDialog.classList.remove('hidden');
      }
    });
  }

  // Handle the confirm delete in the dialog
  const confirmDeleteBtn = document.getElementById('confirm-delete-btn') as HTMLButtonElement;
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', async () => {
      const deleteDialog = document.getElementById('delete-dialog') as HTMLElement;
      try {
        const success = await deleteAccount();

        if (success)
        {
          deleteDialog.classList.add('hidden');
          await attachUserOptions();
          goToRoute('/login');
        }
        else
          throw new Error('Delete failed');

      }
      catch (err) {
        console.error('Delete account error:', err);
        alert('Failed to delete account');
        if (deleteDialog) {
          deleteDialog.classList.add('hidden');
        }
      }
    });
  }

  // ===== Language selector =====
  const languageSelect = cardEl.querySelector('#profile-language') as HTMLSelectElement;
  if (languageSelect)
  {
    const savedLanguage = localStorage.getItem('userLanguage') || 'en';
    languageSelect.value = savedLanguage;
    languageSelect.addEventListener('change', async (e) =>
    {
      try
      {
        const response = await fetch(`/api/users/update-user`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ newLanguage: (e.target as HTMLSelectElement).value }),
        });

        if (!response.ok)
          throw new Error(`Language update failed: ${response.status}`);

        const responseBody = await response.json();

        if (responseBody && responseBody.language)
        {
          localStorage.setItem('userLanguage', responseBody.language);
          setLocaleInStorage(responseBody.language);
          console.log('Language changed to:', responseBody.language);
        }
        else
        {
          console.warn('Language update response missing language field');
        }

      }
      catch (err)
      {
        console.error('Failed to update language:', err);
      }
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

      // Remove border classes from parent containers of wins/rank (near userId)
      const removeBorderFromAncestor = (el: Element | null) => {
        if (!el) return;
        const parent = el.parentElement;
        if (!parent) return;
        Array.from(parent.classList).forEach((cn) => {
          if (cn.startsWith('border')) parent.classList.remove(cn);
        });
      };
      removeBorderFromAncestor(profileWinsEl);
      removeBorderFromAncestor(profileRankEl);

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
        mainRow.className = 'flex flex-row flex-wrap lg:flex-nowrap gap-2 w-full';
        chartsSection.appendChild(mainRow);

        // History row sits under the stats row (initially same view visibility)
        const historyRow = document.createElement('div');
        historyRow.className = 'flex flex-row flex-wrap lg:flex-nowrap gap-2 w-full mt-0';
        chartsSection.appendChild(historyRow);

        const pongStatsElements: HTMLElement[] = [];
        const trisStatsElements: HTMLElement[] = [];

        // Pong Summary
        if (gameStats.pongWins !== undefined) {
          const pongDiv = document.createElement('div');
          pongDiv.className = 'rounded-lg flex flex-col items-center gap-2 flex-1 min-w-[200px] h-15';

          const pongWins = gameStats.pongWins || 0;
          const pongLosses = gameStats.pongLosses || 0;
          const pongTotal = pongWins + pongLosses;
          const pongWinRate = pongTotal > 0 ? ((pongWins / pongTotal) * 100).toFixed(0) : 0;
          const pongElo = pongStats?.elo ?? pongStats?.rating ?? '—';
          const pongRankDisplay = pongStats?.rank ?? '—';

          pongDiv.innerHTML = `
            <div class="w-full">
              <h3 class="text-lg font-black text-[#00bcd4] uppercase tracking-[0.2em] mb-2 text-center">STATISTICS</h3>
              <div class="flex flex-row items-center justify-center gap-4">
                <div id="profile-pong-donut" class="w-12 h-12 flex-shrink-0"></div>
                <div>
                  <div class="flex flex-row gap-6 justify-center items-center text-lg">
                    <div class="flex flex-col items-center"><span class="text-neutral-500 font-bold text-sm">P</span><span class="text-white font-bold text-lg">${pongTotal}</span></div>
                    <div class="flex flex-col items-center"><span class="text-neutral-500 font-bold text-sm">W</span><span class="text-green-400 font-bold text-lg">${pongWins}</span></div>
                    <div class="flex flex-col items-center"><span class="text-neutral-500 font-bold text-sm">L</span><span class="text-red-400 font-bold text-lg">${pongLosses}</span></div>
                    <div class="flex flex-col items-center"><span class="text-neutral-500 font-bold text-sm">%</span><span class="text-cyan-400 font-bold text-lg">${pongWinRate}</span></div>
                    <div class="flex flex-col items-center"><span class="text-neutral-500 font-bold text-sm">ELO</span><span class="text-white font-bold text-lg">${pongElo}</span></div>
                    <div class="flex flex-col items-center"><span class="text-neutral-500 font-bold text-sm">RANK</span><span class="text-white font-bold text-lg">${pongRankDisplay}</span></div>
                  </div>
                </div>
              </div>
            </div>
          `;
          mainRow.appendChild(pongDiv);
          pongStatsElements.push(pongDiv);
        }

        // Tris Summary
        if (gameStats.trisWins !== undefined) {
          const trisDiv = document.createElement('div');
          trisDiv.className = 'rounded-lg flex flex-col items-center gap-2 flex-1 min-w-[200px] h-15 hidden';
          
          const trisWins = gameStats.trisWins || 0;
          const trisLosses = gameStats.trisLosses || 0;
          const trisTotal = trisWins + trisLosses;
          const trisWinRate = trisTotal > 0 ? ((trisWins / trisTotal) * 100).toFixed(0) : 0;
          const trisElo = trisStats?.elo ?? trisStats?.rating ?? '—';
          const trisRankDisplay = trisStats?.rank ?? '—';

          trisDiv.innerHTML = `
            <div class="w-full">
              <h3 class="text-lg font-black text-[#0dff66] uppercase tracking-[0.2em] mb-2 text-center">STATISTICS</h3>
              <div class="flex flex-row items-center justify-center gap-4">
                <div id="profile-tris-donut" class="w-12 h-12 flex-shrink-0"></div>
                <div>
                  <div class="flex flex-row gap-6 justify-center items-center text-lg">
                    <div class="flex flex-col items-center"><span class="text-neutral-500 font-bold text-sm">P</span><span class="text-white font-bold text-lg">${trisTotal}</span></div>
                    <div class="flex flex-col items-center"><span class="text-neutral-500 font-bold text-sm">W</span><span class="text-green-400 font-bold text-lg">${trisWins}</span></div>
                    <div class="flex flex-col items-center"><span class="text-neutral-500 font-bold text-sm">L</span><span class="text-red-400 font-bold text-lg">${trisLosses}</span></div>
                    <div class="flex flex-col items-center"><span class="text-neutral-500 font-bold text-sm">%</span><span class="text-cyan-400 font-bold text-lg">${trisWinRate}</span></div>
                    <div class="flex flex-col items-center"><span class="text-neutral-500 font-bold text-sm">ELO</span><span class="text-white font-bold text-lg">${trisElo}</span></div>
                    <div class="flex flex-col items-center"><span class="text-neutral-500 font-bold text-sm">RANK</span><span class="text-white font-bold text-lg">${trisRankDisplay}</span></div>
                  </div>
                </div>
              </div>
            </div>
          `;
          mainRow.appendChild(trisDiv);
          trisStatsElements.push(trisDiv);
        }

        // Fetch histories
        const { trisHistory, pongHistory } = await getAllMatchHistories(user.id);
        const { createMatchHistoryChart, createGameStatsChart } = await import('./UserCardCharts');

        // Pong History
        const pongHistoryWrapper = document.createElement('div');
        pongHistoryWrapper.className = 'rounded-lg mb-7 flex-1 min-w-[250px] h-32 flex flex-col';
        const pongHistoryChartId = `profile-pong-history-chart`;
        if (pongHistory && pongHistory.length > 0) {
          pongHistoryWrapper.innerHTML = `
            <h4 class="text-lg text-center font-black text-[#00bcd4] uppercase tracking-[0.2em]">TREND</h4>
            <div id="${pongHistoryChartId}" class="w-full flex-1"></div>
          `;
          historyRow.appendChild(pongHistoryWrapper);
          pongStatsElements.push(pongHistoryWrapper);
          try {
            await createMatchHistoryChart(pongHistoryChartId, 'pong', { pongHistory }, user.id);
          } catch (e) { console.warn(e); }
        } else {
          pongHistoryWrapper.innerHTML = `
            <h4 class="text-lg text-center font-black text-[#00bcd4] uppercase tracking-[0.2em]">TREND</h4>
            <div class="w-full flex-1 flex items-center justify-center text-neutral-500 italic">No matches available</div>
          `;
          historyRow.appendChild(pongHistoryWrapper);
          pongStatsElements.push(pongHistoryWrapper);
        }

        // Tris History
        const trisHistoryWrapper = document.createElement('div');
        trisHistoryWrapper.className = 'rounded-lg mb-7 flex-1 min-w-[250px] h-32 flex flex-col hidden';
        const trisHistoryChartId = `profile-tris-history-chart`;
        if (trisHistory && trisHistory.length > 0) {
          trisHistoryWrapper.innerHTML = `
            <h4 class="text-lg text-center font-black text-[#0dff66] uppercase tracking-[0.2em]">TREND</h4>
            <div id="${trisHistoryChartId}" class="w-full flex-1"></div>
          `;
          historyRow.appendChild(trisHistoryWrapper);
          trisStatsElements.push(trisHistoryWrapper);
          try {
            await createMatchHistoryChart(trisHistoryChartId, 'tris', { trisHistory }, user.id);
          } catch (e) { console.warn(e); }
        } else {
          trisHistoryWrapper.innerHTML = `
            <h4 class="text-lg text-center font-black text-[#0dff66] uppercase tracking-[0.2em]">TREND</h4>
            <div class="w-full flex-1 flex items-center justify-center text-neutral-500 italic">No matches available</div>
          `;
          historyRow.appendChild(trisHistoryWrapper);
          trisStatsElements.push(trisHistoryWrapper);
        }

        // Match list row - shows last few matches
        const matchListRow = document.createElement('div');
        matchListRow.className = 'flex flex-row flex-wrap lg:flex-nowrap gap-2 w-full mt-2';
        chartsSection.appendChild(matchListRow);

        // Helper function to create match list items
        const createMatchListHTML = (matches: any[], gameType: 'pong' | 'tris', limit: number = 5) => {
          if (!matches || matches.length === 0) return '';
          const recent = matches.slice(-limit).reverse();
          return recent.map((match, idx) => {
            const isWin = match.winnerId === user.id;
            
            if (gameType === 'pong') {
              // For Pong: W/L on left, centered names/scores, date on right
              const opponent = match.playerLeftId === user.id ? match.playerRightUsername : match.playerLeftUsername;
              const yourScore = match.playerLeftId === user.id ? match.playerLeftScore : match.playerRightScore;
              const opponentScore = match.playerLeftId === user.id ? match.playerRightScore : match.playerLeftScore;
              const matchDate = new Date(match.endedAt);
              const dateStr = matchDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              const timeStr = matchDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
              
              return `<div class="grid grid-cols-3 py-1 items-center px-10 text-xs ${isWin ? 'bg-green-900/30 border-l-2 border-green-400' : 'bg-red-900/30 border-l-2 border-red-400'}">
                <div class="font-black pl-10 ${isWin ? 'text-green-400' : 'text-red-400'}">${isWin ? 'WIN' : 'LOSS'}</div>
                <div class="text-center">
                  <span class="font-semibold">(${yourScore})</span> <span class="text-neutral-300">you vs <span class="font-semibold text-neutral-200">${opponent}</span> <span class="font-semibold">(${opponentScore})</span></span>
                </div>
                <div class="text-right text-neutral-400 whitespace-nowrap pr-15">
                  ${dateStr} ${timeStr}
                </div>
              </div>`;
            }
            else {
              // For Tris: W/L on left, centered names, date on right
              const opponent = match.playerOId === user.id ? match.playerXUsername  : match.playerOUsername;
              const matchDate = new Date(match.endedAt);
              const dateStr = matchDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              const timeStr = matchDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
              
              return `<div class="grid grid-cols-3 py-1 items-center px-10 text-xs ${isWin ? 'bg-green-900/30 border-l-2 border-green-400' : 'bg-red-900/30 border-l-2 border-red-400'}">
                <div class="font-black pl-10 ${isWin ? 'text-green-400' : 'text-red-400'}">${isWin ? 'WIN' : 'LOSS'}</div>
                <div class="text-center">
                  <span class="text-neutral-300">you vs <span class="font-semibold text-neutral-200">${opponent}</span></span>
                </div>
                <div class="text-right text-neutral-400 whitespace-nowrap pr-8">
                  ${dateStr} ${timeStr}
                </div>
              </div>`;
            }
          }).join('');
        };

        // Pong Match List
        const pongListWrapper = document.createElement('div');
        pongListWrapper.className = 'rounded-lg py-4 flex-1 min-w-[250px] flex flex-col';
        if (pongHistory && pongHistory.length > 0) {
          pongListWrapper.innerHTML = `
            <h4 class="text-lg font-black text-center text-[#00bcd4] mb-2 uppercase tracking-[0.2em]">RECENT MATCHES</h4>
            <div class="space-y-1 flex-1 overflow-y-auto text-xs">
              ${createMatchListHTML(pongHistory, 'pong', 5)}
            </div>
          `;
          matchListRow.appendChild(pongListWrapper);
          pongStatsElements.push(pongListWrapper);
        } else {
          pongListWrapper.innerHTML = `
            <h4 class="text-lg font-black text-center text-[#00bcd4] mb-2 uppercase tracking-[0.2em]">RECENT MATCHES</h4>
            <div class="flex-1 flex items-center justify-center text-neutral-500 italic">No matches available</div>
          `;
          matchListRow.appendChild(pongListWrapper);
          pongStatsElements.push(pongListWrapper);
        }

        // Tris Match List
        const trisListWrapper = document.createElement('div');
        trisListWrapper.className = 'rounded-lg py-4 flex-1 min-w-[250px] flex flex-col hidden';
        if (trisHistory && trisHistory.length > 0) {
          trisListWrapper.innerHTML = `
            <h4 class="text-lg font-black text-[#0dff66] mb-2 text-center uppercase tracking-[0.2em]">RECENT MATCHES</h4>
            <div class="space-y-1 flex-1 overflow-y-auto text-xs">
              ${createMatchListHTML(trisHistory, 'tris', 5)}
            </div>
          `;
          matchListRow.appendChild(trisListWrapper);
          trisStatsElements.push(trisListWrapper);
        } else {
          trisListWrapper.innerHTML = `
            <h4 class="text-lg font-black text-[#0dff66] mb-2 text-center uppercase tracking-[0.2em]">RECENT MATCHES</h4>
            <div class="flex-1 flex items-center justify-center text-neutral-500 italic">No matches available</div>
          `;
          matchListRow.appendChild(trisListWrapper);
          trisStatsElements.push(trisListWrapper);
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

