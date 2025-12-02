import { validateInternalApiKey } from './tris-help.js';
// The class is initialized in TrisConnectionManager.js
import { trisConnectionManager } from './TrisConnectionManager.js';

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

export function	handleMessage(socket, msg, userId, chatDb)
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