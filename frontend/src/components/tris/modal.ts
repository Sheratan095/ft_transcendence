/**
 * Tris Modal & UI Logic
 * Handles the game modal, mode selection, and bridges between WS and GameManager
 */

import { showErrorToast, showSuccessToast } from '../shared/Toast';
import { t } from '../../lib/intlayer';
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

  // Reset UI each time modal opens: re-render buttons, ensure start text and status are correct
  renderAndAttachButtons();
  const startBtn = document.getElementById('tris-start-btn') as HTMLButtonElement | null;
  if (startBtn) updateStartBtnText(startBtn);
  if (currentMode) {
    updateScoreboardNames(currentMode);
    updateTrisStatus(currentMode === 'online' ? 'Ready to play online' : 'Press start to play');
  } else updateTrisStatus('Select mode');

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
  currentGameManager.onGameEnded((msg) => {
    const btn = document.getElementById('tris-start-btn') as HTMLButtonElement | null;
    if (btn) {
      if (mode === 'online') {
        btn.textContent = 'Play Again';
        btn.classList.remove('bg-red-600', 'hover:bg-red-700', 'text-white', 'dark:text-white');
      } else {
        btn.textContent = 'Restart';
        btn.classList.remove('bg-red-600', 'hover:bg-red-700', 'text-white', 'dark:text-white');
      }
    }
  });
  
  const inviteBtn = document.getElementById('tris-invite-btn') as HTMLButtonElement | null;
  if (inviteBtn) {
    inviteBtn.style.display = (mode === 'online') ? 'block' : 'none';
  }
  
  updateScoreboardNames(mode);
  updateTrisStatus(mode === 'online' ? 'Ready to play online' : 'Press start to play');
  userReady = false;
  renderAndAttachButtons();
}

function updateTrisStatus(text: string) {
  const el = document.getElementById('tris-status');
  if (el) el.textContent = text;
}

function updateScoreboardNames(mode: TrisModeType) {
  const left = document.getElementById('tris-left-name');
  const right = document.getElementById('tris-right-name');
  if (!left || !right) return;

  if (mode === 'offline-ai') {
    left.textContent = 'You (X)';
    right.textContent = 'Ai (O)';
  } else if (mode === 'offline-1v1') {
    left.textContent = 'Player Left (X)';
    right.textContent = 'Player Right (O)';
  } else {
    left.textContent = 'Player X';
    right.textContent = 'Player O';
  }
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
            showSuccessToast(t('toast.inviteSent'));
          } catch(e) {
            showErrorToast(t('toast.inviteFailed'));
          }
       });
    });
  }
}

function updateStartBtnText(btn: HTMLButtonElement) {
  const gid = getCurrentGameId();
  if (currentMode === 'online') {
    if (btn.textContent === 'Play Again') return; 
    if (gid) {
      if (btn.textContent === 'Quit') return; // Game is running!
      btn.textContent = userReady ? '✓ Ready' : 'Ready';
      if (userReady) {
        btn.classList.remove('bg-red-600', 'hover:bg-red-700', 'text-white', 'dark:text-white');
        btn.classList.add('bg-accent-orange', 'dark:bg-accent-orange');
      } else {
        btn.classList.remove('bg-red-600', 'hover:bg-red-700', 'text-white', 'dark:text-white', 'bg-accent-orange', 'dark:bg-accent-orange');
      }
    } else {
      if (btn.textContent === 'Quit matchmaking') return; 
      btn.textContent = 'Start Matchmaking';
      btn.classList.remove('bg-red-600', 'hover:bg-red-700', 'text-white', 'dark:text-white', 'bg-accent-orange', 'dark:bg-accent-orange');
    }
  } else {
    // Offline / AI
    if (btn.textContent !== 'STOP' && btn.textContent !== 'Continue' && btn.textContent !== 'Restart') {
      btn.textContent = 'Start';
      btn.classList.remove('bg-red-600', 'hover:bg-red-700', 'text-white', 'dark:text-white', 'bg-accent-orange', 'dark:bg-accent-orange');
    }
  }
}

function handleStartClick() {
  const btn = document.getElementById('tris-start-btn') as HTMLButtonElement | null;
  if (!btn) return;

  if (btn.textContent === 'Restart' || btn.textContent === 'Play Again') {
    if (currentGameManager) currentGameManager.reset();
    btn.textContent = currentMode === 'online' ? 'Start Matchmaking' : 'Start';
    btn.classList.remove('bg-red-600', 'hover:bg-red-700', 'text-white', 'dark:text-white', 'bg-accent-orange', 'dark:bg-accent-orange');
    updateTrisStatus(currentMode === 'online' ? 'Ready to play online' : 'Press start to play');
    return;
  }

  if (btn.textContent === 'Quit') {
    quitGame();
    closeTrisModal();
    return;
  }

  if (currentMode === 'online') {
    const gid = getCurrentGameId();
    if (gid) {
      userReady = !userReady;
      setUserReady(userReady);
      updateStartBtnText(btn);
    } else {
      if (btn.textContent === 'Start Matchmaking') {
        startMatchmaking();
        updateTrisStatus('Looking for match...');
        btn.textContent = 'Quit matchmaking';
        btn.classList.add('bg-red-600', 'hover:bg-red-700', 'text-white', 'dark:text-white');
      } else {
        stopMatchmaking();
        updateTrisStatus('Matchmaking canceled');
        btn.textContent = 'Start Matchmaking';
        btn.classList.remove('bg-red-600', 'hover:bg-red-700', 'text-white', 'dark:text-white');
      }
    }
  } else {
    // Offline / AI
    if (!currentGameManager) return;
    
    if (btn.textContent === 'Start' || btn.textContent === 'Continue') {
      currentGameManager.resumeGame();
      currentGameManager.updateStatusText();
      btn.textContent = 'STOP';
      btn.classList.add('bg-red-600', 'hover:bg-red-700', 'text-white', 'dark:text-white');
    } else {
      currentGameManager.pauseGame();
      updateTrisStatus('Game paused');
      btn.textContent = 'Continue';
      btn.classList.remove('bg-red-600', 'hover:bg-red-700', 'text-white', 'dark:text-white');
    }
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

  const btn = document.getElementById('tris-start-btn') as HTMLButtonElement | null;

  if (event === 'tris.matchedInRandomGame') {
      userReady = false;
      if (btn) {
        btn.textContent = 'Ready';
        btn.classList.remove('bg-red-600', 'hover:bg-red-700', 'text-white', 'dark:text-white');
      }
  }

  if (event === 'tris.gameStarted') {
    userReady = false;
    if (btn) {
      btn.textContent = 'Quit';
      btn.classList.add('bg-red-600', 'hover:bg-red-700', 'text-white', 'dark:text-white');
    }
  }

  if (currentGameManager) {
    currentGameManager.handleNetworkEvent(event, data);
  }
  
  // UI updates for specific events
  // Note: we don't call renderAndAttachButtons() here to avoid cloning and losing button state (text/listeners)
}

export function resetLocalGame() {
  if (currentGameManager) currentGameManager.reset();
}
