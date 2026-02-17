import { showErrorToast, showSuccessToast } from '../components/shared/Toast';
import { getUser, getUserId } from './auth';

let ws: WebSocket | null = null;
let currentUserId: string | null = null;
let currentGameId: string | null = null;
let playerSide: string | null = null;
let paddleMoveInterval: any = null;
let gameState: any = { ball: { x: 0.5, y: 0.5 }, paddles: {}, scores: {} };
let paddleKeyState: Record<string, boolean> = {};

const listeners: Array<(event: string, data: any) => void> = [];
export function onPongEvent(cb: (event: string, data: any) => void) { listeners.push(cb); }
function emitEvent(event: string, data: any) { listeners.forEach((cb) => cb(event, data)); }

function buildWsUrl() {
  const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
  const host = location.host;
  return `${protocol}://${host}/pong/ws`;
}

export async function initPong(uid: string) {
  if (!uid) throw new Error('No user id');
  currentUserId = uid;
  if (ws && ws.readyState === WebSocket.OPEN) return;

  const wsUrl = buildWsUrl();
  try {
    ws = new WebSocket(wsUrl);
  } catch (err) {
    console.error('Failed to create WebSocket', err);
    showErrorToast('Failed to connect to Pong');
    return;
  }

  ws.onopen = () => {
    emitEvent('open', {});
    showSuccessToast('Pong WebSocket connected', { duration: 1200 } as any);
  };

  ws.onmessage = (ev) => {
    try {
      const msg = JSON.parse(ev.data);
      handleMessage(msg);
      emitEvent(msg.event, msg.data || {});
    } catch (err) {
      console.error('Pong: failed to parse message', err);
    }
  };

  ws.onclose = () => {
    emitEvent('close', {});
    ws = null;
    currentGameId = null;
    playerSide = null;
  };

  ws.onerror = (err) => {
    console.error('Pong WebSocket error', err);
    emitEvent('error', err);
    ws = null;
  };
}

function sendMessage(event: string, data: any = {}) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    const msg = JSON.stringify({ event, data });
    ws.send(msg);
    return true;
  }
  console.warn('Cannot send: not connected');
  return false;
}

function handleMessage(message: any) {
  if (!message || !message.event) return;

  switch (message.event) {
    case 'pong':
      // ping
      break;

    case 'pong.customGameCreated':
      currentGameId = message.data?.gameId || null;
      break;

    case 'pong.playerJoinedCustomGame':
      // lobby notif
      break;

    case 'pong.customGameJoinSuccess':
      currentGameId = message.data?.gameId || null;
      break;

    case 'pong.playerReadyStatus':
      // remote ready status
      break;

    case 'pong.customGameCanceled':
      currentGameId = null;
      playerSide = null;
      break;

    case 'pong.playerQuitCustomGameInLobby':
      currentGameId = null;
      playerSide = null;
      break;

    case 'pong.matchedInRandomGame':
      currentGameId = message.data.gameId;
      playerSide = message.data.yourSide;
      break;

    case 'pong.gameStarted':
      playerSide = message.data.yourSide;
      break;

    case 'pong.gameState':
      updateGameState(message.data);
      break;

    case 'pong.paddleMove':
      // handled in gameState generally
      break;

    case 'pong.score':
      // update scores
      break;

    case 'pong.gameEnded':
      currentGameId = null;
      playerSide = null;
      break;

    case 'error':
      console.error('Server error:', message.data?.message);
      break;

    default:
      console.warn('Unknown event:', message.event);
  }
}

export function startMatchmaking() { sendMessage('pong.joinMatchmaking', {}); }
export function leaveMatchmaking() { sendMessage('pong.leaveMatchmaking', {}); }
export async function createCustomGame(otherId: string) {
  if (!isPongConnected()) {
    const userId = getUserId();
    if (!userId) {
      throw new Error('Not logged in');
    }
    await initPong(userId);
  }
  sendMessage('pong.createCustomGame', { otherId });
}
export function joinCustomGame(gameId: string) { sendMessage('pong.joinCustomGame', { gameId }); }
export function cancelCustomGame(gameId: string) { sendMessage('pong.cancelCustomGame', { gameId }); }
export function quitGame(gameId: string) { sendMessage('pong.userQuit', { gameId }); }
export function setReady(gameId: string, ready: boolean) { sendMessage(ready ? 'pong.userReady' : 'pong.userNotReady', { gameId }); }

export function startPaddleMove(direction: 'up'|'down') {
  if (!currentGameId) return;
  // Immediate move
  sendMessage('pong.paddleMove', { gameId: currentGameId, direction });
  if (paddleMoveInterval) return;
  paddleMoveInterval = setInterval(() => {
    sendMessage('pong.paddleMove', { gameId: currentGameId, direction });
  }, 50);
}

export function stopPaddleMove() {
  if (paddleMoveInterval) {
    clearInterval(paddleMoveInterval);
    paddleMoveInterval = null;
  }
}

function updateGameState(data: any) {
  gameState = { ball: data.ball, paddles: data.paddles, scores: data.scores };
}

export function getCurrentGameId() { return currentGameId; }

export function closePong() {
  if (ws) {
    ws.close();
    ws = null;
  }
  currentUserId = null;
  currentGameId = null;
  playerSide = null;
}

export function isPongConnected(): boolean {
  return ws !== null && ws.readyState === WebSocket.OPEN;
}

export async function sendGameInvite(targetId: string, gameId: string | null = null) {
  try {
    const userId = getUserId();
    
    // Ensure Pong socket is connected before sending invite
    if (!isPongConnected()) {
      if (!userId) {
        throw new Error('Not logged in');
      }
      await initPong(userId);
      
      // Wait for connection to open
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Connection timeout')), 5000);
        const checkConnection = () => {
          if (isPongConnected()) {
            clearTimeout(timeout);
            resolve();
          } else {
            setTimeout(checkConnection, 100);
          }
        };
        checkConnection();
      });
    }

    // Send invite via WebSocket
    sendMessage('pong.sendGameInvite', { targetId, gameId });
    return true;
  } catch (err) {
    console.error('Failed to send game invite:', err);
    return false;
  }
}

export default { initPong, startMatchmaking, startPaddleMove, stopPaddleMove, sendGameInvite, getCurrentGameId };
