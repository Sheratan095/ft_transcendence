// The class is initialized in ChatConnectionManager.js
import { chatConnectionManager } from './ChatConnectionManager.js';
import { checkBlock, notifyMessageStatusUpdates } from './chat-help.js';

export function	handleNewConnection(socket, req, chatDb)
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

	chatConnectionManager.addConnection(userId, socket, chatDb);

	return (userId);
}

export function	handleError(err, userId)
{
	console.log(`[CHAT] WebSocket error for user ${userId} in handler: ${err.message}`);
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

		switch (message.event)
		{
			case 'ping': // Handle ping event
				console.log(`[CHAT] Ping received from user ${userId}`);
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
				handleChatMessage(userId, message.data, chatDb);
				break;

			case 'chat.privateMessage':
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

async function	handleChatMessage(userId, data, chatDb)
{
	try
	{
		const	{ roomId, content } = data;

		// Enhanced validation
		if (!roomId || typeof roomId !== 'string')
		{
			console.log(`[CHAT] Invalid roomId from user ${userId}`);
			chatConnectionManager.sendErrorMessage(userId, 'Invalid room ID');
			return;
		}

		if (!content || typeof content !== 'string' || content.trim().length === 0)
		{
			console.log(`[CHAT] Empty or invalid content from user ${userId}`);
			chatConnectionManager.sendErrorMessage(userId, 'Message content cannot be empty');
			return;
		}

		// Check if room exists and user is in the room
		if (!(await chatDb.isUserInChat(userId, roomId)))
		{
			console.log(`[CHAT] User ${userId} attempted to send message to room ${roomId} without membership`);
			chatConnectionManager.sendErrorMessage(userId, 'Cannot send message to this room');
			return;
		}

		// Verify it's a group chat
		const	chatType = await chatDb.getChatType(roomId);
		if (chatType !== 'group')
		{
			console.log(`[CHAT] User ${userId} attempted to send room message to non-group chat ${roomId}`);
			chatConnectionManager.sendErrorMessage(userId, 'Cannot send room message to a non-group chat');
			return;
		}

		// Trim and limit content length
		const	sanitizedContent = content.trim().substring(0, 2000); // 2000 char limit

		// Store message in database
		const	messageId = await chatDb.addMessageToChat(roomId, userId, sanitizedContent);

		// Send to recipients (including sender)
		const	status = await chatConnectionManager.sendMsgToRoom(roomId, userId, messageId, sanitizedContent, chatDb);

		// Always acknowledge to sender to ensure they see their own message
		await chatConnectionManager.replyToMessage(userId, roomId, messageId, status, sanitizedContent, 'group');

		console.log(`[CHAT] Room message from user ${userId} to ${roomId} sent successfully`);
	}
	catch (err)
	{
		console.error(`[CHAT] Error handling room message from user ${userId}:`, err.message);
		chatConnectionManager.sendErrorMessage(userId, 'Failed to send message');
	}
}

async function handlePrivateMessage(userId, data, chatDb)
{
	try
	{
		const	{ toUserId, content } = data;

		// Validation
		if (!toUserId || !content)
		{
			console.log(`[CHAT] Invalid private message data`);
			chatConnectionManager.sendErrorMessage(userId, 'Missing required fields');
			return;
		}

		// Cannot send message to yourself
		if (toUserId === userId)
		{
			console.log(`[CHAT] User ${userId} attempted to send a private message to themselves`);
			chatConnectionManager.sendErrorMessage(userId, 'Cannot send message to yourself');
			return;
		}

		if (await checkBlock(userId, toUserId))
		{
			console.log(`[CHAT] Failed to send message because the relation between ${toUserId} and ${userId} is blocked`);
			chatConnectionManager.sendErrorMessage(userId, 'Cannot send message to this user');
			return;
		}

		// If chat already exists, returns the existing one
		const	chatId = await chatDb.createPrivateChat(userId, toUserId);

		// Store message in database
		const	messageId = await chatDb.addMessageToChat(chatId, userId, content);

		// Send to recipient
		const	delivered = await chatConnectionManager.sendToUser(userId, toUserId, messageId, content, chatDb, chatId);

		// Acknowledge to sender
		const	status = delivered ? 'delivered' : 'sent';
		chatConnectionManager.replyToMessage(userId, chatId, messageId, status, content, 'dm');

		console.log(`[CHAT] Private message from user ${userId} to user ${toUserId} sent successfully`);
	}
	catch (err)
	{
		console.error(`[CHAT] Error handling private message from user ${userId}:`, err.message);
		chatConnectionManager.sendErrorMessage(userId, 'Failed to send private message');
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