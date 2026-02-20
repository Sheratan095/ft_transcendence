/**
 * Pong Modal - UI Control & Event Handlers
 * Manages modal initialization, events, and UI state
 */

import { showErrorToast, showSuccessToast } from '../shared/Toast';
import { goToRoute } from '../../spa';
import { initPong, closePong, startMatchmaking } from './ws';
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
	// showSuccessToast(`Joined game with ${creatorUsername}!`);
}

/* INVITED PLAYER JOINED YOUR GAME */
export function handlePlayerJoinedCustomGame(_data: any)
{
	updatePongStatus('Opponent joined! Ready to start');
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

	// Update scoreboard names
	if (currentGameInstance && yourSide && opponentUsername)
	{
		const user = getUser();
		const myName = user?.username || 'You';
		const left = (yourSide === 'left') ? myName : opponentUsername;
		const right = (yourSide === 'right') ? myName : opponentUsername;
		currentGameInstance.gameManager.setPlayerNames(left, right);
		currentGameInstance.updateScorebarNames();
	}
}

export function handleGameState(data: any)
{
	// Game state handled by renderer
	if (currentGameInstance)
	{
		currentGameInstance.updateOnlineState(data);
	}
}

export function handleGameEnded(data: any)
{
	const { winner, quit, timedOut, reason } = data;
	const user = getUser();
	let message = '';

	if (quit) {
		message = 'Opponent quit';
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

	if (quit || timedOut) {
		showErrorToast(message);
	}
	else if (winner === user?.id) {
		showSuccessToast(message);
	}
	else {
		showErrorToast(message);
	}

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
		closePong();
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
