import { getUserId } from '../../lib/auth';
import { openPongModeModal } from '../../lib/pong-mode';
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

  // Attach button handlers
  const btnMode = container.querySelector('#pong-open-mode-modal') as HTMLElement | null;
  const btnOnline = container.querySelector('#pong-play-online') as HTMLButtonElement | null;
  const btnOffline1v1 = container.querySelector('#pong-play-offline-1v1') as HTMLButtonElement | null;
  const btnOfflineAI = container.querySelector('#pong-play-offline-ai') as HTMLButtonElement | null;
  const btnInviteFriend = container.querySelector('#pong-invite-friend') as HTMLButtonElement | null;
  const btnTournaments = container.querySelector('#pong-tournaments-btn') as HTMLButtonElement | null;
  const btnResetLocal = container.querySelector('#pong-reset-local') as HTMLButtonElement | null;

  if (btnMode) btnMode.addEventListener('click', () => openPongModeModal());
  if (btnOnline) btnOnline.addEventListener('click', async () => {
    try {
      await openPongModal();
      // Online behavior is controlled inside pong modal/UI
    } catch (err) {
      console.error(err);
      showErrorToast('Failed to start online pong');
    }
  });
  if (btnOffline1v1) btnOffline1v1.addEventListener('click', async () => {
    try {
      await openPongModal();
      // Configure offline mode via pong UI if available
    } catch (err) {
      console.error(err);
      showErrorToast('Failed to start offline 1v1 pong');
    }
  });
  if (btnOfflineAI) btnOfflineAI.addEventListener('click', async () => {
    try {
      await openPongModal();
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

export default { renderPongPage };
