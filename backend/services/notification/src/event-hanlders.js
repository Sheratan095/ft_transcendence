import { validateInternalApiKey } from './notification-help.js';
// The class is initialized in UserConnectionManager.js
import { userConnectionManager } from './UserConnectionManager.js';

export function	handleNewConnection(socket, req)
{
	// Validate internal API key
	const	isValid = validateInternalApiKey(req, socket);
	
	if (!isValid)
	{
		console.log('[NOTIFICATION] Rejecting WebSocket connection due to invalid API key');
		return (null);
	}

	const	userId = req.headers['x-user-id'];

	if (!userId)
	{
		console.error('[NOTIFICATION] No authenticated user found for websocket connection');
		try { socket.close(1008, 'No user ID provided'); } catch (e) {}

		return (null);
	}

	console.log(`[NOTIFICATION] WebSocket client connected - User: ${userId}`);
	userConnectionManager.addConnection(userId, socket);

	return (userId);
}

export function	handleMessage(socket, msg, userId)
{
	console.log(`[NOTIFICATION] Message from user: ${userId} : ${msg.toString()}`);

	socket.send(`Echo from ${userId}: ${msg.toString()}`);
}

export function	handleClose(socket, userId)
{
	console.log(`[NOTIFICATION] WebSocket connection closed - User: ${userId}`);

	userConnectionManager.removeConnection(userId);
}

export function	handleError(socket, err)
{
	console.log(`[NOTIFICATION] WebSocket error in handler: ${err.message}`);
}