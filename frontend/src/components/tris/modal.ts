/**
 * Tris Modal & UI Logic
 * Handles the game modal, mode selection, and bridges between WS and GameManager
 */

import { showErrorToast, showSuccessToast } from '../shared/Toast';
import { t } from '../../lib/intlayer';
import { getUserId, getUser } from '../../lib/auth';
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
let customGameOpponentUsername: string | null = null;

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
    const newCloseBtn = closeBtn.cloneNode(true) as HTMLButtonElement;
    closeBtn.replaceWith(newCloseBtn);
    newCloseBtn.addEventListener('click', closeTrisModeModal);
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
    startBtnPre.textContent = currentMode === 'online' ? t('game.matchmaking') : t('start');
    startBtnPre.disabled = false;
    startBtnPre.classList.remove('hidden', 'bg-red-600', 'hover:bg-red-700', 'text-white', 'dark:text-white');
    startBtnPre.classList.add('dark:bg-accent-green', 'bg-accent-blue', 'dark:text-black', 'text-white');
  }

  renderAndAttachButtons();
  // Ensure GameManager is initialized for the selected mode (needed when opening modal from invite)
  if (currentMode === 'online' && !currentGameManager) {
    initializeModeSpecificBehaviors('online');
  }
  
  // Explicitly ensure start button is visible after rendering
  const startBtn = document.getElementById('tris-start-btn') as HTMLButtonElement | null;
  if (startBtn) {
    startBtn.classList.remove('hidden');
    startBtn.disabled = false;
  }

  if (currentMode) {
    updateScoreboardNames(currentMode);
    updateTrisStatus(currentMode === 'online' ? t('game.status-online') : t('game.press-start'));
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

  // Handle quitting custom/online games like Pong does
  if (currentMode === 'online') {
    const gameId = getCurrentGameId();
    if (gameId) {
      quitGame();
    }
  }

  if (trisInitialized) {
    closeTris();
    trisInitialized = false;
  }
}

export async function openTrisModalAndJoinGame(gameId: string) {
  currentMode = 'online';
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
        btn.textContent = 'Quit';
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
  updateTrisStatus(mode === 'online' ? t('game.status-online') : t('game.pressStart'));
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

  if (currentMode === 'online' && gid) {
  
  } else
  if (currentMode === 'online') {
    if (btn.textContent === 'Play Again') return; 
    if (gid) {
      if (btn.textContent === 'Quit') return; // Game is running!
      // In online mode with game, show the ready button instead of using main button for ready state
      btn.textContent = t('quit');
      try { (btn as HTMLButtonElement).dataset.action = ''; } catch (e) {}
      btn.classList.remove('dark:bg-accent-green', 'bg-accent-blue', 'dark:text-black');
      btn.classList.add('bg-red-600', 'hover:bg-red-700', 'text-white', 'dark:text-white');
    } else {
      if (btn.textContent === t('game.matchmaking-quit')) return; 
      btn.textContent = t('game.matchmaking');
      btn.classList.remove('bg-red-600', 'hover:bg-red-700', 'text-white', 'dark:text-white', 'bg-accent-orange', 'dark:bg-accent-orange');
      if (readyBtn) readyBtn.classList.add('hidden');
    }
  } else {
    // Offline / AI
    if (btn.textContent !== 'STOP' && btn.textContent !== 'Continue' && btn.textContent !== 'Restart') {
      btn.textContent = t('start');
      btn.classList.remove('bg-red-600', 'hover:bg-red-700', 'text-white', 'dark:text-white', 'bg-accent-orange', 'dark:bg-accent-orange');
    }
  }
}

function handleStartClick() {
  const btn = document.getElementById('tris-start-btn') as HTMLButtonElement | null;
  if (!btn) return;
  const btnText = btn.textContent?.trim().toLowerCase() || '';
  // Restart / Play Again
  if (btnText === 'restart' || btnText === 'play again') {
    if (currentGameManager) currentGameManager.reset();
    btn.textContent = currentMode === 'online' ? t('game.matchmaking') : t('start');
    btn.classList.remove('bg-red-600', 'hover:bg-red-700', 'text-white', 'dark:text-white', 'bg-accent-orange', 'dark:bg-accent-orange');
    updateTrisStatus(currentMode === 'online' ? t('game.status-online') : t('game.pressStart'));
    return;
  }

  // Cancel custom game during lobby - detect via data attribute or trimmed text
  if (btn.dataset.action === 'cancel' || btnText === 'cancel') {
    const gameId = getCurrentGameId();
    if (gameId && currentMode === 'online') {
      cancelCustomGame(gameId);
      closeTrisModal();
    }
    return;
  }

  // Quit
  if (btnText === 'quit') {
    quitGame();
    closeTrisModal();
    return;
  }

  if (currentMode === 'online') {
    const gid = getCurrentGameId();
    if (gid) {
      // Game is active, quit
      quitGame();
      cancelCustomGame(gid);
      closeTrisModal();
    } else {
      if (btnText === t('game.matchmaking').toLowerCase()) {
        startMatchmaking();
        updateTrisStatus(t('game.looking-match'));
        btn.textContent = t('game.quit');
        btn.classList.remove('dark:bg-accent-green', 'bg-accent-blue', 'dark:text-black');
        btn.classList.add('bg-red-600', 'hover:bg-red-700', 'text-white', 'dark:text-white');
      } else {
        stopMatchmaking();
        updateTrisStatus(t('game.status-online'));
        btn.textContent = t('game.matchmaking');
        btn.classList.remove('bg-red-600', 'hover:bg-red-700', 'text-white', 'dark:text-white');
        btn.classList.add('dark:bg-accent-green', 'bg-accent-blue', 'dark:text-black');
      }
    }
  } else {
    // Offline / AI
    if (!currentGameManager) return;
    
    if (btnText === 'start' || btnText === 'continue') {
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
    updateTrisStatus(t('game.status-online'));
    renderAndAttachButtons();
  }
}

/**
 * Route WebSocket events to current GameManager
 */
async function handleTrisEvent(event: string, data: any) {
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

  // CREATOR: Custom game created, waiting for opponent to join
  if (event === 'tris.customGameCreated') {
    const { gameId, otherUsername } = data;
    customGameOpponentUsername = otherUsername;
    
    if (gameId) setCurrentGameId(gameId);
    
    updateTrisStatus(`Waiting for ${otherUsername}...`);
    
    // Update scorebar with creator (You/X) and opponent (their name/O)
    const creatorUsername = 'You';
    updateScoreboardNames('online', `${creatorUsername} (X)`, `${otherUsername} (O)`);
    
    // Update button to "Cancel" and hide ready button
    const modal = document.getElementById('tris-modal');
    if (modal) {
      const readyBtn = modal.querySelector('#tris-ready-btn') as HTMLButtonElement | null;
      const mainBtn = modal.querySelector('#tris-start-btn') as HTMLButtonElement | null;
      
      if (mainBtn) {
        mainBtn.textContent = 'Cancel';
        try { (mainBtn as HTMLButtonElement).dataset.action = 'cancel'; } catch (e) {}
        mainBtn.classList.remove('hidden');
      }
      if (readyBtn) {
        readyBtn.classList.add('hidden');
      }
      
      const leftReady  = modal.querySelector('#tris-left-ready') as HTMLElement | null;
      const rightReady = modal.querySelector('#tris-right-ready') as HTMLElement | null;
      if (leftReady) leftReady.classList.add('hidden');
      if (rightReady) rightReady.classList.add('hidden');
    }
  }

  // CREATOR: Opponent joined the custom game
  if (event === 'tris.playerJoinedCustomGame') {
    const { gameId } = data;
    
    updateTrisStatus('Opponent joined! Ready to start');
    
    // Show ready buttons for both players
    const modal = document.getElementById('tris-modal');
    if (modal) {
      const readyBtn = modal.querySelector('#tris-ready-btn') as HTMLButtonElement | null;
      const mainBtn = modal.querySelector('#tris-start-btn') as HTMLButtonElement | null;
      
      if (readyBtn) {
        readyBtn.classList.remove('hidden');
      }
      // Hide the main button (cancel should disappear once opponent joined) - like Pong
      if (mainBtn) mainBtn.classList.add('hidden');

      // Reset ready indicators to hidden - like Pong
      const leftReady = modal.querySelector('#tris-left-ready') as HTMLElement | null;
      const rightReady = modal.querySelector('#tris-right-ready') as HTMLElement | null;
      if (leftReady) leftReady.classList.add('hidden');
      if (rightReady) rightReady.classList.add('hidden');
    }
  }

  // JOINER: Successfully joined a custom game
  if (event === 'tris.customGameJoinSuccess') {
    const { creatorUsername, gameId } = data;
    closeGameInviteModal();
    
    // Set custom mode and gameId before opening modal - like Pong
    currentMode = 'online';
    if (gameId) setCurrentGameId(gameId);
    customGameOpponentUsername = creatorUsername;
    
    // Only open modal if not already open
    const modal = document.getElementById('tris-modal');
    if (!modal || modal.classList.contains('hidden')) {
      await openTrisModal();
    }
    
    updateTrisStatus(`Joined game! Playing against ${creatorUsername}`);
    
    // Update scorebar with creator (left/X) and joiner (right/O - You)
    const joinerUsername = 'You';
    updateScoreboardNames('online', `${creatorUsername} (X)`, `${joinerUsername} (O)`);
    
    const modalEl = document.getElementById('tris-modal');
    if (modalEl) {
      // Ensure a GameManager exists so board is rendered for the joiner
      if (!currentGameManager) initializeModeSpecificBehaviors('online');

      const readyBtn = modalEl.querySelector('#tris-ready-btn') as HTMLButtonElement | null;
      const mainBtn = modalEl.querySelector('#tris-start-btn') as HTMLButtonElement | null;
      
      if (readyBtn) {
        readyBtn.classList.remove('hidden');
        readyBtn.textContent = '✗ Not Ready';
        readyBtn.classList.remove('dark:bg-accent-orange', 'bg-accent-orange');
        readyBtn.classList.add('dark:bg-red-600', 'bg-red-600');
        // Joiner defaults to NOT READY - like Pong
        userReady = false;
        setUserReady(false);
      }
      if (mainBtn) mainBtn.classList.add('hidden');
      
      // Hide ready indicators until someone toggles ready - like Pong
      const leftReady  = modalEl.querySelector('#tris-left-ready') as HTMLElement | null;
      const rightReady = modalEl.querySelector('#tris-right-ready') as HTMLElement | null;
      if (leftReady) leftReady.classList.add('hidden');
      if (rightReady) rightReady.classList.add('hidden');
    }
  }

  // Handle custom game cancellation - like Pong
  if (event === 'tris.customGameCanceled') {
    console.log('Custom game was canceled');
    updateTrisStatus('Game was canceled');
    showErrorToast('Game was canceled');
    closeTrisModal();
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
        try { (mainBtn as HTMLButtonElement).dataset.action = ''; } catch (e) {}
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
        // If this was a custom game (we have an opponent name), show 'Quit' like Pong
        const wasCustom = !!customGameOpponentUsername;
        mainBtn.textContent = wasCustom ? 'Quit' : 'Play Again';
        try { (mainBtn as HTMLButtonElement).dataset.action = ''; } catch (e) {}
        mainBtn.classList.remove('hidden');
        mainBtn.classList.remove('bg-red-600', 'hover:bg-red-700', 'text-white', 'dark:text-white');
        mainBtn.classList.add('dark:bg-accent-green', 'bg-accent-blue', 'dark:text-black', 'text-white');
        // For custom games we keep the start/quit semantics; clear opponent name so next open is fresh
        if (wasCustom) customGameOpponentUsername = null;
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
