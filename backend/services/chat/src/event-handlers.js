// The class is initialized in ChatConnectionManager.js
import { chatConnectionManager } from './ChatConnectionManager.js';
import { checkBlock, notifyMessageStatusUpdates } from './chat-help.js';

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

export function	handleError(userId, data)
{
	console.log(`[CHAT] WebSocket error in handler: ${err.message}`);
}

export function	handleClose(socket, userId)
{
	console.log(`[CHAT] WebSocket connection closed - User: ${userId}`);

	chatConnectionManager.removeConnection(userId);
}

export function	handleMessage(socket, msg, userId, chatDb)
{
	try
	{
		const	message = JSON.parse(msg.toString());
		console.log(`[CHAT] Message from user ${userId}`);

		switch (message.event)
		{
			case 'ping': // Handle ping event
				socket.send(JSON.stringify({ event: 'pong', data: { timestamp: Date.now() } }));
				break;

			// case 'chat.join':
			// 	handleJoinRoom(userId, message.data);
			// 	break;

			// case 'chat.leave':
			// 	handleLeaveRoom(userId, message.data);
			// 	break;

			case 'chat.read':
				handleChatRead(userId, message.data, chatDb);
				break;

			case 'chat.message':
				handleChatMessage(userId, message.data, chatDb, false);
				break;

			case 'chat.private_message':
				handleChatMessage(userId, message.data, chatDb, true);
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

async function	handleChatMessage(userId, data, chatDb, isPrivate = false)
{
	try
	{
		const	{ toUserId, roomId, content } = data;
		const	targetId = isPrivate ? toUserId : roomId;

		// Validation
		if (!targetId || !content)
		{
			console.log(`[CHAT] Invalid ${isPrivate ? 'private' : 'room'} message data`);
			chatConnectionManager.sendErrorMessage(userId, 'Missing required fields');
			return;
		}

		if (isPrivate)
		{
			// Private message specific checks
			if (toUserId === userId) // Cannot send message to yourself
			{
				console.log(`[CHAT] User ${userId} attempted to send a private message to themselves`);
				chatConnectionManager.sendErrorMessage(userId, 'Cannot send message to yourself');
				return;
			}

			if (!(await checkBlock(toUserId, userId)))
			{
				console.log(`[CHAT] Blocked: Relation between ${toUserId} and ${userId} is blocked`);
				// chatConnectionManager.sendErrorMessage(userId, 'Can\'t send message');
				return;
			}
		}
		else
		{
			// Room message specific checks
			if (!(await chatDb.isUserInChat(userId, roomId))) // Check if room exists and user is in the room
			{
				console.log(`[CHAT] ${userId} try to sent message ${roomId} but he isn't in the room`);
				chatConnectionManager.sendErrorMessage(userId, 'Cannot send message to this room');
				return;
			}
		}

		// Store message in DB
		const	chatId = isPrivate 
			? await chatDb.createPrivateChat(userId, toUserId) // If chat already exists, returns the existing one
			: roomId;

		const	messageId = await chatDb.addMessageToChat(chatId, userId, message);

		// Send to recipient(s)
		// It's returned if the message was delivered to all users in the room
		const	deliveredToAll =
			isPrivate ? await chatConnectionManager.sendToUser(userId, toUserId, messageId, content, chatDb)
					  : await chatConnectionManager.sendToRoom(roomId, userId, messageId, content, chatDb);

		// Acknowledge to sender
		const	status = deliveredToAll ? 'delivered' : 'pending';
		chatConnectionManager.replyToMessage(userId, chatId, messageId, status);

		console.log(`[CHAT] ${isPrivate ? 'Private' : 'Room'} message from user ${userId} to ${targetId} sent successfully`);
	}
	catch (err)
	{
		console.error(`[CHAT] Error handling ${isPrivate ? 'private' : 'room'} message:`, err.message);
		chatConnectionManager.sendErrorMessage(userId, 'Failed to send message');
	}
}

async function	handleChatRead(userId, data, chatDb)
{
	try
	{
		const	{ roomId } = data;

		// Validation
		if (!roomId)
		{
			console.log(`[CHAT] Invalid chat read data from user ${userId}`);
			chatConnectionManager.sendErrorMessage(userId, 'Missing required fields for chat read');
			return;
		}

		// Check if room exists and user is in the room
		if (!(await chatDb.isUserInChat(userId, roomId)))
		{
			console.log(`[CHAT] ${userId} try to mark messages as read in ${roomId} but he isn't in the room`);
			chatConnectionManager.sendErrorMessage(userId, 'Cannot mark messages as read in this room');
			return;
		}

		// Mark all message status for this user in this chat as read
		//  only updates messages that aren't already 'read' to reduce writes
		const	updatedTime = await chatDb.markMessagesAsRead(roomId, userId);

		// Notify senders about the status update
		await notifyMessageStatusUpdates(roomId, updatedTime, chatDb);
	}
	catch (err)
	{
		console.error(`[CHAT] Error handling chat read from user ${userId}:`, err.message);
		chatConnectionManager.sendErrorMessage(userId, 'Failed to mark messages as read');
	}
}