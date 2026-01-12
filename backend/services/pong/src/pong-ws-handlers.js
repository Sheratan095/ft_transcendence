// The class is initialized in PongConnectionManager.js
import { pongConnectionManager } from './PongConnectionManager.js';
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
	console.log(`[PONG] WebSocket connection closed - User: ${userId}`);

	pongConnectionManager.removeConnection(userId);
	gameManager.handleUserDisconnect(userId);
}

export function	handleError(socket, err, userId)
{
	console.error(`[PONG] WebSocket error for user ${userId}: ${err.message}`);
	
	// Remove the connection as it's likely broken
	if (userId)
	{
		pongConnectionManager.removeConnection(userId);
		gameManager.handleUserDisconnect(userId);
	}
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

			case 'pong.makeMove':
				handleMakeMove(userId, message.data.gameId, message.data.position);
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

export async function	handleMakeMove(userId, gameId, position)
{
	try
	{
		if (!gameId || typeof position !== 'number')
		{
			console.error(`[PONG] Invalid data provided by user ${userId} to make move`);
			pongConnectionManager.sendErrorMessage(userId, 'Invalid data provided');
			return ;
		}

		gameManager.makeMove(userId, gameId, position);
	}
	catch (err)
	{
		console.error(`[PONG] Error making move for user ${userId}:`, err.message);
		pongConnectionManager.sendErrorMessage(userId, 'Failed to make move');
	}
}