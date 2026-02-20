/**
 * WebSocket Connection & Game Commands
 * Handles WebSocket lifecycle, message routing, and game commands
 */

import { showErrorToast, showInfoToast, showSuccessToast } from '../shared/Toast';
import { getUserId, isLoggedInClient } from '../../lib/auth';
import * as modalHandlers from './modal';

let pongWs: WebSocket | null = null;
let currentUserId: string | null = null;
let currentGameId: string | null = null;
let playerSide: string | null = null;

let paddleMoveInterval: any = null;

// WebSocket connection state management
let isConnecting = false;
let connectionPromise: Promise<WebSocket> | null = null;

// Reconnection parameters
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 3000;

// ============== WebSocket Connection ==============

/**
 * Send a message through WebSocket
 */
export function sendPongMessage(event: string, data: any = {}): boolean
{
	if (pongWs && pongWs.readyState === WebSocket.OPEN)
	{
		const msg = JSON.stringify({ event, data });
		pongWs.send(msg);
		return (true);
	}

	console.warn('[PONG WS] Cannot send: not connected');
	return (false);
}

/**
 * Initialize WebSocket connection (matches Chat service pattern)
 */
export function initPong(uid: string): Promise<WebSocket> {

	currentUserId = uid;

	// Return existing connection if already open
	if (pongWs && pongWs.readyState === WebSocket.OPEN) {
		return Promise.resolve(pongWs);
	}

	// If connecting is in progress, return the existing promise to avoid multiple concurrent attempts
	if (isConnecting && connectionPromise) {
		return connectionPromise;
	}

	// Set flag to indicate connection is starting
	isConnecting = true;

	const wsUrl = '/pong/ws';

	connectionPromise = new Promise((resolve, reject) => {
		try {
			const socket = new WebSocket(wsUrl);
			pongWs = socket;

			socket.onopen = () => {
				showInfoToast('Connected to Pong', { duration: 1200 } as any);
				isConnecting = false;
				reconnectAttempts = 0; // Reset on successful connection
				connectionPromise = null;
				resolve(socket);
			};

			socket.onmessage = (ev) => {
				try {
					const msg = JSON.parse(ev.data);
					// Update game tracking for paddle moves
					if (msg.event === 'pong.matchedInRandomGame') {
						currentGameId = msg.data.gameId;
						playerSide = msg.data.yourSide;
					} else if (msg.event === 'pong.customGameJoinSuccess' || msg.event === 'pong.customGameCreated') {
						currentGameId = msg.data.gameId;
					} else if (msg.event === 'pong.gameStarted') {
						playerSide = msg.data.yourSide;
					} else if (msg.event === 'pong.gameEnded' || msg.event === 'pong.customGameCanceled') {
						currentGameId = null;
						playerSide = null;
					}
					// Route to event-specific handler
					routeEvent(msg.event, msg.data || {});
				}
				catch (err) {
					console.error('[PONG WS] Failed to parse message', err);
				}
			};

			socket.onerror = (event) => {
				showErrorToast('Pong WebSocket error', { duration: 4000, position: 'top-right' });
				isConnecting = false;
				connectionPromise = null;
				reject(event);
			};

			socket.onclose = () => {
				showErrorToast('⚠️ Pong disconnected', { duration: 4000, position: 'top-right' });
				isConnecting = false;
				connectionPromise = null;
				pongWs = null;
				currentGameId = null;
				playerSide = null;

				// Attempt to reconnect with exponential backoff
				if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
					reconnectAttempts++;
					const delayMs = RECONNECT_DELAY * Math.pow(1.5, reconnectAttempts - 1);
					setTimeout(() => {
						if (currentUserId) {
							initPong(currentUserId).catch(err => console.error('[PONG WS] Reconnection failed:', err));
						}
					}, delayMs);
				} else {
					console.error('[PONG WS] Max reconnection attempts reached');
					showErrorToast('❌ Pong disconnected (could not reconnect)', { duration: 5000, position: 'top-right' });
				}
			};
		} catch (error) {
			console.error('[PONG WS] Connection initialization error:', error);
			isConnecting = false;
			connectionPromise = null;
			reject(error);
		}
	});

	return connectionPromise;
}

/**
 * Route event to appropriate handler
 */
function routeEvent(event: string, data: any)
{
	console.log('[PONG WS] Event:', event);

	switch (event) {
		case 'pong.customGameCreated':
			modalHandlers.handleCustomGameCreated(data);
			break;
		case 'pong.customGameJoinSuccess':
			modalHandlers.handleCustomGameJoinSuccess(data);
			break;
		case 'pong.playerJoinedCustomGame':
			modalHandlers.handlePlayerJoinedCustomGame(data);
			break;
		case 'pong.customGameCanceled':
			modalHandlers.handleCustomGameCanceled(data);
			break;
		case 'pong.gameStarted':
			modalHandlers.handleGameStarted(data);
			break;
		case 'pong.gameState':
			modalHandlers.handleGameState(data);
			break;
		case 'pong.gameEnded':
			modalHandlers.handleGameEnded(data);
			break;
		case 'pong.playerReadyStatus':
			modalHandlers.handlePlayerReadyStatus(data);
			break;
		case 'pong.playerQuitCustomGameInLobby':
			modalHandlers.handlePlayerQuitCustomGameInLobby(data);
			break;
		case 'pong.matchedInRandomGame':
			modalHandlers.handleMatchedInRandomGame(data);
			break;
		case 'pong.invalidMove':
			modalHandlers.handleInvalidMove(data);
			break;
		case 'error':
			modalHandlers.handleError(data);
			break;
	}
}

/**
 * Close WebSocket connection
 */
export function closePong() {
	// Prevent reconnection attempts when manually disconnecting
	reconnectAttempts = MAX_RECONNECT_ATTEMPTS;
	
	if (pongWs) {
		if (pongWs.readyState === WebSocket.OPEN) {
			pongWs.close();
		}
		pongWs = null;
	}
	isConnecting = false;
	connectionPromise = null;
	currentUserId = null;
	currentGameId = null;
	playerSide = null;
}

/**
 * Check if WebSocket is connected
 */
export function isPongConnected(): boolean {
	return pongWs !== null && pongWs.readyState === WebSocket.OPEN;
}

/**
 * Get current game ID
 */
export function getCurrentGameId() {
	return currentGameId;
}

/**
 * Get current player side
 */
export function getPlayerSide() {
	return playerSide;
}

/**
 * Stop paddle movement
 */
export function startMatchmaking() {
	sendPongMessage('pong.joinMatchmaking', {});
}

/**
 * Leave matchmaking queue
 */
export function leaveMatchmaking() {
	sendPongMessage('pong.leaveMatchmaking', {});
}

/**
 * Create a custom game
 */
export async function createCustomGame(otherId: string) {
	if (!isPongConnected()) {
		if (!isLoggedInClient())
			throw new Error('Not logged in');

		try {
			await initPong(getUserId() as string);
		} catch (err) {
			console.error('[PONG WS] Failed to connect before creating custom game:', err);
			throw err;
		}
	}
	sendPongMessage('pong.createCustomGame', { otherId });
}

/**
 * Join a custom game
 */
export function joinCustomGame(gameId: string)
{
	sendPongMessage('pong.joinCustomGame', { gameId });
}

/**
 * Cancel a custom game
 */
export function cancelCustomGame(gameId: string)
{
	sendPongMessage('pong.cancelCustomGame', { gameId });
}

/**
 * Quit current game
 */
export function quitGame(gameId: string)
{
	sendPongMessage('pong.userQuit', { gameId });
}

/**
 * Set ready status
 */
export function setReady(gameId: string, ready: boolean) {
	sendPongMessage(ready ? 'pong.userReady' : 'pong.userNotReady', { gameId });
}

/**
 * Start paddle movement
 */
export function startPaddleMove(direction: 'up' | 'down') {
	const gameId = getCurrentGameId();
	if (!gameId) return;

	sendPongMessage('pong.paddleMove', { gameId, direction });
	if (paddleMoveInterval) return;

	paddleMoveInterval = setInterval(() => {
		sendPongMessage('pong.paddleMove', { gameId, direction });
	}, 50);
}

/**
 * Stop paddle movement
 */
export function stopPaddleMove() {
	if (paddleMoveInterval) {
		clearInterval(paddleMoveInterval);
		paddleMoveInterval = null;
	}
}

/**
 * Send game invite
 */
export async function sendGameInvite(targetId: string, gameId: string | null = null): Promise<boolean> {
	try {
		const userId = getUserId();
		if (!userId) throw new Error('Not logged in');

		if (!gameId) {
			await createCustomGame(targetId);
		} else {
			sendPongMessage('pong.sendGameInvite', { targetId, gameId });
		}
		showSuccessToast(`Game invite sent to user ${targetId}`);
		return true;
	} catch (err) {
		console.error('[WS] Failed to send game invite:', err);
		showErrorToast('Failed to send game invite');
		return false;
	}
}

/**
 * Accept game invite
 */
export function acceptGameInvite(inviteId: string) {
	sendPongMessage('pong.acceptGameInvite', { inviteId });
}

/**
 * Decline game invite
 */
export function declineGameInvite(inviteId: string) {
	sendPongMessage('pong.declineGameInvite', { inviteId });
}
