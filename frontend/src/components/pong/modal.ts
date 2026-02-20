/**
 * Pong Modal - UI Control & Event Handlers
 * Manages modal initialization, events, and UI state
 */

import { showErrorToast, showSuccessToast } from '../shared/Toast';
import { goToRoute } from '../../spa';
import { closePong, startMatchmaking, setReady, getCurrentGameId, getPlayerSide, quitGame } from './ws';
import { getUserId, getUser } from '../../lib/auth';
import { PongGame, GAME_MODES } from './game/3d';
import { isLoggedInClient } from '../../lib/token';

type PongModeType = 'online' | 'offline-1v1' | 'offline-ai';

let currentGameInstance: PongGame | null = null;
let currentGameMode: 'online' | 'offline-1v1' | 'offline-ai' = 'online';

// Export game instance for external control
export function getCurrentGameInstance(): PongGame | null {
	return currentGameInstance;
}

// ============== Event Handlers ==============

function updatePongStatus(statusText: string)
{
	const statusEl = document.getElementById('pong-status');
	if (!statusEl)
		return;

	statusEl.textContent = statusText;
}

export function handleCustomGameCreated(data: any)
{
	const { opponentUsername } = data;

	updatePongStatus(`Game created! Waiting for ${opponentUsername}...`);
	// showSuccessToast('Game created!');
}

/* YOU JOINED A CUSTOM GAME*/
export function handleCustomGameJoinSuccess(data: any)
{
	const { creatorUsername } = data;
	updatePongStatus(`Joined game! Playing against ${creatorUsername}`);
	
	// Show the ready button and hide main button for custom games
	const modal = document.getElementById('pong-modal');
	if (modal)
	{
		const readyBtn = modal.querySelector('#pong-ready-btn') as HTMLButtonElement | null;
		const mainBtn = modal.querySelector('#pong-btn') as HTMLButtonElement | null;
		
		if (readyBtn)
			readyBtn.classList.remove('hidden');
		if (mainBtn)
			mainBtn.classList.add('hidden');
	}
	// showSuccessToast(`Joined game with ${creatorUsername}!`);
}

/* INVITED PLAYER JOINED YOUR GAME */
export function handlePlayerJoinedCustomGame(_data: any)
{
	updatePongStatus('Opponent joined! Ready to start');
	
	// Show the ready button and hide main button
	const modal = document.getElementById('pong-modal');
	if (modal)
	{
		const readyBtn = modal.querySelector('#pong-ready-btn') as HTMLButtonElement | null;
		const mainBtn = modal.querySelector('#pong-btn') as HTMLButtonElement | null;
		
		if (readyBtn)
			readyBtn.classList.remove('hidden');
		if (mainBtn)
			mainBtn.classList.add('hidden');
	}
	// showSuccessToast('Opponent joined!');
}

export function handleCustomGameCanceled(_data: any)
{
	updatePongStatus('Game was canceled');
	showErrorToast('Game was canceled');
}

export function handleGameStarted(data: any)
{
	const { yourSide, opponentUsername } = data;
	const sideText = yourSide ? `Playing as ${yourSide}` : 'Game started';
	updatePongStatus(`${sideText}. ${opponentUsername ? `vs ${opponentUsername}` : ''}`);
	showSuccessToast('Game started!');

	// Reset game state and update scoreboard names
	if (currentGameInstance && yourSide && opponentUsername)
	{
		// Reset 3D scene (ball, paddles, score) for the new game
		currentGameInstance.resetState();

		const user = getUser();
		const myName = user?.username || 'You';
		const left = (yourSide === 'left') ? myName : opponentUsername;
		const right = (yourSide === 'right') ? myName : opponentUsername;
		currentGameInstance.gameManager.setPlayerNames(left, right);
		currentGameInstance.updateScorebarNames();
	}

	// Hide ready button and show main button with "Quit" text
	const modal = document.getElementById('pong-modal');
	if (modal)
	{
		const readyBtn = modal.querySelector('#pong-ready-btn') as HTMLButtonElement | null;
		const mainBtn = modal.querySelector('#pong-btn') as HTMLButtonElement | null;
		
		if (readyBtn)
			readyBtn.classList.add('hidden');
		if (mainBtn)
		{
			mainBtn.textContent = 'Quit';
			mainBtn.classList.remove('hidden');
		}
	}
}

export function handleGameState(data: any)
{
	// Game state handled by renderer
	if (currentGameInstance)
	{
		// Ignore stale game states from previous games
		const currentGame = getCurrentGameId();
		if (!currentGame || (data.gameId && data.gameId !== currentGame))
			return;

		currentGameInstance.updateOnlineState(data);
	}
}

export function handleGameEnded(data: any)
{
	const { winner, quit, timedOut, reason } = data;
	const user = getUser();
	let message = '';

	if (quit) {
		message = 'Opponent quit, you win!';
	}
	else if (timedOut) {
		message = 'Connection timeout';
	}
	else if (winner === user?.id) {
		message = 'You won!';
	}
	else if (reason) {
		message = reason;
	}
	else {
		message = 'Game ended';
	}

	updatePongStatus(message);

	// if (quit || timedOut) {
	// 	showErrorToast(message);
	// }
	// else if (winner === user?.id) {
	// 	showSuccessToast(message);
	// }
	// else {
	// 	showErrorToast(message);
	// }

	// Update start button to 'Play Again'
	const startBtn = document.querySelector('#pong-btn') as HTMLButtonElement | null;
	if (startBtn)
	{
		startBtn.disabled = false;
		startBtn.textContent = 'Play Again';
		// Reset colors if needed (online mode doesn't switch to STOP normally but better safe)
		startBtn.classList.remove('bg-red-600', 'hover:bg-red-700', 'text-white', 'dark:text-white');
		startBtn.classList.add('dark:bg-accent-green', 'bg-accent-blue','dark:text-black');
	}
}

export function handlePlayerQuitCustomGameInLobby(_data: any)
{
	updatePongStatus('Opponent quit');
	// showErrorToast('Opponent quit');
}

export function handleMatchedInRandomGame(data: any)
{
	const { yourSide, opponentUsername } = data;
	const sideText = yourSide || 'a paddle';

	updatePongStatus(`Matched with ${opponentUsername}. You are ${sideText}`);
	
	// Update player names in the game UI
	if (currentGameInstance) {
		const user = getUser();
		const myName = user?.username || 'You';
		if (yourSide === 'left') {
			currentGameInstance.gameManager.setPlayerNames(myName, opponentUsername);
		} else {
			currentGameInstance.gameManager.setPlayerNames(opponentUsername, myName);
		}
		currentGameInstance.updateScorebarNames();
	}

	// Show the ready button and hide the main button when matched
	const modal = document.getElementById('pong-modal');
	if (modal)
	{
		const readyBtn = modal.querySelector('#pong-ready-btn') as HTMLButtonElement | null;
		const mainBtn = modal.querySelector('#pong-btn') as HTMLButtonElement | null;
		
		if (readyBtn)
			readyBtn.classList.remove('hidden');
		if (mainBtn)
			mainBtn.classList.add('hidden');
	}
}

export function handleInvalidMove(data: any)
{
	updatePongStatus(`Invalid move: ${data.message}`);
	// showErrorToast(`Invalid move: ${data.message}`);
}

export function handleError(data: any)
{
	updatePongStatus(`Error: ${data.message}`);
	// showErrorToast(`Error: ${data.message}`);
}

export function handlePlayerReadyStatus(data: any)
{
	const { readyStatus } = data;
	console.log('[Pong] Opponent ready status changed:', readyStatus);
	
	// Update scorebar to show opponent's ready status
	if (currentGameInstance)
	{
		// The opponent changed their ready status
		// Determine which side is the opponent
		const playerSide = getPlayerSide();
		const opponentSide = playerSide === 'left' ? 'right' : 'left';
		
		console.log('[Pong] Player side:', playerSide, 'Opponent side:', opponentSide, 'Ready:', readyStatus);
		
		// Update opponent's ready status in GameManager
		currentGameInstance.gameManager.setPlayerReadyStatus(opponentSide as 'left' | 'right', readyStatus);
	}
}

// ============== Modal Control ==============

// Setup global listeners once
if (typeof window !== 'undefined')
{
	window.addEventListener('pong.gameLocalEnded', (e: any) =>
	{
		const { winnerName } = e.detail;
		updatePongStatus(`Game Over! ${winnerName} won.`);
		showSuccessToast(`${winnerName} won!`);

		const startBtn = document.querySelector('#pong-btn') as HTMLButtonElement | null;
		if (startBtn)
		{
			startBtn.disabled = false;
			startBtn.textContent = 'Restart';
			// Reset to original colors
			startBtn.classList.remove('bg-red-600', 'hover:bg-red-700', 'text-white', 'dark:text-white');
			startBtn.classList.add('dark:bg-accent-green', 'bg-accent-blue','dark:text-black');
		}
	});
}

function attachButtonHandlers(container: HTMLElement, mode: PongModeType)
{
	const closeBtn = container.querySelector('#pong-close-btn') as HTMLButtonElement | null;
	if (closeBtn)
	{
		// Replace to clear listeners
		const newCloseBtn = closeBtn.cloneNode(true) as HTMLButtonElement;
		closeBtn.parentNode?.replaceChild(newCloseBtn, closeBtn);
		newCloseBtn.addEventListener('click', closePongModal);
	}

	// Ready Button (online mode only)
	const readyBtn = container.querySelector('#pong-ready-btn') as HTMLButtonElement | null;
	if (readyBtn && mode === 'online')
	{
		const newReadyBtn = readyBtn.cloneNode(true) as HTMLButtonElement;
		readyBtn.parentNode?.replaceChild(newReadyBtn, readyBtn);
		
		newReadyBtn.addEventListener('click', () =>
		{
			const gameId = getCurrentGameId();
			if (!gameId)
			{
				console.warn('[Pong] No game ID available for ready button');
				return;
			}

			const isReady = newReadyBtn.textContent?.includes('✓');
			console.log('[Pong] Ready button clicked, current state:', isReady, 'gameId:', gameId);
			
			// Toggle ready status
			if (isReady)
			{
				// Set not ready
				console.log('[Pong] Setting not ready');
				setReady(gameId, false);
				newReadyBtn.textContent = '✗ Not Ready';
				newReadyBtn.classList.remove('dark:bg-accent-orange', 'bg-accent-orange');
				newReadyBtn.classList.add('dark:bg-red-600', 'bg-red-600');
				
				// Update GameManager
				if (currentGameInstance)
				{
					const playerSide = getPlayerSide();
					if (playerSide)
						currentGameInstance.gameManager.setPlayerReadyStatus(playerSide as 'left' | 'right', false);
				}
			}
			else
			{
				// Set ready
				console.log('[Pong] Setting ready');
				setReady(gameId, true);
				newReadyBtn.textContent = '✓ Ready';
				newReadyBtn.classList.remove('dark:bg-red-600', 'bg-red-600');
				newReadyBtn.classList.add('dark:bg-accent-orange', 'bg-accent-orange');
				
				// Update GameManager
				if (currentGameInstance)
				{
					const playerSide = getPlayerSide();
					if (playerSide)
						currentGameInstance.gameManager.setPlayerReadyStatus(playerSide as 'left' | 'right', true);
				}
			}
		});
	}

	const startBtn = container.querySelector('#pong-btn') as HTMLButtonElement | null;
	if (startBtn)
	{
		// Replace to clear listeners
		const newStartBtn = startBtn.cloneNode(true) as HTMLButtonElement;
		startBtn.parentNode?.replaceChild(newStartBtn, startBtn);

		newStartBtn.addEventListener('click', () =>
		{
			if (newStartBtn.textContent === 'Restart' || newStartBtn.textContent === 'Play Again') {
				openPongModal(mode);
				return;
			}

			// Quit during active game
			if (newStartBtn.textContent === 'Quit')
			{
				const gameId = getCurrentGameId();
				if (gameId)
				{
					quitGame(gameId);
					closePongModal();
					// showSuccessToast('You quit the game');
				}
				return;
			}

			if (mode === 'online')
			{
				if (newStartBtn.textContent === 'Quit matchmaking')
				{
					// quitMatchmaking(); // TO DO
					updatePongStatus('Online - Not in matchmaking');
					// Reset button to 'Start Matchmaking'
					newStartBtn.textContent = 'Start Matchmaking';

					// Keep original colors for searching state
					newStartBtn.classList.remove('bg-red-600', 'hover:bg-red-700', 'text-white', 'dark:text-white');
					newStartBtn.classList.add('dark:bg-accent-green', 'bg-accent-blue','dark:text-black');
					
					// Hide ready button
					const readyBtn = container.querySelector('#pong-ready-btn') as HTMLButtonElement | null;
					if (readyBtn)
						readyBtn.classList.add('hidden');
				}
				else
				{
					startMatchmaking();
					updatePongStatus('Searching for opponent...');
	
					newStartBtn.textContent = 'Quit matchmaking';

					// Reset colors to original
					newStartBtn.classList.remove('dark:bg-accent-green', 'bg-accent-blue','dark:text-black');
					newStartBtn.classList.add('bg-red-600', 'hover:bg-red-700', 'text-white', 'dark:text-white');
				}
			}
			else if (mode === 'offline-1v1' || mode === 'offline-ai')
			{
				if (!currentGameInstance)
					return;

				if (newStartBtn.textContent === 'Start' || newStartBtn.textContent === 'Continue') {
					// Logic for starting or resuming the game
					currentGameInstance.gameManager.enableOfflineInput();
					currentGameInstance.gameManager.resumeGame(); // Ensure unpaused
					
					if (newStartBtn.textContent === 'Start')
						currentGameInstance.gameManager.activateBall(); // Start ball on click

					updatePongStatus("Game in progress...");

					// Update button to 'STOP' and red
						newStartBtn.textContent = 'STOP';
						newStartBtn.classList.remove('dark:bg-accent-green', 'bg-accent-blue', 'dark:text-black');
						newStartBtn.classList.add('bg-red-600', 'hover:bg-red-700', 'text-white', 'dark:text-white');
				}
				else if (newStartBtn.textContent === 'STOP') {
					// STOP / PAUSE logic
					currentGameInstance.gameManager.disableOfflineInput();
					currentGameInstance.gameManager.pauseGame();
					updatePongStatus('Game paused');

					// Update button back to 'Continue' and primary colors
					newStartBtn.textContent = 'Continue';
						newStartBtn.classList.remove('bg-red-600', 'hover:bg-red-700', 'text-white', 'dark:text-white');
						newStartBtn.classList.add('dark:bg-accent-green', 'bg-accent-blue','dark:text-black');
				}
			}
		});
	}
}

/**
 * Open the pong modal
 */
export async function openPongModal(mode: PongModeType = 'online')
{
	try
	{
		if (currentGameInstance)
		{
			currentGameInstance.destroy();
			currentGameInstance = null;
		}

		currentGameMode = mode;

		const modal = document.getElementById('pong-modal');
		if (!modal)
		{
			goToRoute('/pong');
			return;
		}

		// Reset all DOM elements BEFORE showing modal to prevent flash of old state
		const scoreEl = document.getElementById('pong-center-score');
		if (scoreEl) scoreEl.textContent = '0 - 0';
		const statusEl = document.getElementById('pong-status');
		if (statusEl) statusEl.textContent = 'Loading...';
		const leftNameEl = document.getElementById('pong-left-name');
		if (leftNameEl) {
			const textSpan = leftNameEl.querySelector('span:first-child');
			if (textSpan) textSpan.textContent = '--------';
		}
		const rightNameEl = document.getElementById('pong-right-name');
		if (rightNameEl) {
			const textSpan = rightNameEl.querySelector('span:last-child');
			if (textSpan) textSpan.textContent = '--------';
		}

		modal.classList.remove('hidden');

		const userId = getUserId();

		if (mode === 'online')
		{
			if (!userId)
			{
				showErrorToast('You must be logged in');
				return;
			}
		}

		const canvas = document.getElementById('pong-canvas') as HTMLCanvasElement | null;
		const status = document.getElementById('pong-status') as HTMLElement | null;

		if (!canvas)
		{
			showErrorToast('Canvas not found');
			return;
		}

		let gameMode: string;
		if (mode === 'offline-1v1') {
			gameMode = GAME_MODES.LOCAL_MULTIPLAYER;
		}
		else if (mode === 'offline-ai') {
			gameMode = GAME_MODES.LOCAL_VS_AI;
		}
		else {
			gameMode = GAME_MODES.ONLINE;
		}

		let game: PongGame;
		try {
			game = new PongGame(canvas.id, gameMode,
			{
				playerNames:
				{
					left: mode === 'offline-1v1' ? 'Player left' : (mode === 'offline-ai' ? 'You' : '--------'),
					right: mode === 'offline-1v1' ? 'Player right' : (mode === 'offline-ai' ? 'Ai' : '--------')
				},
				maxScore: 5,
				aiDifficulty: 'medium'
			});
		} catch (err) {
			console.error('[Modal] Failed to initialize PongGame:', err);
			showErrorToast('Failed to initialize game renderer');
			modal.classList.add('hidden');
			return;
		}

		currentGameInstance = game;

		if (status)
		{
			const modeNames: Record<string, string> = {
				'online': 'Online - Not in matchmaking',
				'offline-1v1': 'Offline 1v1',
				'offline-ai': 'Offline vs Ai'
			};
			status.textContent = modeNames[mode] || 'Pong Game';
		}

		// Reset start button for new game
		const startBtn = modal.querySelector('#pong-btn') as HTMLButtonElement | null;
		if (startBtn)
		{
			startBtn.disabled = false;
			if (mode === 'online')
				startBtn.textContent = 'Start Matchmaking';
			else
				startBtn.textContent = 'Start';
			// Ensure we reset to starting colors
			startBtn.classList.remove('bg-red-600', 'hover:bg-red-700', 'text-white', 'dark:text-white');
			startBtn.classList.add('dark:bg-accent-green', 'bg-accent-blue', 'dark:text-black');
		}

		// Reset ready button for online mode
		const readyBtn = modal.querySelector('#pong-ready-btn') as HTMLButtonElement | null;
		if (readyBtn)
		{
			if (mode === 'online')
			{
				readyBtn.textContent = '✗ Not Ready';
				readyBtn.classList.remove('dark:bg-accent-orange', 'bg-accent-orange');
				readyBtn.classList.add('dark:bg-red-600', 'bg-red-600');
				readyBtn.classList.add('hidden'); // Hidden until game is created
			}
			else
			{
				readyBtn.classList.add('hidden');
			}
		}

		// Reset ready indicators in scorebar
		const leftReady = document.getElementById('pong-left-ready') as HTMLElement | null;
		const rightReady = document.getElementById('pong-right-ready') as HTMLElement | null;
		if (leftReady)
			leftReady.classList.add('hidden');
		if (rightReady)
			rightReady.classList.add('hidden');

		attachButtonHandlers(modal, mode);
	}
	catch (err) {
		console.error('[Modal] Failed to open:', err);
		showErrorToast('Failed to start Pong');
	}
}

/**
 * Close the pong modal
 */
export function closePongModal()
{
	const modal = document.getElementById('pong-modal');
	if (modal) {
		modal.classList.add('hidden');
		
		// Reset button state on close for next time
		const startBtn = modal.querySelector('#pong-btn') as HTMLButtonElement | null;
		if (startBtn) {
			startBtn.textContent = 'Start';
			startBtn.disabled = false;
			startBtn.classList.remove('bg-red-600', 'hover:bg-red-700', 'text-white', 'dark:text-white');
			startBtn.classList.add('dark:bg-accent-green', 'bg-accent-blue', 'dark:text-black');
		}
	}

	if (currentGameInstance)
	{
		currentGameInstance.destroy();
		currentGameInstance = null;
	}

	if (currentGameMode === 'online')
	{
		const gameId = getCurrentGameId();
		if (gameId)
			quitGame(gameId);
	}
}

/**
 * Setup pong card listener
 */
export function setupPongCardListener()
{
	if (document.readyState === 'loading')
		document.addEventListener('DOMContentLoaded', attachPongCardListener);
	else
		attachPongCardListener();
}

function attachPongCardListener()
{
	const pongCard = document.getElementById('pong-card-btn');
	if (!pongCard)
	{
		console.error('[Modal] Pong card button not found');
		return;
	}

	pongCard.addEventListener('click', (e) => 
	{
		if (!isLoggedInClient())
		{
			showErrorToast('You must be logged in');
			return;
		}
		e.preventDefault();
		goToRoute('/pong');
	});
}
