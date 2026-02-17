import { showErrorToast, showSuccessToast } from '../components/shared/Toast';
import { goToRoute } from '../spa';
import { initPong, onPongEvent, startMatchmaking, startPaddleMove, stopPaddleMove, sendGameInvite, closePong, getCurrentGameId } from './pong';
import { getUserId } from './auth';
import { openGameInviteModal } from './game-invite';

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
    const inviteBtn = document.getElementById('pong-invite-btn') as HTMLButtonElement | null;
    const resetBtn = document.getElementById('pong-reset-btn') as HTMLButtonElement | null;
    const closeBtn = document.getElementById('pong-close-btn') as HTMLButtonElement | null;

    if (!canvas) {
      showErrorToast('Pong canvas not found');
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize canvas
    function resizeCanvas() {
	if (!canvas) return;
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Rendering loop
    function renderGame() {
	  if (!canvas || !ctx) return;
      ctx!.fillStyle = '#000';
      ctx!.fillRect(0, 0, canvas.width, canvas.height);

      // Center line
      ctx!.strokeStyle = '#333';
      ctx!.setLineDash([10, 10]);
      ctx!.lineWidth = 2;
      ctx!.beginPath();
      ctx!.moveTo(canvas.width / 2, 0);
      ctx!.lineTo(canvas.width / 2, canvas.height);
      ctx!.stroke();
      ctx!.setLineDash([]);

      // Draw ball
      if (gameStateRef?.ball) {
        const ball = gameStateRef.ball;
        const ballX = ball.x * canvas.width;
        const ballY = ball.y * canvas.height;
        const ballRadius = (ball.radius || 0.02) * canvas.width;

        // Glow
        const gradient = ctx!.createRadialGradient(ballX, ballY, 0, ballX, ballY, ballRadius * 2);
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.5, '#00ff00');
        gradient.addColorStop(1, 'rgba(0, 255, 0, 0)');
        ctx!.fillStyle = gradient;
        ctx!.beginPath();
        ctx!.arc(ballX, ballY, ballRadius * 2, 0, 2 * Math.PI);
        ctx!.fill();

        // Solid ball
        ctx!.fillStyle = '#fff';
        ctx!.beginPath();
        ctx!.arc(ballX, ballY, ballRadius, 0, 2 * Math.PI);
        ctx!.fill();
      }

      // Draw paddles
      if (gameStateRef?.paddles) {
        const entries = Object.entries(gameStateRef.paddles);
        entries.forEach(([playerId, paddle]: [string, any]) => {
          if (paddle) {
            let paddleX = paddle.x * canvas.width;
            const paddleY = paddle.y * canvas.height;
            const paddleHeight = paddle.height * canvas.height;

            if (entries.length === 2) {
              const xs = entries.map(([_, p]: [string, any]) => (p?.x || 0));
              const maxX = Math.max(...xs);
              if (paddle.x === maxX) paddleX = paddleX - PADDLE_WIDTH;
            }

            ctx!.shadowBlur = 20;
            ctx!.shadowColor = '#00ff00';
            ctx!.fillStyle = '#00ff00';
            ctx!.fillRect(paddleX, paddleY, PADDLE_WIDTH, paddleHeight);
            ctx!.shadowBlur = 0;
          }
        });
      }

      requestAnimationFrame(renderGame);
    }

    if (renderLoopId) cancelAnimationFrame(renderLoopId);
    renderGame();

    // WS event listeners
    onPongEvent((event, data) => {
      if (event === 'pong.gameState') {
        gameStateRef = data;
      } else if (event === 'pong.gameStarted') {
        if (status) status.textContent = 'Game started!';
      } else if (event === 'pong.score') {
        if (status) status.textContent = `Score: ${data?.scores?.[0] || 0} - ${data?.scores?.[1] || 0}`;
      } else if (event === 'pong.gameEnded') {
        if (status) status.textContent = 'Game ended';
      } else if (event === 'pong.matchedInRandomGame') {
        if (status) status.textContent = `Matched! You're ${data?.yourSide}`;
      } else if (event === 'pong.customGameCreated') {
        if (status) status.textContent = 'Waiting for opponent...';
      } else if (event === 'pong.customGameJoinSuccess') {
        if (status) status.textContent = 'Joined! Ready to play';
      }
    });

    // Keyboard controls
    function onKey(e: KeyboardEvent) {
      const key = e.key;
      if (!keyState[key]) {
        keyState[key] = true;
        if ((key === 'w' || key === 'W' || key === 'ArrowUp') && getCurrentGameId()) {
          e.preventDefault();
          startPaddleMove('up');
        } else if ((key === 's' || key === 'S' || key === 'ArrowDown') && getCurrentGameId()) {
          e.preventDefault();
          startPaddleMove('down');
        }
      }
    }

    function onKeyUp(e: KeyboardEvent) {
      keyState[e.key] = false;
      if (['w', 'W', 's', 'S', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
        stopPaddleMove();
      }
    }

    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKeyUp);

    // Start button: matchmaking
    if (startBtn) {
      startBtn.onclick = () => {
        startMatchmaking();
        if (status) status.textContent = 'Joining matchmaking queue...';
      };
    }

    // Invite button
    if (inviteBtn) {
      inviteBtn.onclick = async () => {
        await openGameInviteModal('pong', async (friendId) => {
          const success = await sendGameInvite(friendId, null);
          if (success) {
            showSuccessToast(`Pong invite sent to ${friendId}`);
          } else {
            showErrorToast('Failed to send Pong invite');
          }
        });
      };
    }

    // Reset button
    if (resetBtn) {
      resetBtn.onclick = () => {
        modal.classList.add('hidden');
        closePong();
        window.removeEventListener('keydown', onKey);
        window.removeEventListener('keyup', onKeyUp);
        window.removeEventListener('resize', resizeCanvas);
        if (renderLoopId) cancelAnimationFrame(renderLoopId);
      };
    }

    // Close button
    if (closeBtn) {
      closeBtn.onclick = () => {
        modal.classList.add('hidden');
        window.removeEventListener('keydown', onKey);
        window.removeEventListener('keyup', onKeyUp);
        window.removeEventListener('resize', resizeCanvas);
        if (renderLoopId) cancelAnimationFrame(renderLoopId);
        closePong();
      };
    }

    showSuccessToast('Pong modal opened');
  } catch (err) {
    console.error('Failed to open pong:', err);
    showErrorToast((err as Error).message || 'Failed to open pong game');
  }
}

/**
 * Close the pong modal
 */
export function closePongModal() {
  // Implement if needed
}

/**
 * Setup pong card click listener for routing
 */
export function setupPongCardListener() {
  // Wait for DOM to be ready
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
  console.log('Attaching pong card listener');
  pongCard.addEventListener('click', async (e) => {
    e.preventDefault();
    goToRoute('/pong');
  });
}
