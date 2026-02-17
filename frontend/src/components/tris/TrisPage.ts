import { getUserId } from '../../lib/auth';
import { openTrisModeModal, initializeModeSpecificBehaviors, resetLocalGame } from '../../lib/tris-mode';
import { openTrisModal } from '../../lib/tris-ui';
import { showErrorToast } from '../shared/Toast';

export async function renderTrisPage(container: HTMLElement) {
  const template = document.getElementById('tris-template') as HTMLTemplateElement | null;
  if (!template) {
    container.innerHTML = '<div class="text-red-600">Tris template not found</div>';
    return;
  }

  container.innerHTML = '';
  const clone = template.content.cloneNode(true) as DocumentFragment;
  container.appendChild(clone);

  // Populate user info if available
  const userId = getUserId();
  const usernameEl = container.querySelector('#tris-username') as HTMLElement | null;
  const avatarEl = container.querySelector('#tris-user-avatar') as HTMLImageElement | null;
  if (usernameEl) usernameEl.textContent = userId ? `User: ${userId}` : 'Guest';
  if (avatarEl) avatarEl.src = '/assets/placeholder-avatar.jpg';

  // Attach button handlers
  const btnMode = container.querySelector('#tris-open-mode-modal') as HTMLElement | null;
  const btnOnline = container.querySelector('#tris-play-online') as HTMLButtonElement | null;
  const btnOffline1v1 = container.querySelector('#tris-play-offline-1v1') as HTMLButtonElement | null;
  const btnOfflineAI = container.querySelector('#tris-play-offline-ai') as HTMLButtonElement | null;
  const btnResetLocal = container.querySelector('#tris-reset-local') as HTMLButtonElement | null;

  if (btnMode) btnMode.addEventListener('click', () => openTrisModeModal());
  if (btnOnline) btnOnline.addEventListener('click', async () => {
    try {
      await openTrisModal();
      initializeModeSpecificBehaviors('online');
      // Matchmaking should be started via the Tris modal controls (Start button)
    } catch (err) {
      console.error(err);
      showErrorToast('Failed to start online mode');
    }
  });
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
  if (btnResetLocal) btnResetLocal.addEventListener('click', () => resetLocalGame());
}

export default { renderTrisPage };
