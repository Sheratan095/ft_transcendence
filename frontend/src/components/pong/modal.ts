/**
 * Pong Modal - UI Control & Event Handlers
 * Manages modal initialization, events, and UI state
 */

import { showErrorToast, showSuccessToast } from '../shared/Toast';
import { goToRoute } from '../../spa';
import { closePong, initPong, startMatchmaking, leaveMatchmaking, setReady, getCurrentGameId, setCurrentGameId, getPlayerSide, quitGame, sendPongMessage } from './ws';
import { getUserId, getUser } from '../../lib/auth';
import { PongGame, GAME_MODES } from './game/3d';
import { isLoggedInClient } from '../../lib/token';
import { t } from '../../lib/intlayer';

type PongModeType = 'online' | 'offline-1v1' | 'offline-ai' | 'custom' | 'tournament';

let currentGameInstance: PongGame | null = null;
let currentGameMode: PongModeType = 'online';
let isCustomGame: boolean = false;

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

function translateSideName(side?: string | null): string {
	if (!side) return '';
	const s = side.toString().toLowerCase();
	if (s === 'left') return t('side.left');
	if (s === 'right') return t('side.right');
	return side;
}

export function handleCustomGameCreated(data: any)
{
	const { opponentUsername, gameId } = data;
	
	// Explicitly set the game ID
	if (gameId)
		setCurrentGameId(gameId);
	
	isCustomGame = true;

	updatePongStatus(t('pong.custom.created', { opponent: opponentUsername }));
	
	// Update scorebar with usernames (creator is left, opponent is right)
	if (currentGameInstance) {
		const user = getUser();
		const creatorUsername = user?.username || 'You';
		currentGameInstance.gameManager.setPlayerNames(creatorUsername, opponentUsername);
		currentGameInstance.updateScorebarNames();
	}
	
	// Update button to "Cancel" for custom game
	const modal = document.getElementById('pong-modal');
	if (modal) {
		const btn = modal.querySelector('#pong-btn') as HTMLButtonElement | null;
		if (btn) {
			btn.textContent = t('game.cancel');
			btn.classList.remove('hidden');
		}
		
		const leftReady = modal.querySelector('#pong-left-ready') as HTMLElement | null;
		const rightReady = modal.querySelector('#pong-right-ready') as HTMLElement | null;
		if (leftReady)
			leftReady.classList.add('hidden');
		if (rightReady)
			rightReady.classList.add('hidden');
	}
	// showSuccessToast('Game created!');
}

/* YOU JOINED A CUSTOM GAME*/
export async function handleCustomGameJoinSuccess(data: any)
{
	const { creatorUsername, gameId } = data;
	
	isCustomGame = true;
	
	updatePongStatus(t('pong.custom.joined', { creator: creatorUsername }));
	
	// Explicitly set the game ID
	if (gameId)
		setCurrentGameId(gameId);
	
	// Open the modal to display the game with opponent username
	await openPongModal('custom');
	
	// Update player names on the scorebar
	if (currentGameInstance && creatorUsername) {
		// Creator is left player (X), we are right player (O)
		currentGameInstance.gameManager.setPlayerNames(creatorUsername, 'You');
		currentGameInstance.updateScorebarNames();
	}
	
	// Show the ready button and hide main button for custom games
	const modal = document.getElementById('pong-modal');
	if (modal)
	{
		const readyBtn = modal.querySelector('#pong-ready-btn') as HTMLButtonElement | null;
		const mainBtn = modal.querySelector('#pong-btn') as HTMLButtonElement | null;
		const leftReady = modal.querySelector('#pong-left-ready') as HTMLElement | null;
		const rightReady = modal.querySelector('#pong-right-ready') as HTMLElement | null;
		
		if (readyBtn)
		{
			readyBtn.classList.remove('hidden');
			// Ensure joiner defaults to NOT READY
			readyBtn.textContent = t('ready.not');
			readyBtn.classList.remove('dark:bg-accent-orange','bg-accent-orange');
			readyBtn.classList.add('dark:bg-red-600','bg-red-600');
			if (gameId)
				setReady(gameId, false);
		}
		if (mainBtn)
			mainBtn.classList.add('hidden');
		
		// Reset ready indicators to hidden
		if (leftReady)
			leftReady.classList.add('hidden');
		if (rightReady)
			rightReady.classList.add('hidden');
	}
	// showSuccessToast(`Joined game with ${creatorUsername}!`);
}

/* INVITED PLAYER JOINED YOUR GAME */
export function handlePlayerJoinedCustomGame(data: any)
{
	const { joiningPlayerUsername } = data;
	
	isCustomGame = true;
	
	updatePongStatus(t('pong.custom.opponentJoined'));
	
	// Update scorebar with usernames (creator is left, opponent is right)
	if (currentGameInstance) {
		const user = getUser();
		const creatorUsername = user?.username || 'You';
		currentGameInstance.gameManager.setPlayerNames(creatorUsername, joiningPlayerUsername);
		currentGameInstance.updateScorebarNames();
	}
	
	// Show the ready button and hide main button
	const modal = document.getElementById('pong-modal');
	if (modal)
	{
		const readyBtn = modal.querySelector('#pong-ready-btn') as HTMLButtonElement | null;
		const mainBtn = modal.querySelector('#pong-btn') as HTMLButtonElement | null;
		const leftReady = modal.querySelector('#pong-left-ready') as HTMLElement | null;
		const rightReady = modal.querySelector('#pong-right-ready') as HTMLElement | null;
		
		if (readyBtn)
			readyBtn.classList.remove('hidden');
		if (mainBtn)
			mainBtn.classList.add('hidden');
		
		// Reset ready indicators to hidden
		if (leftReady)
			leftReady.classList.add('hidden');
		if (rightReady)
			rightReady.classList.add('hidden');
	}
	// showSuccessToast('Opponent joined!');
}

export function handleCustomGameCanceled(_data: any)
{
	updatePongStatus(t('game.canceled'));
	showErrorToast(t('game.canceled'));

	// Offer Play Again to the remaining player so they can restart a new match
	const startBtn = document.querySelector('#pong-btn') as HTMLButtonElement | null;
	if (startBtn)
	{
		startBtn.disabled = false;
		startBtn.textContent = t('playAgain');
		startBtn.classList.remove('bg-red-600', 'hover:bg-red-700', 'text-white', 'dark:text-white');
		startBtn.classList.add('dark:bg-accent-green', 'bg-accent-blue','dark:text-black');
		startBtn.classList.remove('hidden');
	}

	// Also hide the ready button if present (opponent canceled during lobby)
	const readyBtnCancel = document.querySelector('#pong-ready-btn') as HTMLButtonElement | null;
	if (readyBtnCancel)
		readyBtnCancel.classList.add('hidden');
}

export function handleGameStarted(data: any)
{
	const { yourSide, opponentUsername } = data;
	// When a match starts, show a simple 'in progress' status instead of side/opponent details
	updatePongStatus(t('game.inprogress'));

	console.log('[Pong] Game started with data:', data);

	// Reset game state and update scoreboard names
	if (currentGameInstance && yourSide && opponentUsername)
	{
		// Reset 3D scene (ball, paddles, score) for the new game
		currentGameInstance.resetState();

		// Show "You" as the local player (consistent with matched state)
		const myName = 'You';
		const side = yourSide.toString().toLowerCase();
		const left = (side === 'left') ? myName : opponentUsername;
		const right = (side === 'right') ? myName : opponentUsername;
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
			mainBtn.textContent = t('quit');
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
		message = `${t('game.opponent-left')} - ${t('game.player-victory')}`;
	}
	else if (timedOut) {
		message = t('game.timeout');
	}
	else if (winner === user?.id) {
		message = t('game.player-victory');
	}
	else if (reason) {
		message = reason;
	}
	else {
		message = t('game.player-defeat');
	}

	updatePongStatus(message);

	// Hide ready button when game ends (quit or otherwise) so UI reflects finished match
	const readyBtnEnded = document.querySelector('#pong-ready-btn') as HTMLButtonElement | null;
	if (readyBtnEnded)
		readyBtnEnded.classList.add('hidden');

	// if (quit || timedOut) {
	// 	showErrorToast(message);
	// }
	// else if (winner === user?.id) {
	// 	showSuccessToast(message);
	// }
	// else {
	// 	showErrorToast(message);
	// }

	// Auto-close pong modal after 3 seconds for tournament games
	if (currentGameMode === 'tournament') {
		updatePongStatus(t('game.returningToTournament', { msg: message }));
		setTimeout(() => {
			closePongModal();
		}, 3000);
		return;
	}

	// Update start button to 'Play Again' (only for non-custom games)
	const startBtn = document.querySelector('#pong-btn') as HTMLButtonElement | null;
	if (startBtn)
	{
		startBtn.disabled = false;

		// For tournament games we auto-close; for all other modes show Play Again
		if (currentGameMode === 'online' || currentGameMode === 'offline-1v1' || currentGameMode === 'offline-ai' || currentGameMode === 'custom') {
			startBtn.textContent = t('playAgain');
			// Reset colors and ensure it's visible
			startBtn.classList.remove('bg-red-600', 'hover:bg-red-700', 'text-white', 'dark:text-white');
			startBtn.classList.add('dark:bg-accent-green', 'bg-accent-blue','dark:text-black');
			startBtn.classList.remove('hidden');
		} else {
			// Keep tournament behavior (modal will auto-close)
			startBtn.classList.add('hidden');
		}
	}
}

export function handlePlayerQuitCustomGameInLobby(_data: any)
{
	updatePongStatus(t('game.opponentQuit'));
	// showErrorToast('Opponent quit');

	// If opponent quit while in lobby/ready phase, allow the remaining player to Play Again
	const startBtn = document.querySelector('#pong-btn') as HTMLButtonElement | null;
	if (startBtn)
	{
		startBtn.disabled = false;
		startBtn.textContent = t('playAgain');
		startBtn.classList.remove('bg-red-600', 'hover:bg-red-700', 'text-white', 'dark:text-white');
		startBtn.classList.add('dark:bg-accent-green', 'bg-accent-blue','dark:text-black');
		startBtn.classList.remove('hidden');
	}

	// Hide the ready button so the UI doesn't show stale ready state
	const readyBtnQuit = document.querySelector('#pong-ready-btn') as HTMLButtonElement | null;
	if (readyBtnQuit)
		readyBtnQuit.classList.add('hidden');
}

export function handleMatchedInRandomGame(data: any)
{
	const { yourSide, opponentUsername } = data;
	const sideText = yourSide || 'a paddle';

	isCustomGame = false;

	updatePongStatus(t('game.matchedWith', { opponent: opponentUsername, side: sideText }));
	
	// Update player names in the game UI: show "You" for local player (not username)
	if (currentGameInstance) {
		const myName = 'You';
		const side = (yourSide || '').toString().toLowerCase();
		if (side === 'left') {
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
	updatePongStatus(t('game.invalidMove', { message: data.message }));
	// showErrorToast(`Invalid move: ${data.message}`);
}

export function handleError(data: any)
{
	updatePongStatus(t('game.error', { message: data.message }));
	// showErrorToast(`Error: ${data.message}`);
}

export function handlePlayerReadyStatus(data: any)
{
	const { readyStatus, playerSide } = data;
	console.log('[Pong] Player ready status changed:', playerSide, readyStatus);
	
	// Update the ready status for the player who changed (could be current or opponent)
	if (currentGameInstance && playerSide)
	{
		console.log('[Pong] Updating ready status for:', playerSide, 'Ready:', readyStatus);
		
		// Update the player's ready status in GameManager
		currentGameInstance.gameManager.setPlayerReadyStatus(playerSide as 'left' | 'right', readyStatus);
	}
	
	// Update the visual flag indicator
	const flagEl = playerSide === 'left' ? document.getElementById('pong-left-ready') : document.getElementById('pong-right-ready');
	if (flagEl)
	{
		if (readyStatus)
			flagEl.classList.remove('hidden');
		else
			flagEl.classList.add('hidden');
	}
}

/**
 * Handle tournament round info - opens game modal with opponent info
 * Called when a new round starts and user has to play against someone
 */
export async function handleTournamentRoundInfo(data: any)
{
	const { matchId, playerLeftId, playerLeftUsername, playerRightId, playerRightUsername, yourSide } = data;
	const userId = getUserId();

	console.log('[Pong] Tournament round info received:', data);

	// Set the game ID to match ID for ready state
	if (matchId)
		setCurrentGameId(matchId);

	// Determine opponent username (fallback if yourSide isn't provided)
	const isLeftPlayer = userId === playerLeftId;
	const opponentUsername = isLeftPlayer ? playerRightUsername : playerLeftUsername;

	// Open the pong modal in tournament mode (overlays the tournament modal)
	await openPongModal('tournament');

	// Update status with opponent info
	updatePongStatus(t('game.roundStarting', { opponent: opponentUsername }));

	// Update player names in the game UI, showing 'You' for the local player when yourSide is provided
	if (currentGameInstance)
	{
		let leftName = playerLeftUsername;
		let rightName = playerRightUsername;

		if (yourSide && typeof yourSide === 'string')
		{
			const side = yourSide.toLowerCase();
			if (side === 'left')
				leftName = 'You';
			else if (side === 'right')
				rightName = 'You';
		}

		currentGameInstance.gameManager.setPlayerNames(leftName, rightName);
		currentGameInstance.updateScorebarNames();
	}
	
	// Show the ready button and hide main button
	const modal = document.getElementById('pong-modal');
	if (modal)
	{
		const readyBtn = modal.querySelector('#pong-ready-btn') as HTMLButtonElement | null;
		const mainBtn = modal.querySelector('#pong-btn') as HTMLButtonElement | null;
		const leftReady = modal.querySelector('#pong-left-ready') as HTMLElement | null;
		const rightReady = modal.querySelector('#pong-right-ready') as HTMLElement | null;
		
		if (readyBtn)
		{
			readyBtn.classList.remove('hidden');
			// Default to not ready state
			readyBtn.textContent = t('ready.not');
			readyBtn.classList.remove('dark:bg-accent-orange', 'bg-accent-orange');
			readyBtn.classList.add('dark:bg-red-600', 'bg-red-600');
		}
		if (mainBtn)
			mainBtn.classList.add('hidden');
		
		// Reset ready indicators
		if (leftReady)
			leftReady.classList.add('hidden');
		if (rightReady)
			rightReady.classList.add('hidden');
		
		// Re-attach button handlers to ensure ready button works
		attachButtonHandlers(modal, 'tournament');
	}
}

// ============== Modal Control ==============

// Setup global listeners once
if (typeof window !== 'undefined')
{
	window.addEventListener('pong.gameLocalEnded', (e: any) =>
	{
		const { winnerName } = e.detail;
		updatePongStatus(t('game.overWinner', { winner: winnerName }));
		showSuccessToast(`${winnerName} won!`);

		const startBtn = document.querySelector('#pong-btn') as HTMLButtonElement | null;
		if (startBtn)
		{
			startBtn.disabled = false;
			startBtn.textContent = t('restart');
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

	// Ready Button (online and custom/tournament modes)
		const readyBtn = container.querySelector('#pong-ready-btn') as HTMLButtonElement | null;
		if (readyBtn && (mode === 'online' || mode === 'custom' || mode === 'tournament'))
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
			
			// Toggle ready status - only update button UI, server will update game state
			if (isReady)
			{
				// Set not ready
				console.log('[Pong] Setting not ready');
				setReady(gameId, false);
				newReadyBtn.textContent = t('ready.not');
				newReadyBtn.classList.remove('dark:bg-accent-orange', 'bg-accent-orange');
				newReadyBtn.classList.add('dark:bg-red-600', 'bg-red-600');
				// Hide own ready flag
				const playerSide = getPlayerSide();
				const flagEl = playerSide === 'left' ? container.querySelector('#pong-left-ready') : container.querySelector('#pong-right-ready');
				if (flagEl)
					flagEl.classList.add('hidden');
			}
			else
			{
				// Set ready
				console.log('[Pong] Setting ready');
				setReady(gameId, true);
				newReadyBtn.textContent = t('ready.yes');
				newReadyBtn.classList.remove('dark:bg-red-600', 'bg-red-600');
				newReadyBtn.classList.add('dark:bg-accent-orange', 'bg-accent-orange');
				// Show own ready flag
				const playerSide = getPlayerSide();
				const flagEl = playerSide === 'left' ? container.querySelector('#pong-left-ready') : container.querySelector('#pong-right-ready');
				if (flagEl)
					flagEl.classList.remove('hidden');
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
			console.log('[Pong] Start button clicked - text:', newStartBtn.textContent, 'currentGameInstance:', currentGameInstance);
			if (newStartBtn.textContent === 'Restart' || newStartBtn.textContent === 'Play Again' || newStartBtn.textContent === t('restart') || newStartBtn.textContent === t('playAgain')) {
				openPongModal(mode);
				return;
			}

			// Cancel custom game during lobby
			if (newStartBtn.textContent === 'Cancel' || newStartBtn.textContent === t('game.cancel'))
			{
				const gameId = getCurrentGameId();
				if (gameId)
					sendPongMessage('pong.cancelCustomGame', { gameId });
				closePongModal();
				return;
			}

			// Quit during active game
			if (newStartBtn.textContent === 'Quit' || newStartBtn.textContent === t('quit'))
			{
				// For custom/tournament games, just close modal. For online, send quit to server
				if (mode !== 'custom' && mode !== 'tournament')
				{
					const gameId = getCurrentGameId();
					if (gameId)
						quitGame(gameId);
				}
				closePongModal();
				// showSuccessToast('You quit the game');
				return;
			}

			if (mode === 'online')
			{
				if (newStartBtn.textContent === t('game.matchmaking-quit'))
				{
					// Tell server to leave matchmaking queue
					leaveMatchmaking();
					updatePongStatus(t('game.status-online'));
					// Reset button to 'Start Matchmaking'
					newStartBtn.textContent = t('game.matchmaking');

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
					isCustomGame = false;
					startMatchmaking();
					updatePongStatus(t('game.looking-match'));
	
					newStartBtn.textContent = t('game.matchmaking-quit');

					// Reset colors to original
					newStartBtn.classList.remove('dark:bg-accent-green', 'bg-accent-blue','dark:text-black');
					newStartBtn.classList.add('bg-red-600', 'hover:bg-red-700', 'text-white', 'dark:text-white');
				}
			}
			else if (mode === 'offline-1v1' || mode === 'offline-ai')
			{
				if (!currentGameInstance)
					return;

				const isStart = newStartBtn.textContent === 'Start' || newStartBtn.textContent === t('start');

				if (isStart || newStartBtn.textContent === 'Continue' || newStartBtn.textContent === t('continue')) {
					// Logic for starting or resuming the game
					console.log('[Pong] isStart detected:', isStart, 'paused before:', currentGameInstance?.gameManager.gameState.paused);
					currentGameInstance.gameManager.enableOfflineInput();
					currentGameInstance.gameManager.resumeGame(); // Ensure unpaused
					console.log('[Pong] paused after resume:', currentGameInstance?.gameManager.gameState.paused);
					
					if (isStart)
						currentGameInstance.gameManager.activateBall(); // Start ball on click

					updatePongStatus(t('game.inprogress'));

					// Update button to 'STOP' and red
						newStartBtn.textContent = t('stop');
						newStartBtn.classList.remove('dark:bg-accent-green', 'bg-accent-blue', 'dark:text-black');
						newStartBtn.classList.add('bg-red-600', 'hover:bg-red-700', 'text-white', 'dark:text-white');
				}
				else if (newStartBtn.textContent === 'STOP' || newStartBtn.textContent === t('stop')) {
					// STOP / PAUSE logic
					currentGameInstance.gameManager.disableOfflineInput();
					currentGameInstance.gameManager.pauseGame();
					updatePongStatus(t('game.paused'));

					// Update button back to 'Continue' and primary colors
					newStartBtn.textContent = t('continue');
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
		// Don't reset status for custom/tournament games - their handlers set it
		if (statusEl && mode !== 'custom' && mode !== 'tournament') statusEl.textContent = t('loading');
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

		document.body.style.overflow = 'hidden'; // SCROLL LOCK
		document.getElementsByTagName('html')[0].style.overflow = 'hidden'; // Ensure html scroll is also unlocked
		modal.classList.remove('hidden');

		const userId = getUserId();

		if (mode === 'online')
		{
			if (!userId)
			{
				showErrorToast('You must be logged in');
				return;
			}

			await initPong(userId);
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
			const gameConfig: any =
			{
				playerNames:
				{
					left: mode === 'offline-1v1' ? 'Player left' : (mode === 'offline-ai' ? 'You' : '--------'),
					right: mode === 'offline-1v1' ? 'Player right' : (mode === 'offline-ai' ? 'Ai' : '--------')
				},
				maxScore: 1, // to do back to 11
				aiDifficulty: 'medium'
			};

			if (mode === 'online' || mode === 'custom' || mode === 'tournament')
			{
				gameConfig.sendFn = (direction: string) =>
				{
					const gameId = getCurrentGameId();
					if (gameId)
						sendPongMessage('pong.paddleMove', { gameId, direction });
				};
			}

			game = new PongGame(canvas.id, gameMode, gameConfig);
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
				'online': t('game.status-online'),
				'offline-1v1': t('game.offline-status'),
				'offline-ai': t('game.ai-status'),
				'custom': t('game.custom'),
				'tournament': t('game.tournament')
			};
			// Only update status if not a custom/tournament game (those set their own status)
			if (mode !== 'custom' && mode !== 'tournament')
				status.textContent = modeNames[mode] || t('pong.game');
		}

		// Reset start button for new game
		const startBtn = modal.querySelector('#pong-btn') as HTMLButtonElement | null;
		if (startBtn)
		{
			startBtn.disabled = false;
			// Ensure we remove any leftover hidden state for non-custom modes
			if (mode === 'custom' || mode === 'tournament') {
				startBtn.classList.add('hidden');
			} else {
				startBtn.classList.remove('hidden');
				if (mode === 'online')
					startBtn.textContent = t('game.matchmaking');
				else
					startBtn.textContent = t('start');
			}
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
				readyBtn.textContent = t('ready.not');
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
		document.body.style.overflow = 'auto'; // UNLOCK SCROLLING
		document.getElementsByTagName('html')[0].style.overflow = 'auto'; // Ensure html scroll is also unlocked
		// Reset button state on close for next time
		const startBtn = modal.querySelector('#pong-btn') as HTMLButtonElement | null;
		if (startBtn) {
			startBtn.textContent = t('start');
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

	if (currentGameMode === 'online' || currentGameMode === 'custom' || currentGameMode === 'tournament')
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
