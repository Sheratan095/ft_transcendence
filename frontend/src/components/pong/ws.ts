/**
 * WebSocket Connection & Game Commands
 * Handles WebSocket lifecycle, message routing, and game commands
 */

import { showErrorToast, showSuccessToast } from '../shared/Toast';
import { getUserId, isLoggedInClient } from '../../lib/auth';
import * as modalHandlers from './modal';

let pongWs: WebSocket | null = null;
let currentUserId: string | null = null;
let currentGameId: string | null = null;
let playerSide: string | null = null;

let paddleMoveInterval: any = null;

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

	console.warn('[WS] Cannot send: not connected');
	return (false);
}

/**
 * Initialize WebSocket connection
 */
export async function initPong(uid: string)
{
	if (!uid)
		throw new Error('No user id');
	currentUserId = uid;

	if (pongWs && pongWs.readyState === WebSocket.OPEN)
		return;

	const wsUrl = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws/pong`;
	try {
		pongWs = new WebSocket(wsUrl);
	}
	catch (err) {
		console.error('[WS] Failed to create WebSocket', err);
		showErrorToast('Failed to connect to Pong');
		return;
	}

	pongWs.onopen = () => {
		showSuccessToast('Pong WebSocket connected', { duration: 1200 } as any);
	};

	pongWs.onmessage = (ev) => {
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
			console.error('[WS] Failed to parse message', err);
		}
	};

	pongWs.onclose = () => {
		pongWs = null;
		currentGameId = null;
		playerSide = null;
	};

	pongWs.onerror = (err) => {
		console.error('[WS] Error', err);
		pongWs = null;
	};
}

/**
 * Route event to appropriate handler
 */
function routeEvent(event: string, data: any)
{
	console.log('[WS] Event:', event);

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
	if (pongWs) {
		pongWs.close();
		pongWs = null;
	}
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

		await initPong(getUserId() as string);
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
