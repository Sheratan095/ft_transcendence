// The class is initialized in ChatConnectionManager.js
import { chatConnectionManager } from './ChatConnectionManager.js';
import { checkBlock } from './chat-help.js';

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

export function	handleMessage(socket, msg, userId, chatDb)
{
	try
	{
		const	message = JSON.parse(msg.toString());
		console.log(`[CHAT] Message from user ${userId}`);

		switch (message.event)
		{
			// case 'chat.join':
			// 	handleJoinRoom(userId, message.data);
			// 	break;

			// case 'chat.leave':
			// 	handleLeaveRoom(userId, message.data);
			// 	break;

			// case 'chat.message':
			// 	handleChatMessage(userId, message.data, chatDb);
			// 	break;

			case 'chat.private_message':
				handlePrivateMessage(userId, message.data, chatDb);
				break;

			case 'chat.private_message':
				handlePrivateMessage(userId, message.data, chatDb);
				break;

			// case 'chat.typing':
			// 	handleTypingIndicator(userId, message.data);
			// 	break;

			default:
				console.log(`[CHAT] Unknown event: ${message.event}`);
				chatConnectionManager.sendErrorMessage(userId, 'Invalid message format');
				break;
		}
	}
	catch (err)
	{
		console.error(`[CHAT] Error parsing message from user ${userId}:`, err.message);
		chatConnectionManager.sendErrorMessage(userId, 'Invalid message format');
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

function	handleChatMessage(userId, data, chatDb)
{
	try
	{
		const	{ roomId, message } = data;

		if (!roomId || !message)
		{
			console.log('[CHAT] Invalid chat message data');
			return;
		}

		// Get id of users in the room
		const	usersIdInRoom = chatConnectionManager.getUsersInRoom(roomId).map(user => user.userId);
		if (!usersIdInRoom || usersIdInRoom.length === 0)
		{
			console.log(`[CHAT] No users in room ${roomId}`);
			return;
		}

		console.log(`[CHAT] Broadcasting message from user ${userId} to room ${roomId}`);

		// Broadcast the message to all users in the room
		chatConnectionManager.sendToRoom(
			roomId,
			usersIdInRoom,
			message
		);
	}
	catch (err)
	{
		console.error('[CHAT] Error handling chat message:', err.message);
	}
}

async function	handlePrivateMessage(userId, data, chatDb)
{
	try
	{
		const	{ toUserId, message } = data;

		if (!toUserId || !message)
		{
			console.log('[CHAT] Invalid private message data');
			return;
		}

		if (toUserId === userId)
		{
			console.log(`[CHAT] Himself: User ${userId} attempted to send a private message to themselves`);
			return;
		}

		if (!(await checkBlock(toUserId, userId)))
		{
			console.log(`[CHAT] Blocked: Relation between ${toUserId} and ${userId} is blocked`);
			return;
		}

		// Create a new chat between the two users if it doesn't exist
		const	chatId = await chatDb.createPrivateChat(userId, toUserId);
		const	messageId = await chatDb.addMessageToChat(chatId, userId, message);

		await chatConnectionManager.sendToUser(
			userId,
			toUserId,
			message
		);
	}
	catch (err)
	{
		console.error('[CHAT] Error handling private message:', err.message);
	}
}