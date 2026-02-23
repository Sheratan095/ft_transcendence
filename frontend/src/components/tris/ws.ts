/**
 * Tris WebSocket & Network Commands
 * Handles WebSocket lifecycle, message routing, and tris commands
 */

import { showErrorToast, showInfoToast, showSuccessToast } from '../shared/Toast';
import { getUserId } from '../../lib/auth';

let trisWs: WebSocket | null = null;
let currentGameId: string | null = null;
let currentSymbol: string | null = null;
let isConnecting = false;
let connectionPromise: Promise<WebSocket> | null = null;

// Routing callback
let onTrisEvent: ((event: string, data: any) => void) | null = null;

// ============== WebSocket Lifecycle ==============

export function initTris(userId: string): Promise<WebSocket> {
	if (trisWs && trisWs.readyState === WebSocket.OPEN) {
		return Promise.resolve(trisWs);
	}

	if (isConnecting && connectionPromise) {
		return connectionPromise;
	}

	isConnecting = true;
	const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
	const host = window.location.host;
	const wsUrl = `${protocol}//${host}/tris/ws?userId=${userId}`;

	connectionPromise = new Promise((resolve, reject) => {
		try {
			const socket = new WebSocket(wsUrl);
			trisWs = socket;

			socket.onopen = () => {
				showInfoToast('Connected to Tris', { duration: 1200 } as any);
				isConnecting = false;
				connectionPromise = null;
				resolve(socket);
			};

			socket.onmessage = (ev) => {
				try {
					const msg = JSON.parse(ev.data);
					const eventType = msg.event;
					const data = msg.data;

					// Internal tracking for game state updates
					if (eventType === 'tris.matchedInRandomGame' || eventType === 'tris.gameStarted' || 
						eventType === 'tris.customGameCreated' || eventType === 'tris.customGameJoinSuccess') {
						if (data.gameId) currentGameId = data.gameId;
						if (data.yourSymbol) currentSymbol = data.yourSymbol;
					} else if (eventType === 'tris.gameEnded' || eventType === 'tris.customGameCanceled') {
						currentGameId = null;
						currentSymbol = null;
					}

					// Route to subscribers
					if (onTrisEvent) {
						onTrisEvent(eventType, data);
					}
				}
				catch (err) {
					console.error('[TRIS WS] Failed to parse message', err);
				}
			};

			socket.onerror = (error) => {
				console.error('[TRIS WS] WebSocket error:', error);
				isConnecting = false;
				connectionPromise = null;
				reject(error);
			};

			socket.onclose = () => {
				console.log('[TRIS WS] Disconnected');
				trisWs = null;
				isConnecting = false;
				connectionPromise = null;
			};
		} catch (err) {
			isConnecting = false;
			connectionPromise = null;
			reject(err);
		}
	});

	return connectionPromise;
}

export function closeTris() {
	if (trisWs) {
		trisWs.close();
		trisWs = null;
	}
}

export function isTrisConnected(): boolean {
	return trisWs !== null && trisWs.readyState === WebSocket.OPEN;
}

// ============== Subscription ==============

export function setTrisEventCallback(callback: (event: string, data: any) => void) {
	onTrisEvent = callback;
}

// ============== Commands ==============

export function sendTrisCommand(event: string, data: any = {}): boolean {
  if (trisWs && trisWs.readyState === WebSocket.OPEN) {
    trisWs.send(JSON.stringify({ event, data }));
    return true;
  }
  console.warn('[TRIS WS] Cannot send, connection not open');
  return false;
}

export function makeTrisMove(position: number) {
	sendTrisCommand('makeMove', { gameId: currentGameId, position });
}

export async function createCustomGame(targetPlayerId: string): Promise<void> {
  sendTrisCommand('createCustomGame', { guestEmail: targetPlayerId });
}

export function joinCustomGame(gameId: string) {
	sendTrisCommand('joinCustomGame', { gameId });
}

export function cancelCustomGame(gameId: string) {
	sendTrisCommand('cancelCustomGame', { gameId });
}

export function setUserReady(ready: boolean) {
	sendTrisCommand('readyToStart', { gameId: currentGameId, ready });
}

export function quitGame() {
	sendTrisCommand('quitGame', { gameId: currentGameId });
}

export function startMatchmaking() {
	sendTrisCommand('startMatchmaking');
}

export function stopMatchmaking() {
	sendTrisCommand('stopMatchmaking');
}

// Tracking accessors
export function getCurrentGameId() { return currentGameId; }
export function setCurrentGameId(id: string | null) { currentGameId = id; }
export function getCurrentSymbol() { return currentSymbol; }
