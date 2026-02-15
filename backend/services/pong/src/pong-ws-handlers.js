// The class is initialized in PongConnectionManager.js
import { pongConnectionManager } from './PongConnectionManager.js';
import { tournamentManager } from './TournamentManager.js';
import { validateInternalApiKey, getUsernameById } from './pong-help.js';
import { gameManager } from './GameManager.js';

export function	handleNewConnection(socket, req)
{
	// Validate internal API key
	const	isValid = validateInternalApiKey(req, socket);

	if (!isValid)
	{
		console.log('[PONG] Rejecting WebSocket connection due to invalid API key');
		return (null);
	}

	const	userId = req.headers['x-user-id'];

	if (!userId)
	{
		console.error('[PONG] No authenticated user found for websocket connection');
		try { socket.close(1008, 'No user ID provided'); } catch (e) {}

		return (null);
	}

	pongConnectionManager.addConnection(userId, socket);

	return (userId);
}

export function	handleClose(socket, userId)
{
	// Connection already removed via API, skip logging and removal
	if (!pongConnectionManager.getConnection(userId))
		return;

	console.log(`[PONG] WebSocket connection closed - User: ${userId}`);

	pongConnectionManager.removeConnection(userId);
}

export function	handleError(socket, err, userId)
{
	console.error(`[PONG] WebSocket error for user ${userId}: ${err.message}`);
	
	// Remove the connection as it's likely broken
	if (userId)
		pongConnectionManager.removeConnection(userId);
}

export function	handleMessage(socket, msg, userId)
{
	try
	{
		const	message = JSON.parse(msg.toString());

		switch (message.event)
		{
			case 'ping': // Handle ping event
				socket.send(JSON.stringify({ event: 'pong', data: { timestamp: Date.now() } }));
				break;

			case 'pong.createCustomGame':
				handleCustomGameCreation(userId, message.data.otherId);
				break;

			case 'pong.joinCustomGame':
				handleJoinCustomGame(userId, message.data.gameId);
				break;

			case 'pong.cancelCustomGame':
				handleCancelCustomGame(userId, message.data.gameId);
				break;

			case 'pong.userQuit':
				handleUserQuit(userId, message.data.gameId);
				break;

			case 'pong.userReady':
				handleUserReady(userId, message.data.gameId, true);
				break;

			case 'pong.userNotReady':
				handleUserReady(userId, message.data.gameId, false);
				break;

			case 'pong.joinMatchmaking':
				handleJoinMatchmaking(userId);
				break;

			case 'pong.leaveMatchmaking':
				handleLeaveMatchmaking(userId);
				break;

			case 'pong.paddleMove':
				handlePaddleMove(userId, message.data.gameId, message.data.direction);
				break;

			case 'tournament.leave':
				handleTournamentLeave(userId, message.data.tournamentId);
				break;

			case 'tournament.start':
				handleTournamentStart(userId, message.data.tournamentId);
				break;

			case 'tournament.ready':
				handleTournamentReady(userId, message.data.tournamentId);
				break;

			default:
				console.log(`[PONG] Unknown event: ${message.event}`);
				pongConnectionManager.sendErrorMessage(userId, 'Invalid message format');
				break;
		}
	}
	catch (err)
	{
		console.error(`[PONG] Error parsing message from user ${userId}:`, err.message);
		pongConnectionManager.sendErrorMessage(userId, 'Invalid message format');
	}
}

export async function	handleCustomGameCreation(userId, otherId)
{
	try
	{
		if (!otherId)
		{
			console.error(`[PONG] No otherId provided by user ${userId} to create custom game`);
			pongConnectionManager.sendErrorMessage(userId, 'No opponent ID provided');
			return ;
		}

		const	senderUsername = await getUsernameById(userId);
		if (!senderUsername)
		{
			console.error(`[PONG] Could not fetch username for user ${userId}`);
			pongConnectionManager.sendErrorMessage(userId, 'User not found');
			return ;
		}

		const	otherUsername = await getUsernameById(otherId);
		if (!otherUsername)
		{
			console.error(`[PONG] Could not fetch username for user ${otherId}`);
			pongConnectionManager.sendErrorMessage(userId, 'Invited user not found');
			return ;
		}

		gameManager.createCustomGame(userId, senderUsername, otherId, otherUsername);
	}
	catch (err)
	{
		console.error(`[PONG] Error creating custom game for user ${userId}:`, err.message);
		pongConnectionManager.sendErrorMessage(userId, 'Failed to create custom game');
	}
}

export async function	handleJoinCustomGame(userId, gameId)
{
	try
	{
		if (!gameId)
		{
			console.error(`[PONG] No gameId provided by user ${userId} to join custom game`);
			pongConnectionManager.sendErrorMessage(userId, 'No game ID provided');
			return ;
		}

		gameManager.joinCustomGame(userId, gameId);
	}
	catch (err)
	{
		console.error(`[PONG] Error joining custom game for user ${userId}:`, err.message);
		pongConnectionManager.sendErrorMessage(userId, 'Failed to join custom game');
	}
}

export async function	handleCancelCustomGame(userId, gameId)
{
	try
	{
		if (!gameId)
		{
			console.error(`[PONG] No gameId provided by user ${userId} to cancel custom game`);
			pongConnectionManager.sendErrorMessage(userId, 'No game ID provided');
			return ;
		}

		gameManager.cancelCustomGame(userId, gameId);
	}
	catch (err)
	{
		console.error(`[PONG] Error canceling custom game for user ${userId}:`, err.message);
		pongConnectionManager.sendErrorMessage(userId, 'Failed to cancel custom game');
	}
}

export async function	handleUserQuit(userId, gameId)
{
	try
	{
		if (!gameId)
		{
			console.error(`[PONG] No gameId provided by user ${userId} to quit game`);
			pongConnectionManager.sendErrorMessage(userId, 'No game ID provided');
			return ;
		}

		gameManager.quitGame(userId, gameId);
	}
	catch (err)
	{
		console.error(`[PONG] Error handling quit for user ${userId}:`, err.message);
	}
}

export async function	handleUserReady(userId, gameId, readyStatus)
{
	try
	{
		if (!gameId || typeof readyStatus !== 'boolean')
		{
			console.error(`[PONG] Invalid data provided by user ${userId} to set ready status`);
			pongConnectionManager.sendErrorMessage(userId, 'Invalid data provided');
			return ;
		}

		gameManager.playerReady(userId, gameId, readyStatus);
	}
	catch (err)
	{
		console.error(`[PONG] Error handling ready for user ${userId}:`, err.message);
	}
}

export async function	handleJoinMatchmaking(userId)
{
	try
	{
		gameManager.joinMatchmaking(userId);
	}
	catch (err)
	{
		console.error(`[PONG] Error joining matchmaking for user ${userId}:`, err.message);
		pongConnectionManager.sendErrorMessage(userId, 'Failed to join matchmaking');
	}
}

export async function	handleLeaveMatchmaking(userId)
{
	try
	{
		gameManager.leaveMatchmaking(userId);
	}
	catch (err)
	{
		console.error(`[PONG] Error leaving matchmaking for user ${userId}:`, err.message);
		pongConnectionManager.sendErrorMessage(userId, 'Failed to leave matchmaking');
	}
}

export async function	handlePaddleMove(userId, gameId, direction)
{
	try
	{
		if (!gameId || !direction)
		{
			console.error(`[PONG] Invalid data provided by user ${userId} for paddle move`);
			pongConnectionManager.sendErrorMessage(userId, 'Invalid paddle move data');
			return ;
		}

		if (!['up', 'down'].includes(direction))
		{
			console.error(`[PONG] Invalid paddle direction ${direction} from user ${userId}`);
			pongConnectionManager.sendErrorMessage(userId, 'Invalid paddle direction');
			return ;
		}

		gameManager.processPaddleMove(userId, gameId, direction);
	}
	catch (err)
	{
		console.error(`[PONG] Error processing paddle move for user ${userId}:`, err.message);
		pongConnectionManager.sendErrorMessage(userId, 'Failed to process paddle move');
	}
}

export async function	handleTournamentLeave(userId, tournamentId)
{
	try
	{
		if (!tournamentId)
		{
			console.error(`[PONG] No tournamentId provided by user ${userId} to leave tournament`);
			pongConnectionManager.sendErrorMessage(userId, 'No tournament ID provided');
			return ;
		}

		tournamentManager.removeParticipant(tournamentId, userId);
	}
	catch (err)
	{
		console.error(`[PONG] Error leaving tournament for user ${userId}:`, err.message);
		pongConnectionManager.sendErrorMessage(userId, 'Failed to leave tournament');
	}
}

export async function	handleTournamentStart(userId, tournamentId)
{
	try
	{
		if (!tournamentId)
		{
			console.error(`[PONG] No tournamentId provided to start tournament`);
			pongConnectionManager.sendErrorMessage(userId, 'No tournament ID provided');
			return ;
		}

		await tournamentManager.startTournament(tournamentId, userId);
	}
	catch (err)
	{
		console.error(`[PONG] Error starting tournament ${tournamentId}:`, err.message);
		pongConnectionManager.sendErrorMessage(userId, 'Failed to start tournament');
	}
}

export async function	handleTournamentReady(userId, tournamentId)
{
	try
	{
		if (!tournamentId)
		{
			console.error(`[PONG] No tournamentId provided by user ${userId} to ready up`);
			pongConnectionManager.sendErrorMessage(userId, 'No tournament ID provided');
			return ;
		}

		// TO DO check it
		tournamentManager.playerReady(tournamentId, userId);
	}
	catch (err)
	{
		console.error(`[PONG] Error readying up for tournament ${tournamentId}:`, err.message);
		pongConnectionManager.sendErrorMessage(userId, 'Failed to ready up');
	}
}