import { getUser, getUserId } from '../../lib/auth';
import { initializeModeSpecificBehaviors, resetLocalGame, openTrisModal } from './modal';
import { showErrorToast, showSuccessToast } from '../shared/Toast';
import { openGameInviteModal } from '../../lib/game-invite';
import { FriendsManager } from '../profile/FriendsManager';
import { createCustomGame } from './ws';

export async function renderTrisPage(container: HTMLElement, isLoggedIn: boolean = true) {
  const template = document.getElementById('tris-template') as HTMLTemplateElement | null;
  if (!template) {
    container.innerHTML = '<div class="text-red-600">Tris template not found</div>';
    return;
  }

  container.innerHTML = '';
  const clone = template.content.cloneNode(true) as DocumentFragment;
  container.appendChild(clone);

  // Populate user info if available and render small donut chart
  const userId = getUserId();
  if (userId) insertTrisMatchHistory(userId)
  const usernameEl = container.querySelector('#tris-username') as HTMLElement | null;
  const chartInner = container.querySelector('#tris-user-chart-inner') as HTMLElement | null;
  if (usernameEl) usernameEl.textContent = userId ? `User: ${userId}` : 'Guest';

  if (chartInner)
    renderTrisStats(chartInner);
  

  // Attach button handlers
  const btnOnline = container.querySelector('#tris-play-online') as HTMLButtonElement | null;
  const btnOffline1v1 = container.querySelector('#tris-play-offline-1v1') as HTMLButtonElement | null;
  const btnOfflineAI = container.querySelector('#tris-play-offline-ai') as HTMLButtonElement | null;
  const btnInviteFriend = container.querySelector('#tris-invite-friend') as HTMLButtonElement | null;
  const btnResetLocal = container.querySelector('#tris-reset-local') as HTMLButtonElement | null;
  
  if (btnOnline) {
    if (!isLoggedIn) {
      btnOnline.disabled = true;
      btnOnline.title = 'Sign in to play online';
      btnOnline.style.opacity = '0.5';
      btnOnline.style.cursor = 'not-allowed';
    } else {
      btnOnline.addEventListener('click', async () => {
        try {
          await openTrisModal();
          initializeModeSpecificBehaviors('online');
          // Matchmaking should be started via the Tris modal controls (Start button)
        } catch (err) {
          console.error(err);
          showErrorToast('Failed to start online mode');
        }
      });
    }
  }
  if (btnOffline1v1) btnOffline1v1.addEventListener('click', async () => {
    try {
      await openTrisModal();
      initializeModeSpecificBehaviors('offline-1v1');
    } catch (err) {
      console.error(err);
      showErrorToast('Failed to start offline 1v1');
    }
  });
  if (btnOfflineAI) btnOfflineAI.addEventListener('click', async () => {
    try {
      await openTrisModal();
      initializeModeSpecificBehaviors('offline-ai');
    } catch (err) {
      console.error(err);
      showErrorToast('Failed to start AI mode');
    }
  });
  if (btnInviteFriend) {
    if (!isLoggedIn) {
      btnInviteFriend.disabled = true;
      btnInviteFriend.title = 'Sign in to invite friends';
      btnInviteFriend.style.opacity = '0.5';
      btnInviteFriend.style.cursor = 'not-allowed';
    } else {
      btnInviteFriend.addEventListener('click', async () =>
      {
        await openGameInviteModal('tris', async (otherId: string) =>
        {
          try {
            await openTrisModal();
            initializeModeSpecificBehaviors('online');
            await createCustomGame(otherId);
            showSuccessToast('Game invite sent!');
          }
          catch (err) {
            console.error('Failed to send game invite:', err);
            showErrorToast('Failed to send game invite');
          }
        });
      });
    }
  }
  if (btnResetLocal) btnResetLocal.addEventListener('click', () => resetLocalGame());
}

async function insertTrisMatchHistory(userId: string) {
  const container = document.getElementById('tris-win-list');
  if (!container) return;

  container.innerHTML = ''; // clear previous content

  try {
    const res = await fetch(`/api/tris/history?id=${userId}`, {
      method: 'GET',
      credentials: 'include'
    });

    const matches = res.ok ? await res.json() : [];

    if (!matches || matches.length === 0) {
      container.innerHTML = `
        <div class="w-full text-center text-sm text-neutral-500 dark:text-neutral-400 italic py-4">
          No matches available
        </div>
      `;
      return;
    }

    const recentMatches = matches.slice(-6).reverse();

    container.innerHTML = recentMatches.map((match: any) => {
      const isWin = match.winnerId === userId;
      const opponent =
        match.playerOId === userId
          ? match.playerXUsername
          : match.playerOUsername;

      const matchDate = new Date(match.endedAt);
      const dateStr = matchDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });

      return `
          <div class="w-full flex flex-col sm:flex-row sm:items-center justify-between 
                      px-4 py-3 rounded-xl text-xs gap-2
                      border-2 ${isWin ? 'border-green-400' : 'border-red-400'}
                      bg-white dark:bg-neutral-900">

            <div class="font-black shrink-0 ${isWin ? 'text-green-600' : 'text-red-600'}">
              ${isWin ? 'WIN' : 'LOSS'}
            </div>

            <div class="flex-1 sm:text-center text-neutral-800 dark:text-white truncate">
              you vs <span class="font-semibold">${opponent}</span>
            </div>

            <div class="shrink-0 sm:text-right text-neutral-500 dark:text-neutral-400">
              ${dateStr}
            </div>
          </div>
      `;
    }).join('');

  } catch (err) {
    console.error('Failed to load Tris match history:', err);
  }
}

async function renderTrisStats(container: HTMLElement)
{
  const userId = getUserId();
  if (!userId)
  {
        // Display a red error graph instead of text
    try {
      const { createGameStatsChart } = await import('../profile/UserCardCharts');
      // Create a red graph showing failed state (0 wins, 100 losses)
      await createGameStatsChart(
        container.id || 'tris-user-chart-inner',
        'tris',
        { trisWins: 0, trisLosses: 100 },
        userId || 'guest'
      );
    } catch (chartErr) {
      console.warn('Failed to render error graph:', chartErr);
      container.innerHTML = '<div class="text-red-600 text-center">Unable to load stats</div>';
    }

    // Still update the win/loss text
    const winsEl = document.getElementById('tris-user-wins');
    if (winsEl)
      winsEl.textContent = `Wins: --`;

    const lossesEl = document.getElementById('tris-user-losses');
    if (lossesEl)
      lossesEl.textContent = `Losses: --`;
    return;
  }
  
  try
  {
    const res = await fetch(`/api/tris/stats?id=${userId}`, { method: 'GET', credentials: 'include' });
    const stats = res.ok ? await res.json() : null;

    const gameStats = {
      trisWins: stats?.gamesWon || 0,
      trisLosses: stats?.gamesLost || 0,
    };

    // Try to render donut chart; if charts are unavailable, fall back to text
    const chartId = container.id || 'tris-user-chart-inner';
    container.innerHTML = ''; // clear
    try
    {
      const { createGameStatsChart } = await import('../profile/UserCardCharts');
      await createGameStatsChart(chartId, 'tris', gameStats, userId);
    }
    catch (err)
    {
      console.warn('Failed to render tris donut chart, falling back to text:', err);
    }
    finally
    {
      const winsEl = document.getElementById('tris-user-wins');
      const lossesEl = document.getElementById('tris-user-losses');
      if (winsEl)
        winsEl.textContent = `Wins: ${gameStats.trisWins || 0}`;
      if (lossesEl)
        lossesEl.textContent = `Losses: ${gameStats.trisLosses || 0}`;
    }
  }
  catch (err)
  {
    console.error('Error fetching tris stats:', err);
    container.innerHTML = '<div class="text-red-600">Failed to load stats</div>';
  }
}

export default { renderTrisPage };
