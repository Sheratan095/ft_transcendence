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
setTrisEventCallback,
getCurrentSymbol
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
  const modal = document.getElementById('tris-modal');
  if (!modal) {
    showErrorToast('Error opening modal');
    return;
  }

  const userId = getUserId();
  modal.classList.remove('hidden');
  setupModalButtons();

  // Reset ready button to initial state
  const readyBtn = document.getElementById('tris-ready-btn') as HTMLButtonElement | null;
  if (readyBtn) {
    readyBtn.textContent = '✗ Not Ready';
    readyBtn.classList.remove('dark:bg-accent-orange', 'bg-accent-orange');
    readyBtn.classList.add('dark:bg-red-600', 'bg-red-600');
    readyBtn.classList.add('hidden');
  }

  // Reset ready indicators
  const leftReady  = document.getElementById('tris-left-ready');
  const rightReady = document.getElementById('tris-right-ready');
  if (leftReady)  leftReady.classList.add('hidden');
  if (rightReady) rightReady.classList.add('hidden');

  // Reset UI each time modal opens: re-render buttons, ensure start text and status are correct
  const startBtnPre = document.getElementById('tris-start-btn') as HTMLButtonElement | null;
  if (startBtnPre) {
    startBtnPre.textContent = currentMode === 'online' ? 'Start Matchmaking' : 'Start';
    startBtnPre.disabled = false;
    startBtnPre.classList.remove('hidden', 'bg-red-600', 'hover:bg-red-700', 'text-white', 'dark:text-white');
    startBtnPre.classList.add('dark:bg-accent-green', 'bg-accent-blue', 'dark:text-black', 'text-white');
  }

  renderAndAttachButtons();
  
  // Explicitly ensure start button is visible after rendering
  const startBtn = document.getElementById('tris-start-btn') as HTMLButtonElement | null;
  if (startBtn) {
    startBtn.classList.remove('hidden');
    startBtn.disabled = false;
  }
  
  if (currentMode) {
    updateScoreboardNames(currentMode);
    updateTrisStatus(currentMode === 'online' ? 'Online - Not in matchmaking' : 'Press start to play');
  } else updateTrisStatus('Select mode');

  if (!trisInitialized && userId) {
    try {
      const userId = getUserId();
      await initTris(userId as string);
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
  
  setCurrentGameId(null);

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
        btn.classList.add('dark:bg-accent-green', 'bg-accent-blue', 'dark:text-black', 'text-black');
      }
    }
  });
  
  const inviteBtn = document.getElementById('tris-invite-btn') as HTMLButtonElement | null;
  if (inviteBtn) {
    inviteBtn.style.display = (mode === 'online') ? 'block' : 'none';
  }
  
  updateScoreboardNames(mode);
  updateTrisStatus(mode === 'online' ? 'Online - Not in matchmaking' : 'Press start to play');
  userReady = false;
  renderAndAttachButtons();
}

function updateTrisStatus(text: string) {
  const el = document.getElementById('tris-status');
  if (el) el.textContent = text;
}

function updateScoreboardNames(mode: TrisModeType, leftName?: string, rightName?: string) {
  const leftEl  = document.getElementById('tris-left-name');
  const rightEl = document.getElementById('tris-right-name');

  let lName = leftName;
  let rName = rightName;

  if (!lName || !rName) {
    if (mode === 'offline-ai') {
      lName = 'You (X)'; rName = 'Ai (O)';
    } else if (mode === 'offline-1v1') {
      lName = 'Player X'; rName = 'Player O';
    } else {
      lName = '--------'; rName = '--------';
    }
  }

  if (leftEl) {
    const span = leftEl.querySelector('span:first-child');
    if (span) span.textContent = lName;
    else leftEl.textContent = lName;
  }
  if (rightEl) {
    const span = rightEl.querySelector('span:last-child');
    if (span) span.textContent = rName;
    else rightEl.textContent = rName;
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
  const modal = document.getElementById('tris-modal');
  if (!modal) return;

  // Fresh button references
  const startBtn = modal.querySelector('#tris-start-btn') as HTMLButtonElement | null;
  const readyBtn = modal.querySelector('#tris-ready-btn') as HTMLButtonElement | null;
  const surrenderBtn = modal.querySelector('#tris-surrender-btn') as HTMLButtonElement | null;
  const resetBtn = modal.querySelector('#tris-reset-btn') as HTMLButtonElement | null;
  const inviteBtn = modal.querySelector('#tris-invite-btn') as HTMLButtonElement | null;

  if (startBtn) {
    const newStart = startBtn.cloneNode(true) as HTMLButtonElement;
    startBtn.replaceWith(newStart);
    newStart.addEventListener('click', handleStartClick);
    updateStartBtnText(newStart);
  }

  // Ready button (online mode only)
  if (readyBtn && currentMode === 'online') {
    const newReady = readyBtn.cloneNode(true) as HTMLButtonElement;
    readyBtn.replaceWith(newReady);
    newReady.addEventListener('click', () => {
      const gid = getCurrentGameId();
      if (!gid) {
        console.warn('[Tris] No game ID available for ready button');
        return;
      }

      const isReady = newReady.textContent?.includes('✓');
      if (isReady) {
        // Set not ready
        userReady = false;
        setUserReady(false);
        newReady.textContent = '✗ Not Ready';
        newReady.classList.remove('dark:bg-accent-orange', 'bg-accent-orange');
        newReady.classList.add('dark:bg-red-600', 'bg-red-600');
        // Hide own ready indicator
        const mySymbol = getCurrentSymbol();
        const myReadyEl = document.getElementById(mySymbol === 'X' ? 'tris-left-ready' : 'tris-right-ready');
        if (myReadyEl) myReadyEl.classList.add('hidden');
      } else {
        // Set ready
        userReady = true;
        setUserReady(true);
        newReady.textContent = '✓ Ready';
        newReady.classList.remove('dark:bg-red-600', 'bg-red-600');
        newReady.classList.add('dark:bg-accent-orange', 'bg-accent-orange');
        // Show own ready indicator
        const mySymbol = getCurrentSymbol();
        const myReadyEl = document.getElementById(mySymbol === 'X' ? 'tris-left-ready' : 'tris-right-ready');
        if (myReadyEl) myReadyEl.classList.remove('hidden');
      }
    });
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
  const modal = document.getElementById('tris-modal');
  const readyBtn = modal?.querySelector('#tris-ready-btn') as HTMLButtonElement | null;

  if (currentMode === 'online') {
    if (btn.textContent === 'Play Again') return; 
    if (gid) {
      if (btn.textContent === 'Quit') return; // Game is running!
      // In online mode with game, show the ready button instead of using main button for ready state
      btn.textContent = 'Quit';
      btn.classList.remove('dark:bg-accent-green', 'bg-accent-blue', 'dark:text-black');
      btn.classList.add('bg-red-600', 'hover:bg-red-700', 'text-white', 'dark:text-white');
    } else {
      if (btn.textContent === 'Quit matchmaking') return; 
      btn.textContent = 'Start Matchmaking';
      btn.classList.remove('bg-red-600', 'hover:bg-red-700', 'text-white', 'dark:text-white', 'bg-accent-orange', 'dark:bg-accent-orange');
      if (readyBtn) readyBtn.classList.add('hidden');
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
    updateTrisStatus(currentMode === 'online' ? 'Online - Not in matchmaking' : 'Press start to play');
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
      // Game is active, quit
      quitGame();
      closeTrisModal();
    } else {
      if (btn.textContent === 'Start Matchmaking') {
        startMatchmaking();
        updateTrisStatus('Looking for match...');
        btn.textContent = 'Quit matchmaking';
        btn.classList.remove('dark:bg-accent-green', 'bg-accent-blue', 'dark:text-black');
        btn.classList.add('bg-red-600', 'hover:bg-red-700', 'text-white', 'dark:text-white');
      } else {
        stopMatchmaking();
        updateTrisStatus('Online - Not in matchmaking');
        btn.textContent = 'Start Matchmaking';
        btn.classList.remove('bg-red-600', 'hover:bg-red-700', 'text-white', 'dark:text-white');
        btn.classList.add('dark:bg-accent-green', 'bg-accent-blue', 'dark:text-black');
      }
    }
  } else {
    // Offline / AI
    if (!currentGameManager) return;
    
    if (btn.textContent === 'Start' || btn.textContent === 'Continue') {
      currentGameManager.resumeGame();
      currentGameManager.updateStatusText();
      btn.textContent = 'STOP';
      btn.classList.remove('dark:bg-accent-green', 'bg-accent-blue', 'dark:text-black', 'text-black');
      btn.classList.add('bg-red-600', 'hover:bg-red-700', 'text-white', 'dark:text-dark');
    } else {
      currentGameManager.pauseGame();
      updateTrisStatus('Game paused');
      btn.textContent = 'Continue';
      btn.classList.remove('bg-red-600', 'hover:bg-red-700', 'text-white', 'dark:text-dark');
      btn.classList.add('dark:bg-accent-green', 'bg-accent-blue', 'dark:text-black', 'text-black');
    }
  }
}

function handleSurrenderClick() {
  const gid = getCurrentGameId();
  if (gid) {
    quitGame();
  } else {
    stopMatchmaking();
    updateTrisStatus('Online - Not in matchmaking');
    renderAndAttachButtons();
  }
}

/**
 * Route WebSocket events to current GameManager
 */
function handleTrisEvent(event: string, data: any) {
  console.log('[TRIS MODAL] Event:', event, data);
  
  if (event === 'tris.playerReadyStatus') {
    const { readyStatus } = data;
    // Show the opponent's ready indicator in the scorebar
    const mySymbol = getCurrentSymbol(); // 'X' or 'O'
    const opponentIsLeft = (mySymbol === 'O'); // if I'm O, opponent is X = left
    const leftReady  = document.getElementById('tris-left-ready');
    const rightReady = document.getElementById('tris-right-ready');
    if (opponentIsLeft) {
      if (leftReady)  leftReady.classList.toggle('hidden', !readyStatus);
    } else {
      if (rightReady) rightReady.classList.toggle('hidden', !readyStatus);
    }
  }

  if (event === 'tris.customGameJoinSuccess') {
      closeGameInviteModal();
      const modal = document.getElementById('tris-modal');
      if (modal) {
        const readyBtn = modal.querySelector('#tris-ready-btn') as HTMLButtonElement | null;
        const mainBtn = modal.querySelector('#tris-start-btn') as HTMLButtonElement | null;
        if (readyBtn) readyBtn.classList.remove('hidden');
        if (mainBtn) mainBtn.classList.add('hidden');
      }
  }

  if (event === 'tris.customGameCreated') {
      const modal = document.getElementById('tris-modal');
      if (modal) {
        const readyBtn = modal.querySelector('#tris-ready-btn') as HTMLButtonElement | null;
        if (readyBtn) readyBtn.classList.remove('hidden');
      }
  }

  if (event === 'tris.matchedInRandomGame') {
      userReady = false;

      // Update scorebar player names
      const { yourSymbol, opponentUsername } = data;
      updateTrisStatus(`Matched with ${opponentUsername || 'Opponent'}. You are ${yourSymbol}`);
      const leftName  = (yourSymbol === 'X') ? 'You (X)' : `${opponentUsername || 'Opponent'} (X)`;
      const rightName = (yourSymbol === 'O') ? 'You (O)' : `${opponentUsername || 'Opponent'} (O)`;
      updateScoreboardNames('online', leftName, rightName);

      // Reset ready indicators
      const leftReady  = document.getElementById('tris-left-ready');
      const rightReady = document.getElementById('tris-right-ready');
      if (leftReady)  leftReady.classList.add('hidden');
      if (rightReady) rightReady.classList.add('hidden');

      const modal = document.getElementById('tris-modal');
      if (modal) {
        const readyBtn = modal.querySelector('#tris-ready-btn') as HTMLButtonElement | null;
        const mainBtn = modal.querySelector('#tris-start-btn') as HTMLButtonElement | null;
        if (readyBtn) {
          readyBtn.textContent = '✗ Not Ready';
          readyBtn.classList.remove('hidden');
          readyBtn.classList.remove('dark:bg-accent-orange', 'bg-accent-orange');
          readyBtn.classList.add('dark:bg-red-600', 'bg-red-600');
        }
        if (mainBtn) mainBtn.classList.add('hidden');
      }
  }

  if (event === 'tris.gameStarted') {
    userReady = false;

    const modal = document.getElementById('tris-modal');
    if (modal) {
      const readyBtn = modal.querySelector('#tris-ready-btn') as HTMLButtonElement | null;
      const mainBtn = modal.querySelector('#tris-start-btn') as HTMLButtonElement | null;
      if (readyBtn) readyBtn.classList.add('hidden');
      if (mainBtn) {
        mainBtn.textContent = 'Quit';
        mainBtn.classList.remove('hidden', 'dark:bg-accent-green', 'bg-accent-blue', 'dark:text-black');
        mainBtn.classList.add('bg-red-600', 'hover:bg-red-700', 'text-white', 'dark:text-white');
      }
    }
  }

  if (event === 'tris.gameEnded') {
    // Hide ready indicators
    const leftReady  = document.getElementById('tris-left-ready');
    const rightReady = document.getElementById('tris-right-ready');
    if (leftReady)  leftReady.classList.add('hidden');
    if (rightReady) rightReady.classList.add('hidden');

    const modal = document.getElementById('tris-modal');
    if (modal) {
      const readyBtn = modal.querySelector('#tris-ready-btn') as HTMLButtonElement | null;
      const mainBtn = modal.querySelector('#tris-start-btn') as HTMLButtonElement | null;
      if (readyBtn) readyBtn.classList.add('hidden');
      if (mainBtn) {
        mainBtn.textContent = 'Play Again';
        mainBtn.classList.remove('hidden');
        mainBtn.classList.remove('bg-red-600', 'hover:bg-red-700', 'text-white', 'dark:text-white');
        mainBtn.classList.add('dark:bg-accent-green', 'bg-accent-blue', 'dark:text-black', 'text-white');
      }
    }
  }

  if (currentGameManager) {
    currentGameManager.handleNetworkEvent(event, data);
  }
}

export function resetLocalGame() {
  if (currentGameManager) currentGameManager.reset();
}
