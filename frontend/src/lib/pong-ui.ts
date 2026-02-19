import { showErrorToast, showSuccessToast } from '../components/shared/Toast';
import { goToRoute } from '../spa';
import { initPong, onPongEvent, startMatchmaking, startPaddleMove, stopPaddleMove, closePong, getCurrentGameId } from './pong';
import { getUserId, getUser } from './auth';
import { openGameInviteModal } from './game-invite';
import { PongGame, GAME_MODES } from '../components/pong/pong.js';
import type { PongModeType } from './pong-menù.js';
import { isLoggedInClient } from './token';

// Render constants
const PADDLE_WIDTH = 15;
const PADDLE_HEIGHT = 100;

let gameStateRef: any = null;
let renderLoopId: any = null;
let keyState: Record<string, boolean> = {};
let currentGameInstance: PongGame | null = null;
let currentGameMode: 'online' | 'offline-1v1' | 'offline-ai' = 'online';
let pongInitialized = false;
let gameStatus: 'lobby' | 'playing' | 'looking' = 'lobby';
let userReady = false;
let overlayLoopId: number | null = null;

/**
 * Handle incoming WebSocket events from pong server
 */
function handlePongEvent(event: string, data: any) {
	console.log('Pong event:', event, data);

	switch (event)
	{
		case 'pong.customGameCreated':
			handleCustomGameCreated(data);
			break;
		case 'pong.customGameJoinSuccess':
			handleCustomGameJoinSuccess(data);
			break;
		case 'pong.playerJoinedCustomGame':
			handlePlayerJoinedCustomGame(data);
			break;
		case 'pong.customGameCanceled':
			handleCustomGameCanceled(data);
			break;
		case 'pong.gameStarted':
			handleGameStarted(data);
			break;
		case 'pong.gameState':
			handleGameState(data);
			break;
		case 'pong.gameEnded':
			handleGameEnded(data);
			break;
		case 'pong.playerQuitCustomGameInLobby':
			handlePlayerQuitCustomGameInLobby(data);
			break;
		case 'pong.matchedInRandomGame':
			handleMatchedInRandomGame(data);
			break;
		case 'pong.invalidMove':
			handleInvalidMove(data);
			break;
		case 'error':
			handleError(data);
			break;
		default:
			console.warn('Unknown pong event:', event);
	}
}

function handleCustomGameCreated(data: any) {
	const { gameId, opponentUsername } = data;
	gameStatus = 'playing';
	updatePongStatus(`Game created! Waiting for ${opponentUsername}...`);
	showSuccessToast(`Game created! Waiting for opponent...`);
}

function handleCustomGameJoinSuccess(data: any) {
	const { gameId, creatorUsername } = data;
	console.log('Joined custom game:', data);
	gameStatus = 'playing';
	updatePongStatus(`Joined game! Playing against ${creatorUsername}`);
	showSuccessToast(`Joined game with ${creatorUsername}!`);
}

function handlePlayerJoinedCustomGame(_data: any) {
	updatePongStatus('Opponent joined! Ready to start');
	showSuccessToast('Opponent joined the game!');
}

function handleCustomGameCanceled(_data: any) {
	updatePongStatus('Game was canceled');
	showErrorToast('Game was canceled');
	gameStatus = 'lobby';
	userReady = false;
}

function handleGameStarted(data: any) {
	const { gameId, yourSide, opponentUsername } = data;
	gameStatus = 'playing';
	userReady = false;
	const sideText = yourSide ? `Playing as ${yourSide}` : 'Game started';
	updatePongStatus(`${sideText}. ${opponentUsername ? `vs ${opponentUsername}` : ''}`);
	showSuccessToast(`Game started!`);
}

function handleGameState(data: any)
{
	if (!currentGameInstance) return;
	if (currentGameInstance.gameManager.mode !== GAME_MODES.ONLINE) return;
	
	// Extract game state from server data
	const serverState = {
		ball: data.ball,
		paddles: data.paddles,
		scores: data.scores
	};
	
	// Pass server state to network controller if it exists
	if (currentGameInstance.gameManager.networkController)
		currentGameInstance.gameManager.networkController.setServerGameState(serverState);

}

function handleGameEnded(data: any) {
	const { winner, quit, timedOut, reason } = data;
	const user = getUser();
	let message = '';
	
	if (quit) {
		message = 'Opponent quit the game';
	} else if (timedOut) {
		message = 'Game ended - Connection timeout';
	} else if (winner === user?.id) {
		message = 'You won!';
	} else if (reason) {
		message = reason;
	} else {
		message = 'Game ended';
	}
	
	updatePongStatus(message);
	gameStatus = 'lobby';
	userReady = false;
	
	if (quit || timedOut) {
		showErrorToast(message);
	} else if (winner === user?.id) {
		showSuccessToast(message);
	} else {
		showErrorToast(message);
	}
}

function handlePlayerQuitCustomGameInLobby(_data: any) {
	updatePongStatus('Opponent quit the lobby');
	showErrorToast('Opponent quit the game');
	gameStatus = 'lobby';
	userReady = false;
}

function handleMatchedInRandomGame(data: any) {
	const { gameId, yourSide, opponentUsername } = data;
	gameStatus = 'playing';
	userReady = false;
	const sideText = yourSide || 'a paddle';
	updatePongStatus(`Matched! Playing ${opponentUsername}. You are ${sideText}`);
	showSuccessToast(`Matched with ${opponentUsername}!`);
}

function handleInvalidMove(data: any) {
	const { message } = data;
	updatePongStatus(`Invalid move: ${message}`);
	showErrorToast(`Invalid move: ${message}`);
}

function handleError(data: any) {
	const { message } = data;
	updatePongStatus(`Error: ${message}`);
	showErrorToast(`Error: ${message}`);
}

function updatePongStatus(statusText: string) {
	const statusEl = document.getElementById('pong-status');
	if (!statusEl) return;
	statusEl.textContent = statusText;
}

/**
 * Open the pong modal with a specific game mode
 */
export async function openPongModal(mode: PongModeType = 'online') {
	try {
		// Destroy existing game instance if any
		if (currentGameInstance) {
			currentGameInstance.destroy();
			currentGameInstance = null;
			stopOverlayLoop();
		}

		currentGameMode = mode;

		const modal = document.getElementById('pong-modal');
		if (!modal) {
			goToRoute('/pong');
			return;
		}

		modal.classList.remove('hidden');

		const userId = getUserId();
		
		// Initialize WebSocket only for online mode
		if (mode === 'online') {
			if (!userId) {
				showErrorToast('You must be logged in to play Pong');
				return;
			}
			await initPong(userId);
			
			// Setup WebSocket event handlers
			if (!pongInitialized) {
				onPongEvent(handlePongEvent);
				pongInitialized = true;
			}
		}

		// Canvas setup
		const canvas = document.getElementById('pong-canvas') as HTMLCanvasElement | null;
		const status = document.getElementById('pong-status') as HTMLElement | null;
		const startBtn = document.getElementById('pong-start-btn') as HTMLButtonElement | null;
		const resetBtn = document.getElementById('pong-reset-btn') as HTMLButtonElement | null;
		const closeBtn = document.getElementById('pong-close-btn') as HTMLButtonElement | null;

		if (!canvas) {
			showErrorToast('Canvas not found');
			return;
		}

		// Map mode to game manager mode
		let gameMode: string;
		if (mode === 'offline-1v1') {
			gameMode = GAME_MODES.LOCAL_MULTIPLAYER;
		} else if (mode === 'offline-ai') {
			gameMode = GAME_MODES.LOCAL_VS_AI;
		} else {
			gameMode = GAME_MODES.ONLINE;
		}

		// Initialize Game
		const game = new PongGame(canvas.id, gameMode, {
			playerNames: { left: 'Player 1', right: 'Player 2' },
			maxScore: 5,
			aiDifficulty: 'medium'
		});

		currentGameInstance = game;

		// Start overlay updates for names and score
		startOverlayLoop();

		// Update status
		if (status) {
			const modeNames: Record<string, string> = {
				'online': 'Online - Waiting for opponent...',
				'offline-1v1': 'Local 1v1 - Two Player Mode',
				'offline-ai': 'Offline vs Bot'
			};
			status.textContent = modeNames[mode] || 'Pong Game';
		}

		// Setup button handlers
		if (closeBtn) {
			closeBtn.addEventListener('click', closePongModal);
		}

		if (resetBtn) {
			resetBtn.addEventListener('click', () => {
				if (currentGameInstance) {
					currentGameInstance.destroy();
					currentGameInstance = null;
				}
				// Reload the game
				openPongModal(currentGameMode);
			});
		}

		if (startBtn) {
			startBtn.addEventListener('click', () => {
				if (mode === 'online') {
					startMatchmaking();
				}
			});
		}

	} catch (err) {
		console.error('Failed to open Pong modal:', err);
		showErrorToast('Failed to start Pong');
	}
}

export function closePongModal() {
	const modal = document.getElementById('pong-modal');
	if (modal) {
		modal.classList.add('hidden');
	}

	if (currentGameInstance) {
		currentGameInstance.destroy();
		currentGameInstance = null;
	}

	stopOverlayLoop();

	if (currentGameMode === 'online') {
		closePong();
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

function updatePongOverlay() {
	if (!currentGameInstance) return;
	try {
		const gs = currentGameInstance.gameManager.getGameState();
		const leftNameEl = document.getElementById('pong-left-name');
		const rightNameEl = document.getElementById('pong-right-name');
		const centerScoreEl = document.getElementById('pong-center-score');
		if (leftNameEl) leftNameEl.textContent = (gs.playerNames && gs.playerNames.left) || 'Player 1';
		if (rightNameEl) rightNameEl.textContent = (gs.playerNames && gs.playerNames.right) || 'Player 2';
		const scores = gs.scores || { left: 0, right: 0 };
		if (centerScoreEl) centerScoreEl.textContent = `${scores.left ?? 0} - ${scores.right ?? 0}`;
	} catch (e) {
		// ignore overlay errors
	}
}

function startOverlayLoop() {
	if (overlayLoopId) return;
	const loop = () => {
		updatePongOverlay();
		overlayLoopId = requestAnimationFrame(loop);
	};
	overlayLoopId = requestAnimationFrame(loop);
}

function stopOverlayLoop() {
	if (overlayLoopId) {
		cancelAnimationFrame(overlayLoopId);
		overlayLoopId = null;
	}
}
