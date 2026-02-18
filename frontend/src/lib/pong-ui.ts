import { showErrorToast, showSuccessToast } from '../components/shared/Toast';
import { goToRoute } from '../spa';
import { initPong, onPongEvent, startMatchmaking, startPaddleMove, stopPaddleMove, closePong, getCurrentGameId } from './pong';
import { getUserId } from './auth';
import { openGameInviteModal } from './game-invite';
import { isLoggedInClient } from './token';

// Render constants
const PADDLE_WIDTH = 15;
const PADDLE_HEIGHT = 100;

let gameStateRef: any = null;
let renderLoopId: any = null;
let keyState: Record<string, boolean> = {};


/**
 * Open the pong modal (or navigate to pong game)
 */
export async function openPongModal() {
  try {
    const modal = document.getElementById('pong-modal');
    if (!modal) {
      goToRoute('/pong');
      return;
    }

    modal.classList.remove('hidden');

    const userId = getUserId();
    if (!userId) {
      showErrorToast('You must be logged in to play Pong');
      return;
    }

    await initPong(userId);

    // Canvas setup
    const canvas = document.getElementById('pong-canvas') as HTMLCanvasElement | null;
    const status = document.getElementById('pong-status') as HTMLElement | null;
    const startBtn = document.getElementById('pong-start-btn') as HTMLButtonElement | null;
    const resetBtn = document.getElementById('pong-reset-btn') as HTMLButtonElement | null;
    const closeBtn = document.getElementById('pong-close-btn') as HTMLButtonElement | null;

      // Initialize Game
    const game = new PongGame('pong-canvas', GAME_MODES.ONLINE,
    {
        playerNames: { left: 'Player 1', right: 'Player 2' }
    });
  } catch (err)
  {
    console.error('Failed to open Pong modal:', err);
    showErrorToast('Failed to start Pong');
  }
}

/**
 * Setup the pong card button click handler
 */
export function setupPongCardListener() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      attachPongCardListener();
    });
  } else {
    attachPongCardListener();
  }
}

function attachPongCardListener() {
  const pongCard = document.getElementById('pong-card-btn');
  if (!pongCard) {
    console.error('Pong card button not found');
    return;
  }
  pongCard.addEventListener('click', (e) =>
  {
    if (!isLoggedInClient())
    {
      showErrorToast('You must be logged in to play Pong');
      return;
    }

    e.preventDefault();
    goToRoute('/pong');
  });
}
