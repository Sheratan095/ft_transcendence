import { getUserId } from '../../lib/auth';
import { openPongModal } from '../../lib/pong-ui';
import { showErrorToast, showSuccessToast } from '../shared/Toast';
import { openGameInviteModal } from '../../lib/game-invite';
import { FriendsManager } from '../profile/FriendsManager';
import { createCustomGame } from '../../lib/pong';
import { showTournamentListModal } from '../tournaments/TournamentsList';

export async function renderPongPage(container: HTMLElement) {
  const template = document.getElementById('pong-template') as HTMLTemplateElement | null;
  if (!template) {
    container.innerHTML = '<div class="text-red-600">Pong template not found</div>';
    return;
  }

  container.innerHTML = '';
  const clone = template.content.cloneNode(true) as DocumentFragment;
  container.appendChild(clone);

  // Populate user info if available
  const userId = getUserId();
  const usernameEl = container.querySelector('#pong-username') as HTMLElement | null;
  const avatarEl = container.querySelector('#pong-user-avatar') as HTMLImageElement | null;
  if (usernameEl) usernameEl.textContent = userId ? `User: ${userId}` : 'Guest';
  if (avatarEl) avatarEl.src = '/assets/placeholder-avatar.jpg';

  // Render small donut stats chart (if present in template)
  const chartInner = container.querySelector('#pong-user-chart-inner') as HTMLElement | null;
  if (chartInner) renderPongStats(chartInner);

  // Attach button handlers
  const btnOnline = container.querySelector('#pong-play-online') as HTMLButtonElement | null;
  const btnOffline1v1 = container.querySelector('#pong-play-offline-1v1') as HTMLButtonElement | null;
  const btnOfflineAI = container.querySelector('#pong-play-offline-ai') as HTMLButtonElement | null;
  const btnInviteFriend = container.querySelector('#pong-invite-friend') as HTMLButtonElement | null;
  const btnTournaments = container.querySelector('#pong-tournaments-btn') as HTMLButtonElement | null;
  const btnResetLocal = container.querySelector('#pong-reset-local') as HTMLButtonElement | null;
  if (btnOnline) btnOnline.addEventListener('click', async () => {
    try {
      await openPongModal('online');
    } catch (err) {
      console.error(err);
      showErrorToast('Failed to start online pong');
    }
  });
  if (btnOffline1v1) btnOffline1v1.addEventListener('click', async () => {
    try {
      await openPongModal('offline-1v1');
    } catch (err) {
      console.error(err);
      showErrorToast('Failed to start offline 1v1 pong');
    }
  });
  if (btnOfflineAI) btnOfflineAI.addEventListener('click', async () => {
    try {
      await openPongModal('offline-ai');
    } catch (err) {
      console.error(err);
      showErrorToast('Failed to start pong AI mode');
    }
  });
  if (btnInviteFriend) btnInviteFriend.addEventListener('click', async () => {
    if (!userId) {
      showErrorToast('You must be logged in to invite friends');
      return;
    }
    const friendsManager = new FriendsManager({ currentUserId: userId });
    await openGameInviteModal('pong', async (friendId: string) => {
      try {
        await createCustomGame(friendId);
        showSuccessToast('Game invite sent!');
      } catch (err) {
        console.error('Failed to send game invite:', err);
        showErrorToast('Failed to send game invite');
      }
    });
  });
  if (btnTournaments) btnTournaments.addEventListener('click', () => {
    showTournamentListModal();
  });
  if (btnResetLocal) btnResetLocal.addEventListener('click', () => {
    // If pong has local reset, it should provide an API; otherwise reload
    try {
      location.reload();
    } catch (err) {
      console.error(err);
    }
  });
}

async function renderPongStats(container: HTMLElement) {
  const userId = getUserId();
  if (!userId) {
    container.innerHTML = '<div class="text-red-600">You must be logged in to view stats</div>';
    return;
  }

  try {
    const res = await fetch(`/api/pong/stats?id=${userId}`, { method: 'GET', credentials: 'include' });
    const stats = res.ok ? await res.json() : null;

    const gameStats = {
      pongWins: stats?.gamesWon || 0,
      pongLosses: stats?.gamesLost || 0,
    };

    const chartId = container.id || 'pong-user-chart-inner';
    container.innerHTML = '';
    try {
      const { createGameStatsChart } = await import('../profile/UserCardCharts');
      await createGameStatsChart(chartId, 'pong', gameStats, userId);
    } catch (err) {
      console.warn('Failed to render pong donut chart, falling back to text:', err);
    } finally {
      const winsEl = document.getElementById('pong-user-wins');
      const lossesEl = document.getElementById('pong-user-losses');
      if (winsEl) winsEl.textContent = `Wins: ${gameStats.pongWins || 0}`;
      if (lossesEl) lossesEl.textContent = `Losses: ${gameStats.pongLosses || 0}`;
    }
  } catch (err) {
    console.error('Error fetching pong stats:', err);
    container.innerHTML = '<div class="text-red-600">Failed to load stats</div>';
  }
}

export default { renderPongPage };
