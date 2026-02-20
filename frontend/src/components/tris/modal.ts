/**
 * Tris Modal & UI Logic
 * Handles the game modal, mode selection, and bridges between WS and GameManager
 */

import { showErrorToast, showSuccessToast } from '../shared/Toast';
import { getUserId } from '../../lib/auth';
import { goToRoute } from '../../spa';
import { 
initTris, 
closeTris, 
setCurrentGameId, 
getCurrentGameId, 
joinCustomGame, 
startMatchmaking, 
stopMatchmaking,
setUserReady,
quitGame,
cancelCustomGame,
createCustomGame,
setTrisEventCallback
} from './ws';
import { GameManager, TRIS_MODES } from './GameManager';
import { openGameInviteModal, closeGameInviteModal } from '../../lib/game-invite';
import type { FriendsManager } from '../profile/FriendsManager';

export type TrisModeType = 'online' | 'offline-1v1' | 'offline-ai';

let currentGameManager: GameManager | null = null;
let currentFriendsManager: FriendsManager | null = null;
let currentMode: TrisModeType | null = null;
let trisInitialized = false;
let userReady = false;
let pendingGameJoin: string | null = null;

/**
 * Set the friends manager instance (called from main.ts)
 */
export function setTrisFriendsManager(manager: FriendsManager) {
  currentFriendsManager = manager;
}

/**
 * Open the mode selection modal
 */
export function openTrisModeModal(onModeSelected?: (mode: TrisModeType) => Promise<void>) {
  const modeModal = document.getElementById('tris-mode-modal');
  if (!modeModal) return;

  modeModal.classList.remove('hidden');
  setupModeSelectionListeners(onModeSelected);
}

export function closeTrisModeModal() {
  const modeModal = document.getElementById('tris-mode-modal');
  if (modeModal) modeModal.classList.add('hidden');
}

export function getSelectedTrisMode(): TrisModeType | null {
  return currentMode;
}

function setupModeSelectionListeners(onModeSelected?: (mode: TrisModeType) => Promise<void>) {
  const modes: TrisModeType[] = ['online', 'offline-1v1', 'offline-ai'];
  modes.forEach(mode => {
    const btn = document.getElementById(`tris-mode-${mode}`);
    if (btn) {
      const newBtn = btn.cloneNode(true) as HTMLButtonElement;
      btn.replaceWith(newBtn);
      newBtn.addEventListener('click', async () => {
        currentMode = mode;
        closeTrisModeModal();
        if (onModeSelected) {
          await onModeSelected(mode);
        } else {
          await openTrisModal();
          initializeModeSpecificBehaviors(mode);
        }
      });
    }
  });

  const closeBtn = document.getElementById('tris-mode-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeTrisModeModal);
  }
}

/**
 * Open the main game modal
 */
export async function openTrisModal() {
  const userId = getUserId();
  const modal = document.getElementById('tris-modal');
  if (!modal || !userId) {
    showErrorToast('Please sign in to play');
    return;
  }

  modal.classList.remove('hidden');
  setupModalButtons();

  if (!trisInitialized) {
    try {
      await initTris(userId);
      setTrisEventCallback(handleTrisEvent);
      trisInitialized = true;
      
      if (pendingGameJoin) {
        const gid = pendingGameJoin;
        pendingGameJoin = null;
        joinCustomGame(gid);
      }
    } catch (err) {
      console.error('Failed to init Tris WS:', err);
    }
  }
}

export function closeTrisModal() {
  const modal = document.getElementById('tris-modal');
  if (modal) modal.classList.add('hidden');
  
  if (currentGameManager) {
    currentGameManager.destroy();
    currentGameManager = null;
  }

  if (trisInitialized) {
    closeTris();
    trisInitialized = false;
  }
}

export async function openTrisModalAndJoinGame(gameId: string) {
  pendingGameJoin = gameId;
  await openTrisModal();
}

/**
 * Handle mode selection & behavior initialization
 */
export function initializeModeSpecificBehaviors(mode: TrisModeType) {
  currentMode = mode;
  
  if (currentGameManager) {
    currentGameManager.destroy();
  }
  
  currentGameManager = new GameManager(mode);
  
  const inviteBtn = document.getElementById('tris-invite-btn') as HTMLButtonElement | null;
  if (inviteBtn) {
    inviteBtn.style.display = (mode === 'online') ? 'block' : 'none';
  }
  
  updateTrisStatus(mode === 'online' ? 'Ready to play online' : 'Local game started');
  userReady = false;
  renderAndAttachButtons();
}

function updateTrisStatus(text: string) {
  const el = document.getElementById('tris-status');
  if (el) el.textContent = text;
}

function setupModalButtons() {
    const closeBtn = document.getElementById('tris-close-btn');
    if (closeBtn) {
        const newCloseBtn = closeBtn.cloneNode(true) as HTMLButtonElement;
        closeBtn.replaceWith(newCloseBtn);
        newCloseBtn.addEventListener('click', closeTrisModal);
    }
}

function renderAndAttachButtons() {
  // Fresh button references
  const startBtn = document.getElementById('tris-start-btn') as HTMLButtonElement | null;
  const surrenderBtn = document.getElementById('tris-surrender-btn') as HTMLButtonElement | null;
  const resetBtn = document.getElementById('tris-reset-btn') as HTMLButtonElement | null;
  const inviteBtn = document.getElementById('tris-invite-btn') as HTMLButtonElement | null;

  if (startBtn) {
    const newStart = startBtn.cloneNode(true) as HTMLButtonElement;
    startBtn.replaceWith(newStart);
    newStart.addEventListener('click', handleStartClick);
    updateStartBtnText(newStart);
  }

  if (surrenderBtn) {
    const newSurr = surrenderBtn.cloneNode(true) as HTMLButtonElement;
    surrenderBtn.replaceWith(newSurr);
    newSurr.addEventListener('click', handleSurrenderClick);
  }

  if (resetBtn) {
    const newReset = resetBtn.cloneNode(true) as HTMLButtonElement;
    resetBtn.replaceWith(newReset);
    newReset.addEventListener('click', () => {
      if (currentGameManager) currentGameManager.reset();
      else goToRoute('/tris');
    });
  }

  if (inviteBtn && currentMode === 'online') {
    const newInvite = inviteBtn.cloneNode(true) as HTMLButtonElement;
    inviteBtn.replaceWith(newInvite);
    newInvite.addEventListener('click', () => {
       openGameInviteModal('tris', async (friendId: string) => {
          try {
            await createCustomGame(friendId);
            showSuccessToast('Invite sent!');
          } catch(e) {
            showErrorToast('Failed to invite');
          }
       });
    });
  }
}

function updateStartBtnText(btn: HTMLButtonElement) {
  const gid = getCurrentGameId();
  if (gid) {
    btn.textContent = userReady ? '✓ Ready' : 'Ready';
  } else {
    btn.textContent = 'Start Matchmaking';
  }
}

function handleStartClick() {
  const gid = getCurrentGameId();
  if (gid) {
    userReady = !userReady;
    setUserReady(userReady);
    const btn = document.getElementById('tris-start-btn') as HTMLButtonElement | null;
    if (btn) updateStartBtnText(btn);
  } else {
    startMatchmaking();
    updateTrisStatus('Looking for match...');
  }
}

function handleSurrenderClick() {
  const gid = getCurrentGameId();
  if (gid) {
    quitGame();
  } else {
    stopMatchmaking();
    updateTrisStatus('Matchmaking canceled');
    renderAndAttachButtons();
  }
}

/**
 * Route WebSocket events to current GameManager
 */
function handleTrisEvent(event: string, data: any) {
  console.log('[TRIS MODAL] Event:', event, data);
  
  if (event === 'tris.customGameJoinSuccess') {
      closeGameInviteModal();
  }

  if (currentGameManager) {
    currentGameManager.handleNetworkEvent(event, data);
  }
  
  // UI updates for specific events
  if (event === 'tris.gameStarted' || event === 'tris.matchedInRandomGame') {
      userReady = false;
      renderAndAttachButtons();
  }
  
  if (event === 'tris.gameEnded' || event === 'tris.customGameCanceled') {
      renderAndAttachButtons();
  }
}

export function resetLocalGame() {
  if (currentGameManager) currentGameManager.reset();
}
