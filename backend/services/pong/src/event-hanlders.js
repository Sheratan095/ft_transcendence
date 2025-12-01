import { validateInternalApiKey } from './pong-help.js';
// The class is initialized in PongConnectionManager.js
import { pongConnectionManager } from './PongConnectionManager.js';

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

	console.log(`[PONG] WebSocket client connected - User: ${userId}`);
	pongConnectionManager.addConnection(userId, socket);

	return (userId);
}

export function	handleMessage(socket, msg, userId, chatDb)
{
	try
	{
		const	message = JSON.parse(msg.toString());
		console.log(`[PONG] Message from user ${userId}`);

		switch (message.event)
		{
			case 'ping': // Handle ping event
				socket.send(JSON.stringify({ event: 'pong', data: { timestamp: Date.now() } }));
				break;

			default:
				console.log(`[CHAT] Unknown event: ${message.event}`);
				chatConnectionManager.sendErrorMessage(userId, 'Invalid message format');
				break;
		}
	}
	catch (err)
	{
		console.error(`[PONG] Error parsing message from user ${userId}:`, err.message);
		chatConnectionManager.sendErrorMessage(userId, 'Invalid message format');
	}
}

export function	handleClose(socket, userId)
{
	console.log(`[PONG] WebSocket connection closed - User: ${userId}`);

	userConnectionManager.removeConnection(userId);
}

export function	handleError(socket, err, userId)
{
	console.error(`[PONG] WebSocket error for user ${userId}: ${err.message}`);
	
	// Remove the connection as it's likely broken
	if (userId)
		userConnectionManager.removeConnection(userId);
}