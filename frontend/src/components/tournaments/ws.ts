/**
 * Tournament WebSocket Connection & Event Handlers
 * Handles WebSocket lifecycle, message routing, and tournament commands
 */

import { showErrorToast, showInfoToast, showSuccessToast } from '../shared/Toast';
import { getUserId, isLoggedInClient } from '../../lib/auth';

let tournamentWs: WebSocket | null = null;
let currentUserId: string | null = null;
let currentTournamentId: string | null = null;

// WebSocket connection state management
let isConnecting = false;
let connectionPromise: Promise<WebSocket> | null = null;

// Reconnection parameters
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 3000;

// Event handlers storage
const eventHandlers: Map<string, Function[]> = new Map();

// ============== PUBLIC API ==============

/**
 * Send a message through WebSocket
 */
export function sendTournamentMessage(event: string, data: any = {}): boolean {
	if (tournamentWs && tournamentWs.readyState === WebSocket.OPEN) {
		const msg = JSON.stringify({ event, data });
		tournamentWs.send(msg);
		console.log('[TOURNAMENT WS] Sent:', event, data);
		return true;
	}

	console.warn('[TOURNAMENT WS] Cannot send: not connected');
	return false;
}

/**
 * Initialize WebSocket connection
 */
export function initTournament(uid: string): Promise<WebSocket> {
	currentUserId = uid;

	// Return existing connection if already open
	if (tournamentWs && tournamentWs.readyState === WebSocket.OPEN) {
		return Promise.resolve(tournamentWs);
	}

	// If connecting is in progress, return the existing promise
	if (isConnecting && connectionPromise) {
		return connectionPromise;
	}

	isConnecting = true;

	const wsUrl = '/pong/ws';

	connectionPromise = new Promise((resolve, reject) => {
		try {
			const socket = new WebSocket(wsUrl);
			tournamentWs = socket;

			socket.onopen = () => {
				showInfoToast('Connected to Tournament', { duration: 1200 } as any);
				isConnecting = false;
				reconnectAttempts = 0;
				connectionPromise = null;
				resolve(socket);
			};

			socket.onmessage = (ev) => {
				try {
					const msg = JSON.parse(ev.data);
					handleMessage(msg.event, msg.data || {});
				} catch (err) {
					console.error('[TOURNAMENT WS] Failed to parse message', err);
				}
			};

			socket.onerror = (event) => {
				showErrorToast('Tournament WebSocket error', { duration: 4000, position: 'top-right' });
				isConnecting = false;
				connectionPromise = null;
				reject(event);
			};

			socket.onclose = () => {
				showErrorToast('⚠️ Tournament disconnected', { duration: 4000, position: 'top-right' });
				isConnecting = false;
				connectionPromise = null;
				tournamentWs = null;

				// Attempt to reconnect with exponential backoff
				if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
					reconnectAttempts++;
					const delayMs = RECONNECT_DELAY * Math.pow(1.5, reconnectAttempts - 1);
					setTimeout(() => {
						if (currentUserId) {
							initTournament(currentUserId).catch(err => console.error('[TOURNAMENT WS] Reconnection failed:', err));
						}
					}, delayMs);
				} else {
					console.error('[TOURNAMENT WS] Max reconnection attempts reached');
					showErrorToast('❌ Tournament disconnected (could not reconnect)', { duration: 5000, position: 'top-right' });
				}
			};
		} catch (error) {
			console.error('[TOURNAMENT WS] Connection initialization error:', error);
			isConnecting = false;
			connectionPromise = null;
			reject(error);
		}
	});

	return connectionPromise;
}

/**
 * Handle incoming message
 */
function handleMessage(event: string, data: any) {
	console.log('[TOURNAMENT WS] Event:', event, data);

	// Handle tournament-specific events
	routeEvent(event, data);

	// Emit to registered handlers
	const handlers = eventHandlers.get(event);
	if (handlers) {
		handlers.forEach(handler => handler(data));
	}
}

/**
 * Subscribe to an event
 */
export function onTournamentEvent(event: string, handler: (data: any) => void): () => void {
	if (!eventHandlers.has(event)) {
		eventHandlers.set(event, []);
	}
	eventHandlers.get(event)!.push(handler);

	// Return unsubscribe function
	return () => {
		const handlers = eventHandlers.get(event);
		if (handlers) {
			const index = handlers.indexOf(handler);
			if (index > -1) {
				handlers.splice(index, 1);
			}
		}
	};
}

/**
 * Route event to specific handlers
 */
function routeEvent(event: string, data: any) {
	switch (event) {
		// Pong events
		case 'pong':
			handlePong(data);
			break;
		case 'pong.customGameCreated':
			showSuccessToast('Custom game created', { duration: 2000 });
			break;
		case 'pong.playerJoinedCustomGame':
			showInfoToast('Opponent joined your game', { duration: 2000 });
			break;
		case 'pong.customGameJoinSuccess':
			showSuccessToast('Successfully joined game', { duration: 2000 });
			break;
		case 'pong.playerReadyStatus':
			showInfoToast(`Opponent ${data.readyStatus ? 'ready' : 'not ready'}`, { duration: 1500 });
			break;
		case 'pong.customGameCanceled':
			showErrorToast('Custom game was canceled', { duration: 2000 });
			break;
		case 'pong.playerQuitCustomGameInLobby':
			showErrorToast('Opponent quit the lobby', { duration: 2000 });
			break;
		case 'pong.matchedInRandomGame':
			showSuccessToast('Matched with opponent!', { duration: 2000 });
			break;
		case 'pong.gameStarted':
			showInfoToast('Game starting...', { duration: 1500 });
			break;
		case 'pong.gameEnded':
			showInfoToast(data.winner === currentUserId ? 'You won!' : 'You lost', { duration: 2000 });
			break;

		// Tournament events
		case 'pong.tournamentCreated':
			showSuccessToast(`Tournament "${data.name}" created`, { duration: 2000 });
			break;
		case 'pong.tournamentParticipantJoined':
			showInfoToast(`${data.participantUsername} joined "${data.tournamentName}"`, { duration: 2000 });
			break;
		case 'pong.tournamentParticipantLeft':
			showInfoToast(`${data.participantUsername} left "${data.tournamentName}"`, { duration: 2000 });
			break;
		case 'pong.tournamentStarted':
			showSuccessToast(`Tournament "${data.tournamentName}" started!`, { duration: 2000 });
			break;
		case 'pong.tournamentRoundInfo':
			showInfoToast(`Round ${data.roundNumber}/${data.totalMatches}`, { duration: 1500 });
			break;
		case 'pong.tournamentRoundCooldown':
			showInfoToast(`Next round in ${Math.ceil(data.cooldownMs / 1000)}s`, { duration: 1500 });
			break;
		case 'pong.tournamentPlayerReady':
			showInfoToast('Opponent is ready', { duration: 1500 });
			break;
		case 'pong.tournamentMatchStarted':
			showSuccessToast('Your tournament match is starting!', { duration: 2000 });
			break;
		case 'pong.tournamentMatchEnded':
			showInfoToast(`Match won by ${data.winnerUsername}`, { duration: 2000 });
			break;
		case 'pong.tournamentEnded':
			showSuccessToast(`Tournament won by ${data.winnerUsername}!`, { duration: 3000 });
			break;
		case 'pong.tournamentCancelled':
			showErrorToast('Tournament was cancelled', { duration: 2000 });
			break;
		case 'pong.tournamentBracketUpdate':
			// Silently handle bracket updates (they trigger specific handlers)
			break;
	}
}

/**
 * Handle pong (ping/pong response)
 */
function handlePong(data: any) {
	console.log('[TOURNAMENT WS] Pong received at:', new Date(data.timestamp).toLocaleTimeString());
}

/**
 * Close WebSocket connection
 */
export function closeTournament() {
	reconnectAttempts = MAX_RECONNECT_ATTEMPTS;

	if (tournamentWs) {
		if (tournamentWs.readyState === WebSocket.OPEN) {
			tournamentWs.close();
		}
		tournamentWs = null;
	}
	isConnecting = false;
	connectionPromise = null;
	currentUserId = null;
	currentTournamentId = null;
}

/**
 * Check if WebSocket is connected
 */
export function isTournamentConnected(): boolean {
	return tournamentWs !== null && tournamentWs.readyState === WebSocket.OPEN;
}

/**
 * Get current tournament ID
 */
export function getCurrentTournamentId(): string | null {
	return currentTournamentId;
}

/**
 * Set current tournament ID
 */
export function setCurrentTournamentId(id: string | null) {
	currentTournamentId = id;
}

// ============== TOURNAMENT COMMANDS ==============

/**
 * Send ping to keep connection alive
 */
export function sendPing() {
	sendTournamentMessage('ping', {});
}

/**
 * Create a custom pong game
 */
export async function createCustomPongGame(opponentId: string) {
	if (!isTournamentConnected()) {
		if (!isLoggedInClient()) {
			throw new Error('Not logged in');
		}

		try {
			await initTournament(getUserId() as string);
		} catch (err) {
			console.error('[TOURNAMENT WS] Failed to connect:', err);
			throw err;
		}
	}
	sendTournamentMessage('pong.createCustomGame', { otherId: opponentId });
}

/**
 * Join an existing custom game
 */
export function joinCustomPongGame(gameId: string) {
	sendTournamentMessage('pong.joinCustomGame', { gameId });
}

/**
 * Cancel a custom game (creator only)
 */
export function cancelCustomPongGame(gameId: string) {
	sendTournamentMessage('pong.cancelCustomGame', { gameId });
}

/**
 * Quit current game
 */
export function quitPongGame(gameId: string) {
	sendTournamentMessage('pong.userQuit', { gameId });
}

/**
 * Mark yourself as ready
 */
export function markGameReady(gameId: string) {
	sendTournamentMessage('pong.userReady', { gameId });
}

/**
 * Mark yourself as not ready
 */
export function markGameNotReady(gameId: string) {
	sendTournamentMessage('pong.userNotReady', { gameId });
}

/**
 * Join matchmaking queue
 */
export async function joinMatchmaking() {
	if (!isTournamentConnected()) {
		if (!isLoggedInClient()) {
			throw new Error('Not logged in');
		}

		try {
			await initTournament(getUserId() as string);
		} catch (err) {
			console.error('[TOURNAMENT WS] Failed to connect:', err);
			throw err;
		}
	}
	sendTournamentMessage('pong.joinMatchmaking', {});
}

/**
 * Leave matchmaking queue
 */
export function leaveMatchmaking() {
	sendTournamentMessage('pong.leaveMatchmaking', {});
}

/**
 * Move paddle in a game
 */
export function movePaddle(gameId: string, direction: 'up' | 'down') {
	sendTournamentMessage('pong.paddleMove', { gameId, direction });
}

/**
 * Leave a tournament
 */
export function leaveTournament(tournamentId: string) {
	sendTournamentMessage('tournament.leave', { tournamentId });
}

/**
 * Start a tournament (creator only)
 */
export function startTournament(tournamentId: string) {
	sendTournamentMessage('tournament.start', { tournamentId });
}

/**
 * Mark yourself as ready for tournament match
 */
export function markTournamentReady(tournamentId: string) {
	sendTournamentMessage('tournament.ready', { tournamentId });
}
