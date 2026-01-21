// The class is initialized in UserConnectionManager.js
import { userConnectionManager } from './UserConnectionManager.js';

export function	handleNewConnection(socket, req)
{
	const	key = req.headers['x-internal-api-key'];
	// Validate the forwarded internal key matches our environment variable.
	if (!process.env.INTERNAL_API_KEY || key !== process.env.INTERNAL_API_KEY)
	{
		console.error('[NOTIFICATION] Missing or invalid internal API key on proxied websocket request');
		try { socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n'); } catch (e) {}
		try { socket.destroy(); } catch (e) {}
		return (null);
	}

	const	userId = req.headers['x-user-id'];

	if (!userId)
	{
		console.error('[NOTIFICATION] No authenticated user found for websocket connection');
		try { socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n'); } catch (e) {}
		try { socket.destroy(); } catch (e) {}
		return (null);
	}

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
				console.log(`[NOTIFICATION] Received ping from user ${userId}`);
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