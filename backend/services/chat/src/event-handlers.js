// The class is initialized in ChatConnectionManager.js
import { chatConnectionManager } from './ChatConnectionManager.js';

export function	handleNewConnection(socket, req)
{
	const	key = req.headers['x-internal-api-key'];
	// Validate the forwarded internal key matches our environment variable.
	if (!process.env.INTERNAL_API_KEY || key !== process.env.INTERNAL_API_KEY)
	{
		console.error('[CHAT] Missing or invalid internal API key on proxied websocket request');

		try { socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n'); } catch (e) {}
		try { socket.destroy(); } catch (e) {}

		return (null);
	}

	const	userId = req.headers['x-user-id'];

	if (!userId)
	{
		console.error('[CHAT] No authenticated user found for websocket connection');
		try { socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n'); } catch (e) {}
		try { socket.destroy(); } catch (e) {}

		return (null);
	}

	console.log(`[CHAT] WebSocket client connected - User: ${userId}`);
	chatConnectionManager.addConnection(userId, socket);

	return (userId);
}

export function	handleMessage(socket, msg, userId)
{
	try
	{
		const	message = JSON.parse(msg.toString());
		console.log(`[CHAT] Message from user ${userId}:`, message);

		switch (message.event)
		{
			// case 'chat.join':
			// 	handleJoinRoom(userId, message.data);
			// 	break;
			
			// case 'chat.leave':
			// 	handleLeaveRoom(userId, message.data);
			// 	break;
			
			case 'chat.message':
				handleChatMessage(userId, message.data);
				break;
			
			// case 'chat.typing':
			// 	handleTypingIndicator(userId, message.data);
			// 	break;
			
			default:
				console.log(`[CHAT] Unknown event: ${message.event}`);
				socket.send(JSON.stringify({
					event: 'error',
					data: { message: 'Unknown event type' }
				}));
		}
	}
	catch (err)
	{
		console.error(`[CHAT] Error parsing message from user ${userId}:`, err.message);
		socket.send(JSON.stringify({
			event: 'error',
			data: { message: 'Invalid message format' }
		}));
	}
}

export function	handleError(userId, data)
{
	console.log(`[CHAT] WebSocket error in handler: ${err.message}`);
}

export function	handleClose(socket, userId)
{
	console.log(`[CHAT] WebSocket connection closed - User: ${userId}`);

	chatConnectionManager.removeConnection(userId);
}