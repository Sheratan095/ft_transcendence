import { getUserId } from '../../lib/auth';
import { openPongModeModal } from '../../lib/pong-mode';
import { openPongModal } from '../../lib/pong-ui';
import { showErrorToast } from '../shared/Toast';

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
