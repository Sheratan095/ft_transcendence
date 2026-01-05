import { validateInternalApiKey, getUsernameById } from './tris-help.js';
// The class is initialized in TrisConnectionManager.js
import { trisConnectionManager } from './TrisConnectionManager.js';

import { gameManager } from './GameManager.js';

export function	handleNewConnection(socket, req)
{
	// Validate internal API key
	const	isValid = validateInternalApiKey(req, socket);
	
	if (!isValid)
	{
		console.log('[TRIS] Rejecting WebSocket connection due to invalid API key');
		return (null);
	}

	const	userId = req.headers['x-user-id'];

	if (!userId)
	{
		console.error('[TRIS] No authenticated user found for websocket connection');
		try { socket.close(1008, 'No user ID provided'); } catch (e) {}

		return (null);
	}

	trisConnectionManager.addConnection(userId, socket);

	return (userId);
}

export function	handleClose(socket, userId)
{
	console.log(`[TRIS] WebSocket connection closed - User: ${userId}`);

	trisConnectionManager.removeConnection(userId);
	gameManager.handleUserDisconnect(userId);
}

export function	handleError(socket, err, userId)
{
	console.error(`[TRIS] WebSocket error for user ${userId}: ${err.message}`);
	
	// Remove the connection as it's likely broken
	if (userId)
	{
		trisConnectionManager.removeConnection(userId);
		gameManager.handleUserDisconnect(userId);
	}
}

export function	handleMessage(socket, msg, userId, trisDb)
{
	try
	{
		const	message = JSON.parse(msg.toString());

		switch (message.event)
		{
			case 'ping': // Handle ping event
				socket.send(JSON.stringify({ event: 'pong', data: { timestamp: Date.now() } }));
				break;

			case 'tris.createCustomGame':
				handleCustomGameCreation(userId, message.data.otherId, trisDb);
				break;

			case 'tris.joinCustomGame':
				handleJoinCustomGame(userId, message.data.gameId, trisDb);
				break;

			case 'tris.cancelCustomGame':
				handleCancelCustomGame(userId, message.data.gameId, trisDb);
				break;

			case 'tris.userQuit':
				handleUserQuit(userId, message.data.gameId, trisDb);
				break;

			case 'tris.userReady':
				handleUserReady(userId, message.data.gameId, true, trisDb);
				break;

			case 'tris.userNotReady':
				handleUserReady(userId, message.data.gameId, false, trisDb);
				break;

			case 'tris.joinMatchmaking':
				handleJoinMatchmaking(userId, trisDb);
				break;

			case 'tris.leaveMatchmaking':
				handleLeaveMatchmaking(userId, trisDb);
				break;

			case 'tris.makeMove':
				handleMakeMove(userId, message.data.gameId, message.data.position, trisDb);
				break;

			default:
				console.log(`[TRIS] Unknown event: ${message.event}`);
				trisConnectionManager.sendErrorMessage(userId, 'Invalid message format');
				break;
		}
	}
	catch (err)
	{
		console.error(`[TRIS] Error parsing message from user ${userId}:`, err.message);
		trisConnectionManager.sendErrorMessage(userId, 'Invalid message format');
	}
}

export async function	handleCustomGameCreation(userId, otherId, trisDb)
{
	try
	{
		if (!otherId)
		{
			console.error(`[TRIS] No otherId provided by user ${userId} to create custom game`);
			trisConnectionManager.sendErrorMessage(userId, 'No opponent ID provided');
			return ;
		}

		const	senderUsername = await getUsernameById(userId);
		if (!senderUsername)
		{
			console.error(`[TRIS] Could not fetch username for user ${userId}`);
			trisConnectionManager.sendErrorMessage(userId, 'User not found');
			return ;
		}

		const	otherUsername = await getUsernameById(otherId);
		if (!otherUsername)
		{
			console.error(`[TRIS] Could not fetch username for user ${otherId}`);
			trisConnectionManager.sendErrorMessage(userId, 'Invited user not found');
			return ;
		}

		const	gameId = gameManager.createCustomGame(userId, senderUsername, otherId, otherUsername);
	}
	catch (err)
	{
		console.error(`[TRIS] Error creating custom game for user ${userId}:`, err.message);
		trisConnectionManager.sendErrorMessage(userId, 'Failed to create custom game');
	}
}

export async function	handleJoinCustomGame(userId, gameId, trisDb)
{
	try
	{
		if (!gameId)
		{
			console.error(`[TRIS] No gameId provided by user ${userId} to join custom game`);
			trisConnectionManager.sendErrorMessage(userId, 'No game ID provided');
			return ;
		}

		gameManager.joinCustomGame(userId, gameId);
	}
	catch (err)
	{
		console.error(`[TRIS] Error joining custom game for user ${userId}:`, err.message);
		trisConnectionManager.sendErrorMessage(userId, 'Failed to join custom game');
	}
}

export async function	handleCancelCustomGame(userId, gameId, trisDb)
{
	try
	{
		if (!gameId)
		{
			console.error(`[TRIS] No gameId provided by user ${userId} to cancel custom game`);
			trisConnectionManager.sendErrorMessage(userId, 'No game ID provided');
			return ;
		}

		gameManager.cancelCustomGame(userId, gameId);
	}
	catch (err)
	{
		console.error(`[TRIS] Error canceling custom game for user ${userId}:`, err.message);
		trisConnectionManager.sendErrorMessage(userId, 'Failed to cancel custom game');
	}
}

export async function	handleUserQuit(userId, gameId, trisDb)
{
	try
	{
		if (!gameId)
		{
			console.error(`[TRIS] No gameId provided by user ${userId} to quit game`);
			trisConnectionManager.sendErrorMessage(userId, 'No game ID provided');
			return ;
		}

		gameManager.quitGame(userId, gameId);
	}
	catch (err)
	{
		console.error(`[TRIS] Error handling quit for user ${userId}:`, err.message);
	}
}

export async function	handleUserReady(userId, gameId, readyStatus, trisDb)
{
	try
	{
		if (!gameId || typeof readyStatus !== 'boolean')
		{
			console.error(`[TRIS] Invalid data provided by user ${userId} to set ready status`);
			trisConnectionManager.sendErrorMessage(userId, 'Invalid data provided');
			return ;
		}

		gameManager.playerReady(userId, gameId, readyStatus);
	}
	catch (err)
	{
		console.error(`[TRIS] Error handling ready for user ${userId}:`, err.message);
	}
}

export async function	handleJoinMatchmaking(userId, trisDb)
{
	try
	{
		// TO DO prevent joining matchmaking if already in a game or creating a custom game
		gameManager.joinMatchmaking(userId);
	}
	catch (err)
	{
		console.error(`[TRIS] Error joining matchmaking for user ${userId}:`, err.message);
		trisConnectionManager.sendErrorMessage(userId, 'Failed to join matchmaking');
	}
}

export async function	handleLeaveMatchmaking(userId, trisDb)
{
	try
	{
		gameManager.leaveMatchmaking(userId);
	}
	catch (err)
	{
		console.error(`[TRIS] Error leaving matchmaking for user ${userId}:`, err.message);
		trisConnectionManager.sendErrorMessage(userId, 'Failed to leave matchmaking');
	}
}

export async function	handleMakeMove(userId, gameId, position, trisDb)
{
	try
	{
		if (!gameId || typeof position !== 'number')
		{
			console.error(`[TRIS] Invalid data provided by user ${userId} to make move`);
			trisConnectionManager.sendErrorMessage(userId, 'Invalid data provided');
			return ;
		}

		gameManager.makeMove(userId, gameId, position);
	}
	catch (err)
	{
		console.error(`[TRIS] Error making move for user ${userId}:`, err.message);
		trisConnectionManager.sendErrorMessage(userId, 'Failed to make move');
	}
}