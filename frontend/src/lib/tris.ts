/**
 * Tris Game WebSocket Manager
 */

let trisSocket: WebSocket | null = null;
let currentGameId: string | null = null;
let gameState: GameState | null = null;
let onGameStateUpdate: ((event: string, data: any) => void) | null = null;

export interface GameMove {
  position: number; // 0-8 for 3x3 grid
}

export interface GameState {
  gameId: string;
  board: string[][];
  currentPlayer: string;
  status: 'waiting' | 'playing' | 'finished';
  winner?: string;
  yourSymbol?: string;
  opponentUsername?: string;
  yourTurn?: boolean;
  message?: string;
}

/**
 * Initialize tris game connection
 */
export function initTris(userId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/tris/ws?userId=${userId}`;

    try {
      trisSocket = new WebSocket(wsUrl);

      trisSocket.onopen = () => {
        console.log('Tris WebSocket connected');
        resolve();
      };

      trisSocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          const eventType = message.event;
          const data = message.data;

          console.log('Tris event:', eventType, data);

          // Update game state for relevant events
          if (eventType.includes('gameStarted') || eventType.includes('moveMade') || eventType.includes('gameEnded')) {
            if (data.gameId) currentGameId = data.gameId;
          }

          // Notify UI of event
          if (onGameStateUpdate) {
            onGameStateUpdate(eventType, data);
          }
        } catch (err) {
          console.error('Failed to parse tris message:', err);
        }
      };

      trisSocket.onerror = (error) => {
        console.error('Tris WebSocket error:', error);
        reject(error);
      };

      trisSocket.onclose = () => {
        console.log('Tris WebSocket disconnected');
        trisSocket = null;
      };
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Set callback for game events
 */
export function onTrisEvent(callback: (event: string, data: any) => void) {
  onGameStateUpdate = callback;
}

/**
 * Create a custom game with another player
 */
export function createCustomGame(otherId: string): void {
  if (!trisSocket || trisSocket.readyState !== WebSocket.OPEN) {
    console.error('Tris WebSocket not connected');
    return;
  }

  const message = {
    event: 'tris.createCustomGame',
    data: { otherId },
  };
  console.log('Creating custom game with:', message);
  trisSocket.send(JSON.stringify(message));
}

/**
 * Join a custom game
 */
export function joinCustomGame(gameId: string): void {
  if (!trisSocket || trisSocket.readyState !== WebSocket.OPEN) {
    console.error('Tris WebSocket not connected', currentGameId, gameId);
    return;
  }

  currentGameId = gameId;
  const message = {
    event: 'tris.joinCustomGame',
    data: { gameId },
  };

  trisSocket.send(JSON.stringify(message));
}

/**
 * Cancel a custom game
 */
export function cancelCustomGame(gameId: string): void {
  if (!trisSocket || trisSocket.readyState !== WebSocket.OPEN) {
    console.error('Tris WebSocket not connected');
    return;
  }

  const message = {
    event: 'tris.cancelCustomGame',
    data: { gameId },
  };

  trisSocket.send(JSON.stringify(message));
}

/**
 * Make a move in tris
 */
export function makeTrisMove(position: number): void {
  if (!trisSocket || trisSocket.readyState !== WebSocket.OPEN) {
    console.error('Tris WebSocket not connected');
    return;
  }

  if (!currentGameId) {
    console.error('No active game');
    return;
  }

  const message = {
    event: 'tris.makeMove',
    data: {
      gameId: currentGameId,
      position,
    },
  };

  trisSocket.send(JSON.stringify(message));
}

/**
 * Set user ready status
 */
export function setUserReady(readyStatus: boolean): void {
  if (!trisSocket || trisSocket.readyState !== WebSocket.OPEN) {
    console.error('Tris WebSocket not connected');
    return;
  }

  if (!currentGameId) {
    console.error('No active game');
    return;
  }

  const message = {
    event: 'tris.userReady',
    data: {
      gameId: currentGameId,
      readyStatus,
    },
  };

  trisSocket.send(JSON.stringify(message));
}

/**
 * Quit the current game
 */
export function quitGame(): void {
  if (!trisSocket || trisSocket.readyState !== WebSocket.OPEN) {
    console.error('Tris WebSocket not connected');
    return;
  }

  if (!currentGameId) {
    console.error('No active game');
    return;
  }

  const message = {
    event: 'tris.userQuit',
    data: { gameId: currentGameId },
  };

  trisSocket.send(JSON.stringify(message));
  currentGameId = null;
}

/**
 * Start matchmaking
 */
export function startMatchmaking(): void {
  if (!trisSocket || trisSocket.readyState !== WebSocket.OPEN) {
    console.error('Tris WebSocket not connected');
    return;
  }

  const message = {
    event: 'tris.joinMatchmaking',
    data: {},
  };

  trisSocket.send(JSON.stringify(message));
}

/**
 * Leave matchmaking
 */
export function stopMatchmaking(): void {
  if (!trisSocket || trisSocket.readyState !== WebSocket.OPEN) {
    console.error('Tris WebSocket not connected');
    return;
  }

  const message = {
    event: 'tris.leaveMatchmaking',
    data: {},
  };

  trisSocket.send(JSON.stringify(message));
}

/**
 * Close tris connection
 */
export function closeTris(): void {
  if (trisSocket) {
    trisSocket.close();
    trisSocket = null;
    currentGameId = null;
    gameState = null;
  }
}

/**
 * Get current game ID
 */
export function getCurrentGameId(): string | null {
  return currentGameId;
}

/**
 * Set current game ID
 */
export function setCurrentGameId(gameId: string | null): void {
  currentGameId = gameId;
}

/**
 * Get current game state
 */
export function getTrisGameState(): GameState | null {
  return gameState;
}
