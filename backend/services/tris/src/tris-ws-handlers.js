import { validateInternalApiKey, sendGameInviteNotification, getUsernameById } from './tris-help.js';
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
}

export function	handleError(socket, err, userId)
{
	console.error(`[TRIS] WebSocket error for user ${userId}: ${err.message}`);
	
	// Remove the connection as it's likely broken
	if (userId)
		trisConnectionManager.removeConnection(userId);
}

export function	handleMessage(socket, msg, userId, trisDb)
{
	try
	{
		const	message = JSON.parse(msg.toString());
		console.log(`[TRIS] Message from user ${userId}`);

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

		// Send game invite notification
		sendGameInviteNotification(userId, senderUsername, otherId, gameId);

		// Here you would add logic to create a custom game between userId and otherId
		console.log(`[TRIS] Creating custom game between ${userId} and ${otherId}`);

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
		gameManager.joinCustomGame(userId, gameId);

		console.log(`[TRIS] User ${userId} joined custom game ${gameId}`);
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
		gameManager.cancelCustomGame(userId, gameId);

		console.log(`[TRIS] User ${userId} canceled custom game ${gameId}`);
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
		gameManager.quitGame(userId, gameId);

		console.log(`[TRIS] Handled quit for user ${userId}`);
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
		gameManager.playerReady(userId, gameId, readyStatus);

		console.log(`[TRIS] Handled ready for user ${userId}`);
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
		gameManager.joinMatchmaking(userId);

		console.log(`[TRIS] User ${userId} joined matchmaking`);
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

		console.log(`[TRIS] User ${userId} left matchmaking`);
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
		gameManager.makeMove(userId, gameId, position);

		console.log(`[TRIS] User ${userId} made move in game ${gameId}`);
	}
	catch (err)
	{
		console.error(`[TRIS] Error making move for user ${userId}:`, err.message);
		trisConnectionManager.sendErrorMessage(userId, 'Failed to make move');
	}
}