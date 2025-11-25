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
	try
	{
		const	message = JSON.parse(msg.toString());
		console.log(`[NOTIFICATION] Message from user: ${userId} : `, message);

		switch (message.event)
		{
			case 'ping': // Handle ping event
				socket.send(JSON.stringify({ event: 'pong', data: { timestamp: Date.now() } }));
				break;
		
			default:
				console.log(`[NOTIFICATION] Unknown event type: ${message.event}`);
		}
	}
	catch (err)
	{
		console.error(`[NOTIFICATION] Error processing message from user ${userId}: ${err.message}`);
		socket.send(JSON.stringify({
			event: 'error',
			data: { message: 'Invalid message format' }
		}));
	}
}

export function	handleClose(socket, userId)
{
	console.log(`[NOTIFICATION] WebSocket connection closed - User: ${userId}`);

	userConnectionManager.removeConnection(userId);
}

export function	handleError(socket, err, userId)
{
	console.error(`[NOTIFICATION] WebSocket error for user ${userId}: ${err.message}`);
	
	// Remove the connection as it's likely broken
	if (userId)
		userConnectionManager.removeConnection(userId);
}