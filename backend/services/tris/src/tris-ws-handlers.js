import { validateInternalApiKey, sendGameInviteNotification, getUsernameById } from './tris-help.js';
// The class is initialized in TrisConnectionManager.js
import { trisConnectionManager } from './TrisConnectionManager.js';

import { GameManager } from './GameManager.js';

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

	pongConnectionManager.addConnection(userId, socket);

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
				handleCustomGameCreation(userId, message.data, trisDb);
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

export async function	handleCustomGameCreation(userId, data, trisDb)
{
	try
	{
		const	{otherId} = data;
		const	senderUsername = await getUsernameById(userId);

		const	gameId = GameManager.createCustomGame(userId, otherId);

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

export async function	joinCustomGame(userId, gameId, trisDb)
{
	try
	{
		GameManager.joinCustomGame(userId, gameId);

		console.log(`[TRIS] User ${userId} joined custom game ${gameId}`);
	}
	catch (err)
	{
		console.error(`[TRIS] Error joining custom game for user ${userId}:`, err.message);
		trisConnectionManager.sendErrorMessage(userId, 'Failed to join custom game');
	}
}

export async function	cancelCustomGame(userId, gameId, trisDb)
{
	try
	{
		GameManager.cancelCustomGame(userId, gameId);

		console.log(`[TRIS] User ${userId} canceled custom game ${gameId}`);
	}
	catch (err)
	{
		console.error(`[TRIS] Error canceling custom game for user ${userId}:`, err.message);
		trisConnectionManager.sendErrorMessage(userId, 'Failed to cancel custom game');
	}
}