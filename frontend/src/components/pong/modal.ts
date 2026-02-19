/**
 * Pong Modal - UI Control & Event Handlers
 * Manages modal initialization, events, and UI state
 */

import { showErrorToast, showSuccessToast } from '../shared/Toast';
import { goToRoute } from '../../spa';
import { initPong, closePong, startMatchmaking } from './ws';
import { getUserId, getUser } from '../../lib/auth';
import { PongGame, GAME_MODES } from './game/3d';
import type { PongModeType } from '../../lib/pong-mode';
import { isLoggedInClient } from '../../lib/token';

let currentGameInstance: PongGame | null = null;
let currentGameMode: 'online' | 'offline-1v1' | 'offline-ai' = 'online';

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
}

export function handleGameState(_data: any)
{
	// Game state handled by renderer
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
	// showSuccessToast(`Matched with ${opponentUsername}!`);
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

function attachButtonHandlers(container: HTMLElement, mode: PongModeType)
{
	const closeBtn = container.querySelector('#pong-close-btn') as HTMLButtonElement | null;
	if (closeBtn)
		closeBtn.addEventListener('click', closePongModal);

	const startBtn = container.querySelector('#pong-start-btn') as HTMLButtonElement | null;
	if (startBtn)
	{
		startBtn.addEventListener('click', () => {
			if (mode === 'online') {
				startMatchmaking();
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

		const game = new PongGame(canvas.id, gameMode,
		{
			playerNames: { left: 'Player 1', right: 'Player 2' },
			maxScore: 5,
			aiDifficulty: 'medium'
		});

		currentGameInstance = game;

		if (status)
		{
			const modeNames: Record<string, string> = {
				'online': 'Online - Waiting for opponent...',
				'offline-1v1': 'Local 1v1',
				'offline-ai': 'Offline vs Bot'
			};
			status.textContent = modeNames[mode] || 'Pong Game';
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
	if (modal)
		modal.classList.add('hidden');

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
