import { sendChatInvite } from '../chat/chat';
import { FriendsManager } from './FriendsManager';
import type { GameStats } from './UserCardCharts';
import { getAllMatchHistories } from '../../lib/matchHistory';
import { initCardHoverEffect } from '../../lib/card';

export async function renderSearchProfileCard(
  userId: string,
  container: HTMLElement,
): Promise<HTMLElement | null> {
  if (!container) {
    console.error('renderSearchProfileCard: container element is null');
    return null;
  }

  // Fetch user data
  const response = await fetch(`/api/users/user?id=${userId}`, {
    credentials: 'include',
    headers: { 'Accept': 'application/json' },
  });
  if (!response.ok) {
    container.innerHTML = '<div class="text-red-500 text-center mt-8">User not found</div>';
    return null;
  }
  const user = await response.json();

  // Get current user ID
  const loggedInUserStr = localStorage.getItem('user');
  const loggedInUser = loggedInUserStr ? JSON.parse(loggedInUserStr) : null;
  const currentUserId = loggedInUser?.id || 'current-user-id';

  // If the user is the current user, return null to let spa handle the redirect
  if (user.id === currentUserId) {
    return null;
  }

  // Initialize FriendsManager
  const friendsManager = new FriendsManager({ currentUserId });
  await friendsManager.loadFriends();
  await friendsManager.loadFriendRequests();

  const template = document.getElementById('search-profile-card-template') as HTMLTemplateElement | null;
  if (!template) {
    console.error('search-profile-card-template not found');
    return null;
  }

  // Clone template
  const clone = template.content.cloneNode(true);
  container.innerHTML = '';
  container.appendChild(clone);

  // Find the card element
  const cardEl = container.querySelector('.search-profile-card') as HTMLElement | null;
  if (!cardEl) {
    console.error('Search profile card element not found in template');
    return null;
  }

  // ===== Avatar =====
  const avatarEl = cardEl.querySelector('.spc-avatar') as HTMLImageElement | null;
  if (avatarEl) {
    avatarEl.src = user.avatarUrl
      ? (user.avatarUrl.startsWith('http') ? user.avatarUrl : `/api${user.avatarUrl}`)
      : '/assets/placeholder-avatar.jpg';
    avatarEl.alt = user.username || 'User avatar';
  }

  // ===== Username, Email, ID =====
  const nameEl = cardEl.querySelector('.spc-username') as HTMLElement | null;
  if (nameEl) nameEl.textContent = user.username || user.email || 'Unknown User';

  const emailEl = cardEl.querySelector('.spc-email') as HTMLElement | null;
  if (emailEl) emailEl.textContent = user.email || 'No email';

  const idEl = cardEl.querySelector('.spc-userid') as HTMLElement | null;
  if (idEl) idEl.textContent = `ID: ${user.id}`;

  // ===== Fetch Relationship Status =====
  let relationshipStatus: string | null = null;
  try {
    const relationRes = await fetch(`/api/users/relationships/getUsersRelationship?userId=${user.id}`, {
      credentials: 'include',
      headers: { 'Accept': 'application/json' },
    });
    if (relationRes.ok) {
      const relationData = await relationRes.json();
      relationshipStatus = relationData.relationshipStatus; // 'pending', 'accepted', 'rejected', 'blocked'
    }
  } catch (err) {
    console.error('Failed to fetch relationship status:', err);
  }

  // ===== Action Buttons =====
  const chatBtn = cardEl.querySelector('.spc-chat') as HTMLButtonElement | null;
  if (chatBtn) {
    chatBtn.addEventListener('click', async () => {
      try {
        await sendChatInvite(user.id);
        console.log('Chat invite sent to user:', user.id);
      } catch (err) {
        console.error('Failed to send chat invite:', err);
      }
    });
  }

  console.log('Relationship status with user:', relationshipStatus);

  const addBtn = cardEl.querySelector('.spc-add') as HTMLButtonElement | null;
  // Keep originals so we can restore appearance after unblock
  const originalAddBtnText = addBtn?.textContent ?? '';
  const originalAddBtnClass = addBtn?.className ?? '';

  if (addBtn) {
    addBtn.addEventListener('click', async () => {
      if (addBtn.disabled) return;
      try {
        if (relationshipStatus === 'accepted') {
          const success = await friendsManager.removeFriend(user.id);
          if (success) {
            relationshipStatus = null;
            updateActionButtons();
          }
        } else {
          const success = await friendsManager.addFriend(user.id);
          if (success) {
            relationshipStatus = 'pending';
            updateActionButtons();
          }
        }
      } catch (err) {
        console.error('Failed to change friendship:', err);
      }
    });
  }

  // Centralized updater for action buttons so UI matches initial render
  function updateActionButtons() {
    if (!chatBtn)
        return;
    if (relationshipStatus === 'accepted') {
      chatBtn.disabled = false;
      chatBtn.classList.remove('bg-neutral-600', 'text-neutral-400');
      chatBtn.classList.add('bg-accent-blue', 'hover:brightness-90', 'text-white');
    } else {
      chatBtn.disabled = true;
      chatBtn.classList.remove('bg-accent-blue', 'hover:brightness-90', 'text-white');
      chatBtn.classList.add('bg-neutral-600', 'text-neutral-400');
    }

    if (!addBtn)
      return;
    if (relationshipStatus === 'pending') {
      addBtn.disabled = true;
      addBtn.classList.remove('bg-accent-orange', 'dark:bg-accent-green', 'hover:brightness-90');
      addBtn.classList.add('bg-neutral-600', 'text-neutral-400');
      addBtn.textContent = '⏳ Request Pending';
    } else if (relationshipStatus === 'accepted') {
      // When already friends, show a red "Remove Friend" button and allow removal
      addBtn.disabled = false;
      addBtn.classList.remove('bg-accent-orange', 'dark:bg-accent-green', 'hover:brightness-90', 'bg-neutral-600', 'text-neutral-400');
      addBtn.classList.add('bg-red-600', 'hover:brightness-90', 'text-white');
      addBtn.textContent = '✖ Remove Friend';
    } else if (relationshipStatus === 'blocked') {
      addBtn.disabled = true;
      addBtn.classList.remove('bg-accent-orange', 'dark:bg-accent-green', 'hover:brightness-90', 'text-white');
      addBtn.classList.add('bg-neutral-600', 'text-neutral-400');
    } else {
      // no relationship or rejected -> restore
      addBtn.disabled = false;
      addBtn.className = originalAddBtnClass;
      addBtn.textContent = originalAddBtnText;
    }
  }

  // Apply initial state from fetched relationshipStatus
  updateActionButtons();

  const blockBtn = cardEl.querySelector('.spc-block') as HTMLButtonElement | null;
  if (blockBtn)
  {
    // Change button text and style if already blocked
    if (relationshipStatus === 'blocked')
    {
      // UNBLOCK THE USER
      blockBtn.textContent = '🔓 Unblock';
      blockBtn.classList.remove('bg-red-600');
      blockBtn.classList.add('bg-green-600');
    }

    blockBtn.addEventListener('click', async () => {
        if (relationshipStatus === 'blocked')
        {
          try {
            const success = await friendsManager.unblockUser(user.id);
            if (success) {
              blockBtn.textContent = '🔒 Block';
              blockBtn.classList.remove('bg-green-600');
              blockBtn.classList.add('bg-red-600');
              relationshipStatus = null; // Reset relationship status after unblocking
              updateActionButtons();
            }
          } catch (err) {
            console.error('Failed to unblock user:', err);
          }
          return;
        }

      try {
        const success = await friendsManager.blockUser(user.id);
        if (success) {
            blockBtn.textContent = '🔓 Unblock';
            blockBtn.classList.remove('bg-red-600');
            blockBtn.classList.add('bg-green-600');
          relationshipStatus = 'blocked';
          updateActionButtons();
        }
      } catch (err) {
        console.error('Failed to block user:', err);
      }

    });
  }

    // Initialize hover effects
  initCardHoverEffect();

  // ===== Fetch Stats and Match History asynchronously =====
  (async () => {
    console.log('[SearchProfileCard] Starting stats fetch for user:', user.id);
    
    try {
      const [trisRes, pongRes] = await Promise.all([
        fetch(`/api/tris/stats?id=${user.id}`, { method: 'GET', credentials: 'include' }),
        fetch(`/api/pong/stats?id=${user.id}`, { method: 'GET', credentials: 'include' })
      ]);

      const trisStats = trisRes.ok ? await trisRes.json() : null;
      const pongStats = pongRes.ok ? await pongRes.json() : null;

      console.log('[SearchProfileCard] Stats received:', { trisStats, pongStats });

      const gameStats: GameStats = {
        trisWins: trisStats?.gamesWon || 0,
        trisLosses: trisStats?.gamesLost || 0,
        pongWins: pongStats?.gamesWon || 0,
        pongLosses: pongStats?.gamesLost || 0,
      };

      const chartsSection = cardEl.querySelector('#search-profile-charts-section');
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
        
        // MAIN STATS ROW
        const mainRow = document.createElement('div');
        mainRow.className = 'flex flex-row flex-wrap lg:flex-nowrap gap-2 w-full';
        chartsSection.appendChild(mainRow);

        // HISTORY ROW
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
                <div id="search-profile-pong-donut" class="w-12 h-12 flex-shrink-0"></div>
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
                <div id="search-profile-tris-donut" class="w-12 h-12 flex-shrink-0"></div>
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

        // Fetch match histories
        const { trisHistory, pongHistory } = await getAllMatchHistories(user.id);
        const { createMatchHistoryChart, createGameStatsChart } = await import('./UserCardCharts');

        // Pong History Chart
        const pongHistoryWrapper = document.createElement('div');
        pongHistoryWrapper.className = 'rounded-lg mb-7 flex-1 min-w-[250px] h-32 flex flex-col';
        const pongHistoryChartId = `search-profile-pong-history-chart`;
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

        // Tris History Chart
        const trisHistoryWrapper = document.createElement('div');
        trisHistoryWrapper.className = 'rounded-lg mb-7 flex-1 min-w-[250px] h-32 flex flex-col hidden';
        const trisHistoryChartId = `search-profile-tris-history-chart`;
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

        // Match list row
        const matchListRow = document.createElement('div');
        matchListRow.className = 'flex flex-row flex-wrap lg:flex-nowrap gap-2 w-full mt-2';
        chartsSection.appendChild(matchListRow);

        // Helper function to create match list items
        const createMatchListHTML = (matches: any[], gameType: 'pong' | 'tris', limit: number = 5) => {
          if (!matches || matches.length === 0) return '';
          const recent = matches.slice(-limit).reverse();
          return recent.map((match) => {
            const isWin = match.winnerId === user.id;
            
            if (gameType === 'pong') {
              const opponent = match.playerLeftId === user.id ? match.playerRightUsername : match.playerLeftUsername;
              const yourScore = match.playerLeftId === user.id ? match.playerLeftScore : match.playerRightScore;
              const opponentScore = match.playerLeftId === user.id ? match.playerRightScore : match.playerLeftScore;
              const matchDate = new Date(match.endedAt);
              const dateStr = matchDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              const timeStr = matchDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
              
              return `<div class="grid grid-cols-3 py-1 items-center px-10 text-xs ${isWin ? 'bg-green-900/30 border-l-2 border-green-400' : 'bg-red-900/30 border-l-2 border-red-400'}">
                <div class="font-black pl-10 ${isWin ? 'text-green-400' : 'text-red-400'}">${isWin ? 'WIN' : 'LOSS'}</div>
                <div class="text-center">
                  <span class="font-semibold">(${yourScore})</span> <span class="text-neutral-300">${user.username} vs <span class="font-semibold text-neutral-200">${opponent}</span> <span class="font-semibold">(${opponentScore})</span></span>
                </div>
                <div class="text-right text-neutral-400 whitespace-nowrap pr-15">
                  ${dateStr} ${timeStr}
                </div>
              </div>`;
            } else {
              const opponent = match.playerOId === user.id ? match.playerXUsername : match.playerOUsername;
              const matchDate = new Date(match.endedAt);
              const dateStr = matchDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              const timeStr = matchDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
              
              return `<div class="grid grid-cols-3 py-1 items-center px-10 text-xs ${isWin ? 'bg-green-900/30 border-l-2 border-green-400' : 'bg-red-900/30 border-l-2 border-red-400'}">
                <div class="font-black pl-10 ${isWin ? 'text-green-400' : 'text-red-400'}">${isWin ? 'WIN' : 'LOSS'}</div>
                <div class="text-center">
                  <span class="text-neutral-300">${user.username} vs <span class="font-semibold text-neutral-200">${opponent}</span></span>
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
          window.dispatchEvent(new Event('resize'));
        };

        btnPong.addEventListener('click', () => setView('pong'));
        btnTris.addEventListener('click', () => setView('tris'));

        // Render donuts
        if (gameStats.pongWins !== undefined && chartsSection.querySelector('#search-profile-pong-donut')) {
          try { await createGameStatsChart('search-profile-pong-donut', 'pong', gameStats, user.id); } catch (e) {}
        }
        if (gameStats.trisWins !== undefined && chartsSection.querySelector('#search-profile-tris-donut')) {
          try { await createGameStatsChart('search-profile-tris-donut', 'tris', gameStats, user.id); } catch (e) {}
        }
      }
    } catch (err) {
      console.error('[SearchProfileCard] Combined fetch error:', err);
    }
  })();
  return cardEl;
}
