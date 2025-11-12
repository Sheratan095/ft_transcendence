// The class is initialized in UserConnectionManager.js
import { userConnectionManager } from './UserConnectionManager.js';

export function	handleNewConnection(socket, req)
{
	const	key = req.headers['x-internal-api-key'];
	// Validate the forwarded internal key matches our environment variable.
	if (!process.env.INTERNAL_API_KEY || key !== process.env.INTERNAL_API_KEY)
	{
		console.error('Missing or invalid internal API key on proxied websocket request');

		try { socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n'); } catch (e) {}
		try { socket.destroy(); } catch (e) {}

		return (NULL);
	}

	const	userId = req.headers['x-user-id'];

	if (!userId)
	{
		console.error('No authenticated user found for websocket connection');
		try { socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n'); } catch (e) {}
		try { socket.destroy(); } catch (e) {}

		return (NULL);
	}

	console.log(`WebSocket client connected - User: ${userId}`);
	userConnectionManager.addConnection(userId, socket);

	return (userId);
}

export function	handleMessage(socket, msg, userId)
{
	console.log("📩 Message from user:", msg.toString());

	userConnectionManager.addConnection(userId, socket);
	// You can now use user.id and user.email in your WebSocket logic
	if (userId)
	{
		socket.send(`Echo from ${userId}: ${msg.toString()}`);
	}
	else
	{
		socket.send("Echo: " + msg.toString());
	}
}

export function	handleClose(socket, userId)
{
	console.log(`❌ WebSocket connection closed - User: ${userId}`);

	userConnectionManager.removeConnection(userId);
}
export function	handleError(socket, err)
{
	console.log('⚠️ WebSocket error in handler:', err.message);
}