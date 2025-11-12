// The class is initialized in UserConnectionManager.js
import { userConnectionManager } from './UserConnectionManager.js';

export function	handleMessage(socket, msg, user)
{
	console.log("📩 Message from user:", msg.toString());

	userConnectionManager.addConnection(user.id, socket);

	// You can now use user.id and user.email in your WebSocket logic
	if (user)
	{
		socket.send(`Echo from ${user.email}: ${msg.toString()}`);
	}
	else
	{
		socket.send("Echo: " + msg.toString());
	}
}

export function	handleClose(socket, user)
{
	console.log(`❌ WebSocket connection closed - User: ${user.id}`);

	userConnectionManager.removeConnection(user.id);
}
export function	handleError(socket, err)
{
	console.log('⚠️ WebSocket error in handler:', err.message);
}